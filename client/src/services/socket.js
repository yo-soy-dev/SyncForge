import { io } from "socket.io-client"
import { SOCKET_URL } from "../utils/constants"

let socket = null

export const getSocket = () => socket

export const connectSocket = (userId, username) => {
  if (socket?.connected) return socket

  socket = io(SOCKET_URL, {
    auth: { userId, username },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })

  socket.on("connect", () => {
    console.log("Socket connected:", socket.id)
    window.__devSocket = socket
  })

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason)
  })

  socket.on("connect_error", (err) => {
    console.error("Socket error:", err.message)
  })

  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}