import { Server } from "socket.io"
import { setupEditorSocket } from "../sockets/editor.socket.js"
import { setupAwarenessSocket } from "../sockets/awareness.socket.js"

export const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST"]
    },
    transports: ["websocket", "polling"]
  })

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`)

    const userId = socket.handshake.auth?.userId
    const username = socket.handshake.auth?.username

    if (!userId) {
      socket.emit("error", { message: "Unauthorized" })
      socket.disconnect()
      return
    }

    socket.userId = userId
    socket.username = username

    setupEditorSocket(io, socket)
    setupAwarenessSocket(io, socket)

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`)
    })
  })

  return io
}