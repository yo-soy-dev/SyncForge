import { io } from "socket.io-client"
import { SOCKET_URL } from "../utils/constants"
import { toast } from "sonner"

let socket = null
let readyCallbacks = []

export const getSocket = () => socket

// cb runs now if already connected, and again after EVERY reconnect: a reconnected socket is a new
// connection on the server that has forgotten which room it was in. Returns an unsubscribe function.
export const onSocketReady = (cb) => {
  readyCallbacks.push(cb)
  if (socket?.connected) cb(socket)
  return () => {
    readyCallbacks = readyCallbacks.filter((fn) => fn !== cb)
  }
}

export const connectSocket = (userId, username) => {
  if (socket?.connected) return socket
  if (socket) {
    socket.disconnect()
    socket = null
  }

  socket = io(SOCKET_URL, {
    auth: (cb) => cb({ token: localStorage.getItem("token") }), // read fresh on every reconnect
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity, // 5 attempts meant ~20 s offline, then dead until a page reload
    reconnectionDelayMax: 5000,
    timeout: 10000,
    tryAllTransports: true, // if WebSocket is blocked or hangs, fall back to polling
    reconnectionDelay: 1000,
  })

  socket.on("connect", () => {
    if (import.meta.env.DEV) window.__devSocket = socket
    const cbs = [...readyCallbacks]
    cbs.forEach(fn => fn(socket))
  })

  socket.on("disconnect", (reason) => {
  })

  socket.on("connect_error", (err) => {
    console.error("Socket error:", err.message)
    // A genuinely invalid session never succeeds: stop. A busy auth-service (retryable) keeps retrying.
    if (err.message === "Unauthorized" && !err.data?.retryable) {
      socket.disconnect()
      toast.error("Your session has ended. Please log in again.")
    }
  })

  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  readyCallbacks = []
}