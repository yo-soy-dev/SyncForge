// // import { io } from "socket.io-client"
// // import { SOCKET_URL } from "../utils/constants"

// // let socket = null
// // const listeners = new Set()

// // export const getSocket = () => socket

// // export const onSocketReady = (cb) => {
// //   if (socket?.connected) {
// //     cb(socket)
// //     return
// //   }
// //   // Warna queue mein daalo
// //   listeners.add(cb)
// //   // Agar socket exist karta hai par abhi connecting hai
// //   if (socket) {
// //     socket.once("connect", () => {
// //       listeners.forEach(fn => fn(socket))
// //       listeners.clear()
// //     })
// //   }
// // }

// // export const connectSocket = (userId, username) => {
// //   if (socket?.connected) return socket

// //   socket = io(SOCKET_URL, {
// //     auth: { userId, username },
// //     transports: ["websocket", "polling"],
// //     reconnection: true,
// //     reconnectionAttempts: 5,
// //     reconnectionDelay: 1000,
// //   })

// //   socket.on("connect", () => {
// //     console.log("Socket connected:", socket.id)
// //     window.__devSocket = socket
// //     // Saare pending callbacks call karo
// //     listeners.forEach(fn => fn(socket))
// //     listeners.clear()
// //   })

// //   socket.on("disconnect", (reason) => {
// //     console.log("Socket disconnected:", reason)
// //   })

// //   socket.on("connect_error", (err) => {
// //     console.error("Socket error:", err.message)
// //   })

// //   return socket
// // }

// // export const disconnectSocket = () => {
// //   if (socket) {
// //     socket.disconnect()
// //     socket = null
// //   }
// // }



// import { io } from "socket.io-client"
// import { SOCKET_URL } from "../utils/constants"

// let socket = null

// export const getSocket = () => socket

// export const connectSocket = (userId, username) => {
//   // Already exist karta hai — chahe connected ho ya connecting
//   if (socket) return socket

//   console.log("Creating new socket for:", username)

//   socket = io(SOCKET_URL, {
//     auth: { userId, username },
//     transports: ["websocket", "polling"],
//     reconnection: true,
//     reconnectionAttempts: 5,
//     reconnectionDelay: 1000,
//   })

//   socket.on("connect", () => {
//     console.log("Socket connected:", socket.id)
//     window.__devSocket = socket
//   })

//   socket.on("disconnect", (reason) => {
//     console.log("Socket disconnected:", reason)
//     // Note: socket = null mat karo yahan
//     // reconnection khud handle karega
//   })

//   socket.on("connect_error", (err) => {
//     console.error("Socket connect error:", err.message)
//   })

//   return socket
// }

// export const disconnectSocket = () => {
//   if (socket) {
//     socket.disconnect()
//     socket = null
//   }
// }






import { io } from "socket.io-client"
import { SOCKET_URL } from "../utils/constants"

let socket = null
let readyCallbacks = []

export const getSocket = () => socket

export const onSocketReady = (cb) => {
  if (socket?.connected) {
    cb(socket)
    return
  }
  readyCallbacks.push(cb)
}

export const connectSocket = (userId, username) => {
  if (socket?.connected) return socket
  if (socket) {
    socket.disconnect()
    socket = null
  }

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
    const cbs = [...readyCallbacks]
    readyCallbacks = []
    cbs.forEach(fn => fn(socket))
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
  readyCallbacks = []
}