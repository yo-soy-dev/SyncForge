// import * as Y from "yjs"

// import {
//   getOrCreateDoc,
//   removeDoc,
// } from "../yjs/documentManager.js"

// import {
//   getOrCreateProvider,
//   removeProvider,
// } from "../yjs/provider.js"

// import { getRoomById } from "../services/room.service.js"

// const roomUsers = new Map()

// // ─────────────────────────────────────────────
// // Validate room access
// // ─────────────────────────────────────────────
// const validateRoom = async (roomId, userId) => {
//   try {
//     const controller = new AbortController()

//     const timeout = setTimeout(() => {
//       controller.abort()
//     }, 5000)

//     const response = await fetch(
//       `${process.env.ROOM_SERVICE_URL}/api/rooms/${roomId}`,
//       {
//         headers: {
//           "x-user-id": userId,
//         },
//         signal: controller.signal,
//       }
//     )

//     clearTimeout(timeout)

//     if (!response.ok) {
//       return null
//     }

//     let data

//     try {
//       data = await response.json()
//     } catch {
//       return null
//     }

//     return data.room || null

//   } catch (err) {
//     console.error("validateRoom error:", err)
//     return null
//   }
// }

// // ─────────────────────────────────────────────
// // Setup editor socket
// // ─────────────────────────────────────────────
// export const setupEditorSocket = (io, socket) => {

//   // ───────────────────────────────────────────
//   // Join room
//   // ───────────────────────────────────────────
//   socket.on(
//     "join-room",
//     async ({ roomId, userId, username }) => {

//       try {
//         // prevent duplicate joins
//         if (socket.roomId === roomId) {
//           return
//         }

//         if (!roomId || !userId || !username) {
//           socket.emit("room-error", {
//             message: "Invalid join payload",
//           })

//           return
//         }

//         // validate access
//         const room = await getRoomById(
//           roomId,
//           userId
//         )

//         if (!room) {
//           socket.emit("room-error", {
//             message:
//               "Room nahi mila ya access nahi hai",
//           })

//           return
//         }

//         // join socket room
//         socket.join(roomId)

//         // attach metadata
//         socket.roomId = roomId
//         socket.userId = userId
//         socket.username = username

//         // track users
//         if (!roomUsers.has(roomId)) {
//           roomUsers.set(roomId, new Set())
//         }

//         roomUsers.get(roomId).add(socket.id)

//         // get/create ydoc
//         const ydoc = await getOrCreateDoc(roomId)

//         // ensure provider exists
//         await getOrCreateProvider(roomId, io)

//         // send current document state
//         const currentState =
//           Y.encodeStateAsUpdate(ydoc)

//         socket.emit(
//           "yjs-sync",
//           Array.from(currentState)
//         )

//         // notify room
//         socket.to(roomId).emit(
//           "user-joined",
//           {
//             socketId: socket.id,
//             userId,
//             username,
//           }
//         )

//         console.log(
//           `${username} joined room ${roomId}, state size: ${currentState.length}`
//         )

//       } catch (err) {
//         console.error("join-room error:", err)

//         socket.emit("room-error", {
//           message: "Room join failed",
//         })
//       }
//     }
//   )

//   // ───────────────────────────────────────────
//   // YJS document updates
//   // ───────────────────────────────────────────
//   socket.on("yjs-update", async (update) => {

//     try {
//       const { roomId } = socket

//       // validate payload
//       if (
//         !roomId ||
//         !Array.isArray(update)
//       ) {
//         return
//       }

//       // get room doc
//       const ydoc =
//         await getOrCreateDoc(roomId)

//       const uint8Update =
//         new Uint8Array(update)

//       // apply update locally
//       Y.applyUpdate(
//         ydoc,
//         uint8Update,
//         socket.id
//       )

//       // instant local broadcast
//       socket.to(roomId).emit(
//         "yjs-update",
//         Array.from(uint8Update)
//       )

//       // distributed sync
//       const provider =
//         await getOrCreateProvider(
//           roomId,
//           io
//         )

//       await provider.publishUpdate(
//         Array.from(uint8Update),
//         socket.id
//       )

//     } catch (err) {
//       console.error(
//         "yjs-update error:",
//         err
//       )
//     }
//   })

//   // ───────────────────────────────────────────
//   // Disconnect
//   // ───────────────────────────────────────────
//   socket.on("disconnect", async () => {

//     try {
//       const {
//         roomId,
//         username,
//       } = socket

//       if (!roomId) {
//         return
//       }

//       socket.leave(roomId)

//       const users =
//         roomUsers.get(roomId)

//       if (users) {
//         users.delete(socket.id)

//         // notify others
//         socket.to(roomId).emit(
//           "user-left",
//           {
//             socketId: socket.id,
//             username,
//           }
//         )

//         // delayed cleanup
//         if (users.size === 0) {

//           setTimeout(async () => {

//             const remainingUsers =
//               roomUsers.get(roomId)

//             if (
//               !remainingUsers ||
//               remainingUsers.size === 0
//             ) {

//               roomUsers.delete(roomId)

//               await removeDoc(roomId)

//               await removeProvider(
//                 roomId
//               )

//               console.log(
//                 `Room ${roomId} empty — cleaned up`
//               )
//             }

//           }, 5000)
//         }
//       }

//       console.log(
//         `${username || "User"} left room ${roomId}`
//       )

//     } catch (err) {
//       console.error(
//         "disconnect error:",
//         err
//       )
//     }
//   })
// }





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