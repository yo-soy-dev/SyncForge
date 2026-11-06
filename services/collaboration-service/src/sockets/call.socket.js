import { fetchRoomAccess } from "../security/socketAuth.js"
import { callLabelFor, evaluateCallJoin, validateSignal, createRateLimiter } from "../security/callAccess.js"
import { buildIceServers } from "../security/iceServers.js"
import { recordCallEvent } from "../services/callEvents.js"

const CALL_RECHECK_MS = Number(process.env.CALL_RECHECK_MS) || 20_000

// roomId -> Map(socketId -> peer info). Single-instance state, like roomUsers in editor.socket.js.
const calls = new Map()
const shares = new Map() // roomId -> socketId of the person sharing their screen (one at a time)

const channel = (roomId) => `call:${roomId}`

const publicPeer = (socketId, p) => ({
  socketId, userId: p.userId, username: p.username, label: p.label, publish: p.publish, audio: p.audio, video: p.video,
})

// Remove a socket from its call and tell the others. Safe to call more than once.
export const dropFromCall = (socket, reason = "disconnected") => {
  const roomId = socket.callRoomId
  if (!roomId) return
    socket.callRoomId = null
  if (socket.callRoomType === "interview") {
    recordCallEvent({ roomId, userId: socket.userId, type: "call_left", meta: { reason } })
  }
  clearInterval(socket.callRecheck)
  socket.callRecheck = null
  socket.leave(channel(roomId))

  const peers = calls.get(roomId)
  if (peers) {
    peers.delete(socket.id)
    if (peers.size === 0) calls.delete(roomId)
  }
   socket.to(channel(roomId)).emit("call-peer-left", { socketId: socket.id })

  if (shares.get(roomId) === socket.id) {
    shares.delete(roomId)
    socket.to(channel(roomId)).emit("call-screen-state", { socketId: socket.id, sharing: false })
    if (socket.callRoomType === "interview") {
      recordCallEvent({ roomId, userId: socket.userId, type: "call_screen_stopped" })
    }
  }
}

export const setupCallSocket = (io, socket) => {
  const allowSignal = createRateLimiter()
  const fail = (code, message) => socket.emit("call-error", { code, message })

  // Identity, room and role were verified earlier by the room join. Nothing here trusts the client.
  socket.on("call-join", async (_payload, ack) => {
    const reply = typeof ack === "function" ? ack : () => {}
    try {
      const roomId = socket.roomId
      if (!roomId) return reply({ ok: false, code: "NOT_IN_ROOM", message: "Open the room first" })

      // Fresh permission check: the interview may have ended, or the user may have been removed.
      const access = await fetchRoomAccess({ roomId, userId: socket.userId })
      const peers = calls.get(roomId) || new Map()
      const decision = evaluateCallJoin({ access, peerCount: peers.size, alreadyInCall: peers.has(socket.id) })
      if (decision.error) return reply({ ok: false, ...decision.error })

      const info = {
        userId: socket.userId,
        username: socket.username,
        label: callLabelFor({ room: access.room, userId: socket.userId, role: access.role }),
        publish: decision.publish,
        audio: false,
        video: false,
      }

      const existing = [...peers.entries()].filter(([id]) => id !== socket.id).map(([id, p]) => publicPeer(id, p))

      peers.set(socket.id, info)
      calls.set(roomId, peers)
            socket.callRoomId = roomId
      socket.callRoomType = access.room?.type
      if (access.room?.type === "interview") {
        recordCallEvent({ roomId, userId: socket.userId, type: "call_joined", meta: { as: info.label } })
      }
      socket.join(channel(roomId))

      // Access can change mid-call (removed, demoted, interview ended). Re-check every 20 s.
      // Two failed checks in a row are required, so one slow room-service reply doesn't drop everyone.
      let misses = 0
      clearInterval(socket.callRecheck)
      socket.callRecheck = setInterval(async () => {
        const current = await fetchRoomAccess({ roomId, userId: socket.userId })
        misses = current ? 0 : misses + 1
        const closed = current?.room?.type === "interview" && current.room.interview?.status === "ended"
        if (closed || misses >= 2) {
          fail(closed ? "CALL_CLOSED" : "ACCESS_REVOKED", closed ? "The interview has ended" : "You no longer have access to this room")
          dropFromCall(socket, closed ? "closed" : "removed")
        }
      }, CALL_RECHECK_MS)
      socket.callRecheck.unref?.()

            socket.to(channel(roomId)).emit("call-peer-joined", publicPeer(socket.id, info))

      // Sent just after the join reply, so the client has bound its handlers by then.
      const sharer = shares.get(roomId)
      if (sharer && sharer !== socket.id) {
        setImmediate(() => socket.emit("call-screen-state", { socketId: sharer, sharing: true }))
      }
      reply({ ok: true, you: publicPeer(socket.id, info), peers: existing, iceServers: buildIceServers({ userId: socket.userId }) })
    } catch (e) {
      console.error("call-join error:", e.message)
      reply({ ok: false, code: "JOIN_FAILED", message: "Could not join the call" })
    }
  })

  // Relay an offer / answer / ICE candidate to ONE other person in the SAME call.
  socket.on("call-signal", (payload) => {
    const roomId = socket.callRoomId
    if (!roomId) return
    if (!allowSignal()) return fail("RATE_LIMITED", "Too many signaling messages")

    const to = payload?.to
    const target = typeof to === "string" ? calls.get(roomId)?.get(to) : null
    if (!target || to === socket.id) return            // unknown or not in this call: dropped, never relayed

    const data = validateSignal(payload?.data)
    if (!data) return fail("BAD_SIGNAL", "Invalid signaling message")

    io.to(to).emit("call-signal", { from: socket.id, data })   // `from` is set by the server, never by the client
  })

    // One screen share at a time. Only people who publish may share (observers never can).
  socket.on("call-screen-start", (_payload, ack) => {
    const reply = typeof ack === "function" ? ack : () => {}
    const roomId = socket.callRoomId
    const me = roomId ? calls.get(roomId)?.get(socket.id) : null

    if (!me) return reply({ ok: false, code: "NOT_IN_CALL", message: "Join the call first" })
    if (!me.publish) return reply({ ok: false, code: "NOT_ALLOWED", message: "Observers can't share their screen" })
    if (!allowSignal()) return reply({ ok: false, code: "RATE_LIMITED", message: "Too many requests" })

    const current = shares.get(roomId)
    if (current && current !== socket.id) {
      return reply({ ok: false, code: "SCREEN_BUSY", message: "Someone else is already sharing their screen" })
    }

    shares.set(roomId, socket.id)
    socket.to(channel(roomId)).emit("call-screen-state", { socketId: socket.id, sharing: true })
    if (socket.callRoomType === "interview") {
      recordCallEvent({ roomId, userId: socket.userId, type: "call_screen_started" })
    }
    reply({ ok: true })
  })

  socket.on("call-screen-stop", () => {
    const roomId = socket.callRoomId
    if (!roomId || shares.get(roomId) !== socket.id) return
    shares.delete(roomId)
    socket.to(channel(roomId)).emit("call-screen-state", { socketId: socket.id, sharing: false })
    if (socket.callRoomType === "interview") {
      recordCallEvent({ roomId, userId: socket.userId, type: "call_screen_stopped" })
    }
  })

  // Mute / camera indicators. Observers do not publish, so their state is ignored.
  socket.on("call-media-state", (payload) => {
    const roomId = socket.callRoomId
    const me = roomId ? calls.get(roomId)?.get(socket.id) : null
    if (!me || !me.publish) return
    me.audio = payload?.audio === true
    me.video = payload?.video === true
    socket.to(channel(roomId)).emit("call-media-state", { socketId: socket.id, audio: me.audio, video: me.video })
  })

  socket.on("call-leave", () => dropFromCall(socket, "left"))
  socket.on("disconnect", () => dropFromCall(socket, "disconnected"))
}