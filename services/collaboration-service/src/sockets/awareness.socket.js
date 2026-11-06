// roomId -> Map(socketId -> { username, userId, cursor })
const roomAwareness = new Map()

const MAX_COORD = 1_000_000
const coord = (v) => (Number.isInteger(v) && v >= 1 && v <= MAX_COORD ? v : null)

// Only these four integers are ever relayed. Anything else a client sends is dropped.
const sanitizeCursor = (c) => {
  if (!c || typeof c !== "object") return null
  const cursor = { aL: coord(c.aL), aC: coord(c.aC), hL: coord(c.hL), hC: coord(c.hC) }
  return Object.values(cursor).every((v) => v !== null) ? cursor : null
}

const publicState = ({ userId, username, avatarUrl, cursor }) => ({
  user: { userId, username, avatarUrl },
  ...(cursor ? { cursor } : {}),
})

// Called by the join handler: tell the room we are here, and tell the newcomer who is here (and where).
export const announcePresence = (socket) => {
  const roomId = socket.roomId
  if (!roomId) return

  if (!roomAwareness.has(roomId)) roomAwareness.set(roomId, new Map())
  const roomMap = roomAwareness.get(roomId)

  const me = { userId: socket.userId, username: socket.username, avatarUrl: socket.avatarUrl, cursor: roomMap.get(socket.id)?.cursor ?? null }
  roomMap.set(socket.id, me)

  socket.to(roomId).emit("awareness-update", { socketId: socket.id, awarenessState: publicState(me) })
  for (const [sid, other] of roomMap.entries()) {
    if (sid === socket.id) continue
    socket.emit("awareness-update", { socketId: sid, awarenessState: publicState(other) })
  }
}

// Remove a socket from the room's presence list and tell everyone else.
export const dropPresence = (socket, roomId) => {
  if (!roomId) return
  const roomMap = roomAwareness.get(roomId)
  if (roomMap) {
    roomMap.delete(socket.id)
    if (roomMap.size === 0) roomAwareness.delete(roomId)
  }
  socket.to(roomId).emit("user-left", { socketId: socket.id, username: socket.username })
}

export const setupAwarenessSocket = (io, socket) => {
  socket.on("awareness-update", ({ roomId, awarenessState } = {}) => {
    try {
      // Only the room this socket was authorised for; never trust the payload's roomId.
      if (!roomId || roomId !== socket.roomId || !awarenessState?.user) return

      if (!roomAwareness.has(roomId)) roomAwareness.set(roomId, new Map())
      const roomMap = roomAwareness.get(roomId)

      const prev = roomMap.get(socket.id)
      const cursor = sanitizeCursor(awarenessState.cursor) ?? prev?.cursor ?? null

      // Identity always comes from the verified token, never from the payload.
      const me = { userId: socket.userId, username: socket.username, avatarUrl: socket.avatarUrl, cursor }
      roomMap.set(socket.id, me)

      socket.to(roomId).emit("awareness-update", {
        socketId: socket.id,
        awarenessState: publicState(me),
      })

      // Tell a newcomer who is here (and where their cursors are), once.
      // Clients ask again with hello:true when their editor mounts.
      if (!prev || awarenessState.hello === true) {
        for (const [sid, other] of roomMap.entries()) {
          if (sid === socket.id) continue
          socket.emit("awareness-update", {
            socketId: sid,
            awarenessState: publicState(other),
          })
        }
      }
    } catch (err) {
      console.error("[awareness] error:", err.message)
    }
  })

  socket.on("disconnect", () => {
    const { roomId } = socket
    if (!roomId) return

    const roomMap = roomAwareness.get(roomId)
    if (roomMap) {
      roomMap.delete(socket.id)
      if (roomMap.size === 0) roomAwareness.delete(roomId)
    }

    socket.to(roomId).emit("user-left", {
      socketId: socket.id,
      username: socket.username,
    })
  })
}