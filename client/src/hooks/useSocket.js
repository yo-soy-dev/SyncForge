// import { useEffect, useRef } from "react"
// import { getSocket } from "../services/socket"
// import { SOCKET_EVENTS } from "../utils/constants"

// export const useSocket = (roomId) => {
//   const socket = getSocket()

//   // Room join karo
//   const joinRoom = (userId, username) => {
//     if (!socket) return
//     socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, userId, username })
//   }

//   // Yjs update bhejo
//   const sendUpdate = (update) => {
//     if (!socket) return
//     socket.emit(SOCKET_EVENTS.YJS_UPDATE, update)
//   }

//   // Awareness update bhejo (cursor position etc)
//   const sendAwareness = (awarenessState) => {
//     if (!socket) return
//     socket.emit(SOCKET_EVENTS.AWARENESS_UPDATE, { roomId, awarenessState })
//   }

//   // Event listener attach karo
//   const on = (event, handler) => {
//     if (!socket) return () => {}
//     socket.on(event, handler)
//     return () => socket.off(event, handler)  // cleanup function
//   }

//   return { socket, joinRoom, sendUpdate, sendAwareness, on }
// }





import { useCallback } from "react"
import { getSocket } from "../services/socket"
import { SOCKET_EVENTS } from "../utils/constants"

export const useSocket = (roomId) => {
  const socket = getSocket()

  const joinRoom = useCallback((userId, username) => {   // ✅
    if (!socket) return
    socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, userId, username })
  }, [socket, roomId])

  const sendUpdate = useCallback((update) => {           // ✅
    if (!socket) return
    socket.emit(SOCKET_EVENTS.YJS_UPDATE, update)
  }, [socket])

  const sendAwareness = useCallback((awarenessState) => { // ✅
    if (!socket) return
    socket.emit(SOCKET_EVENTS.AWARENESS_UPDATE, { roomId, awarenessState })
  }, [socket, roomId])

  const on = useCallback((event, handler) => {
    if (!socket) return () => {}
    socket.on(event, handler)
    return () => socket.off(event, handler)
  }, [socket])

  return { socket, joinRoom, sendUpdate, sendAwareness, on }
}