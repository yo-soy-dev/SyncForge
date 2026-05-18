
import { useCallback, useEffect, useState } from "react"
import { getSocket } from "../services/socket"
import { SOCKET_EVENTS } from "../utils/constants"

export const useSocket = (roomId) => {
  const [socket, setSocket] = useState(() => getSocket())

  // Socket ready hone ka wait karo
  useEffect(() => {
    if (socket) return
    
    const interval = setInterval(() => {
      const s = getSocket()
      if (s) {
        setSocket(s)
        clearInterval(interval)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [])

  const joinRoom = useCallback((userId, username) => {
    if (!socket) return
    socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, userId, username })
  }, [socket, roomId])

  const sendUpdate = useCallback((update) => {
    if (!socket) return
    socket.emit(SOCKET_EVENTS.YJS_UPDATE, update)
  }, [socket])

  const sendAwareness = useCallback((awarenessState) => {
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