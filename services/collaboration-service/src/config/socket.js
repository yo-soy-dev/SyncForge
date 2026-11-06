import { Server } from "socket.io"
import { setupEditorSocket } from "../sockets/editor.socket.js"
import { setupAwarenessSocket } from "../sockets/awareness.socket.js"
import { setupCallSocket } from "../sockets/call.socket.js"
import { createSocketAuth } from "../security/socketAuth.js"

export const createSocketServer = (httpServer) => {
  const allowedOrigins = (process.env.CLIENT_URL || "").split(",").map((o) => o.trim()).filter(Boolean)

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins.length ? allowedOrigins : process.env.NODE_ENV !== "production",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
    maxHttpBufferSize: 4e6, // Yjs updates travel as JSON number arrays (~4x inflation)
  })

  // Identity is established here, once, from a verified token.
  io.use(createSocketAuth())

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id} (user ${socket.userId})`)

    setupEditorSocket(io, socket)
    setupAwarenessSocket(io, socket)
    setupCallSocket(io, socket)

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`)
    })
  })

  return io
}