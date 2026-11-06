import * as Y from "yjs"
import { getOrCreateDoc, removeDoc } from "../yjs/documentManager.js"
import { getOrCreateProvider, removeProvider } from "../yjs/provider.js"
import { fetchRoomAccess, parseUpdate, refreshMsFor } from "../security/socketAuth.js"
import { dropFromCall } from "./call.socket.js"
import { announcePresence, dropPresence } from "./awareness.socket.js"

const roomUsers = new Map()

const fail = (socket, code, message) => socket.emit("error", { code, message })

// Remove the socket from its room; tear the room down when the last user leaves.
const leaveCurrentRoom = async (socket) => {
  const { roomId } = socket
  if (!roomId) return

  dropFromCall(socket, socket.callDropReason)
  dropPresence(socket, roomId)

  socket.leave(roomId)
  socket.roomId = null
  socket.role = null
  socket.canWrite = false

  const users = roomUsers.get(roomId)
  if (users) {
    users.delete(socket.id)
    if (users.size === 0) {
      roomUsers.delete(roomId)
      await removeDoc(roomId)
      await removeProvider(roomId)
      console.log(`Room ${roomId} empty — cleaned up`)
    }
  }
}

// Re-validate membership/role periodically so removed, demoted or locked users lose access
// without paying for a room-service call on every keystroke.
const ensureFreshRole = async (socket) => {
  if (Date.now() - socket.roleCheckedAt < refreshMsFor(socket.roomType)) return true
  const access = await fetchRoomAccess({ roomId: socket.roomId, userId: socket.userId })
  if (!access) {
    fail(socket, "ACCESS_REVOKED", "You no longer have access to this room")
    socket.callDropReason = "removed"
    await leaveCurrentRoom(socket)
    return false
  }
  const changed = access.role !== socket.role || access.canWrite !== socket.canWrite
  socket.role = access.role
  socket.canWrite = access.canWrite
  socket.roomType = access.roomType
  socket.roleCheckedAt = Date.now()
  if (changed) socket.emit("room-role", { role: access.role, canWrite: access.canWrite })
  return true
}

export const setupEditorSocket = (io, socket) => {

  // NOTE: the client may still send { userId, username } — they are ignored.
  // Identity is socket.userId / socket.username, set from the verified token.
  socket.on("join-room", async (payload) => {
    try {
      const roomId = payload?.roomId
      const access = await fetchRoomAccess({ roomId, userId: socket.userId })

      if (!access) {
        // Same message for "no such room" and "not a member".
        return fail(socket, "FORBIDDEN", "Room not found or access denied")
      }
      if (socket.roomId && socket.roomId !== roomId) {
        await leaveCurrentRoom(socket) // switching rooms: leave the old one instead of failing
      }

      socket.join(roomId)
      socket.roomId = roomId
      socket.role = access.role
      socket.canWrite = access.canWrite
      socket.roomType = access.roomType
      socket.roleCheckedAt = Date.now()

      if (!roomUsers.has(roomId)) roomUsers.set(roomId, new Set())
      roomUsers.get(roomId).add(socket.id)

      const ydoc = await getOrCreateDoc(roomId)
      await getOrCreateProvider(roomId, io)

      socket.emit("yjs-sync", Array.from(Y.encodeStateAsUpdate(ydoc)))
      socket.emit("room-role", { role: access.role, canWrite: access.canWrite })   // lets the UI go read-only

           announcePresence(socket)
      console.log(`${socket.username} joined room ${roomId} as ${access.role}`)
    } catch (err) {
      console.error("join-room error:", err)
      fail(socket, "JOIN_FAILED", "Room join failed")
    }
  })

    socket.on("leave-room", async () => {
    try {
      await leaveCurrentRoom(socket)
    } catch (err) {
      console.error("leave-room error:", err.message)
    }
  })

  socket.on("yjs-update", async (update) => {
    try {
      if (!socket.roomId) return

      const bytes = parseUpdate(update)
      if (!bytes) return fail(socket, "BAD_UPDATE", "Invalid or oversized update")

      if (!(await ensureFreshRole(socket))) return
      if (!socket.canWrite) {
        // Role would allow writing but the room state does not (interview locked / not started / ended).
        if (socket.role !== "viewer") {
          return fail(socket, "LOCKED", "Editing is currently locked in this room")
        }
        return fail(socket, "READ_ONLY", "You have read-only access to this room")
      }

      const { roomId } = socket
      const ydoc = await getOrCreateDoc(roomId)
      Y.applyUpdate(ydoc, bytes)
      socket.to(roomId).emit("yjs-update", Array.from(bytes))

      const provider = await getOrCreateProvider(roomId, io)
      await provider.publishUpdate(bytes, socket.id)
    } catch (err) {
      console.error("yjs-update error:", err)
    }
  })

  socket.on("disconnect", async () => {
    const { roomId, username } = socket
    await leaveCurrentRoom(socket)
    if (roomId) console.log(`${username || "User"} left room ${roomId}`)
  })
}