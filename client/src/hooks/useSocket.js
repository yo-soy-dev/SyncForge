import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  toast,
} from "sonner"

import {
  getSocket,
} from "../services/socket"

import {
  SOCKET_EVENTS,
} from "../utils/constants"

export const useSocket = (
  roomId
) => {

  const [socket, setSocket] =
    useState(() => getSocket())

  const [isConnected, setIsConnected] =
    useState(false)

  
  useEffect(() => {

    if (socket) return

    const interval =
      setInterval(() => {

        const instance =
          getSocket()

        if (instance) {

          setSocket(instance)

          clearInterval(interval)
        }

      }, 100)

    return () =>
      clearInterval(interval)

  }, [socket])

  
  useEffect(() => {

    if (!socket) return

    const handleConnect = () => {

      setIsConnected(true)

      console.log(
        "Socket connected:",
        socket.id
      )
    }

    const handleDisconnect =
      (reason) => {

        setIsConnected(false)

        console.log(
          "Socket disconnected:",
          reason
        )

        toast.error(
          "Connection lost"
        )
      }

    const handleConnectError =
      (error) => {

        console.error(
          "Socket connection error:",
          error
        )

        toast.error(
          "Failed to connect"
        )
      }

    socket.on(
      "connect",
      handleConnect
    )

    socket.on(
      "disconnect",
      handleDisconnect
    )

    socket.on(
      "connect_error",
      handleConnectError
    )

    if (socket.connected) {
      setIsConnected(true)
    }

    return () => {

      socket.off(
        "connect",
        handleConnect
      )

      socket.off(
        "disconnect",
        handleDisconnect
      )

      socket.off(
        "connect_error",
        handleConnectError
      )
    }

  }, [socket])

  
  const joinRoom =
    useCallback(
      (
        userId,
        username
      ) => {

        if (!socket) return

        socket.emit(
          SOCKET_EVENTS.JOIN_ROOM,
          {
            roomId,
            userId,
            username,
          }
        )

        console.log(
          `Joined room: ${roomId}`
        )
      },
      [socket, roomId]
    )

 
  const sendUpdate =
    useCallback(
      (update) => {

        if (!socket) return

        socket.emit(
          SOCKET_EVENTS.YJS_UPDATE,
          update
        )
      },
      [socket]
    )

  
  const sendAwareness =
    useCallback(
      (
        awarenessState
      ) => {

        if (!socket) return

        socket.emit(
          SOCKET_EVENTS.AWARENESS_UPDATE,
          {
            roomId,
            awarenessState,
          }
        )
      },
      [socket, roomId]
    )

  
  const on = useCallback(
    (
      event,
      handler
    ) => {

      if (!socket)
        return () => {}

      socket.on(
        event,
        handler
      )

      return () =>
        socket.off(
          event,
          handler
        )

    },
    [socket]
  )

  
  const emit = useCallback(
    (
      event,
      payload
    ) => {

      if (!socket) return

      socket.emit(
        event,
        payload
      )

    },
    [socket]
  )

  
  return useMemo(
    () => ({
      socket,
      isConnected,
      joinRoom,
      sendUpdate,
      sendAwareness,
      on,
      emit,
    }),

    [
      socket,
      isConnected,
      joinRoom,
      sendUpdate,
      sendAwareness,
      on,
      emit,
    ]
  )
}