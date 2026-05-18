import * as Y from "yjs"
import { getOrCreateDoc, removeDoc } from "../yjs/documentManager.js"
import { getOrCreateProvider, removeProvider } from "../yjs/provider.js"

const roomUsers = new Map()

const validateRoom = async (roomId, userId) => {
  try {
    const response = await fetch(
      // `http://room-service:4002/${roomId}`,
      `${process.env.ROOM_SERVICE_URL}/${roomId}`,
      { headers: { "x-user-id": userId } }
    )
    if (!response.ok) return null
    const data = await response.json()
    return data.room || null
  } catch (err) {
    console.error("validateRoom error:", err)
    return null
  }
}

export const setupEditorSocket = (io, socket) => {

  socket.on("join-room", async ({ roomId, userId, username }) => {
    try {
      console.log(`join-room received: ${username} -> ${roomId}`)
      
      const room = await validateRoom(roomId, userId)

      if (!room) {
        console.log(`Room not found: ${roomId}`)
        socket.emit("error", { message: "Room nahi mila" })
        return
      }

      socket.join(roomId)
      socket.roomId = roomId
      socket.userId = userId
      socket.username = username

      if (!roomUsers.has(roomId)) roomUsers.set(roomId, new Set())
      roomUsers.get(roomId).add(socket.id)

      const ydoc = await getOrCreateDoc(roomId)
      await getOrCreateProvider(roomId, io)

      const currentState = Y.encodeStateAsUpdate(ydoc)
      socket.emit("yjs-sync", Array.from(currentState))

      console.log(`${username} joined room ${roomId} — state size: ${currentState.length}`)
    } catch (err) {
      console.error("join-room error:", err)
      socket.emit("error", { message: "Room join failed" })
    }
  })

  socket.on("yjs-update", async (update) => {
    try {
      const { roomId } = socket
      if (!roomId) return

      const ydoc = await getOrCreateDoc(roomId)
      Y.applyUpdate(ydoc, new Uint8Array(update))
      socket.to(roomId).emit("yjs-update", update)

      const provider = await getOrCreateProvider(roomId, io)
      await provider.publishUpdate(update, socket.id)
    } catch (err) {
      console.error("yjs-update error:", err)
    }
  })

  socket.on("disconnect", async () => {
    const { roomId, username } = socket
    if (!roomId) return

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

    console.log(`${username || "User"} left room ${roomId}`)
  })
}