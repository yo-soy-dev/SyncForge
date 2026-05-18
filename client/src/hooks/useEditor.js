import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import * as Y from "yjs"

import { MonacoBinding } from "y-monaco"

import { toast } from "sonner"

import {
  onSocketReady,
} from "../services/socket"

import {
  SOCKET_EVENTS,
} from "../utils/constants"

import {
  useAuth,
} from "../context/AuthContext"

export const useEditor = (
  roomId
) => {

  const editorRef =
    useRef(null)

  const bindingRef =
    useRef(null)

  const socketRef =
    useRef(null)

  const joinedRef =
    useRef(false)

  const isRemoteUpdate =
    useRef(false)

  const [users, setUsers] =
    useState([])

  const {
    user,
  } = useAuth()

  const ydoc = useMemo(
    () => new Y.Doc(),
    [roomId]
  )

  const yText = useMemo(
    () => ydoc.getText("monaco"),
    [ydoc]
  )

  useEffect(() => {

    if (
      !user ||
      !roomId
    ) return

    joinedRef.current = false
    socketRef.current = null

    
    const handleSync = (
      stateUpdate
    ) => {

      try {

        isRemoteUpdate.current =
          true

        const update =
          Array.isArray(
            stateUpdate
          )
            ? new Uint8Array(
                stateUpdate
              )
            : stateUpdate instanceof
              Uint8Array
              ? stateUpdate
              : new Uint8Array(
                  Object.values(
                    stateUpdate
                  )
                )

        Y.applyUpdate(
          ydoc,
          update
        )

        console.log(
          "YJS sync received:",
          update.length
        )

      } catch (error) {

        console.error(
          "YJS sync error:",
          error
        )

        toast.error(
          "Failed to sync editor"
        )

      } finally {

        isRemoteUpdate.current =
          false
      }
    }

  
    const handleUpdate = (
      update
    ) => {

      try {

        isRemoteUpdate.current =
          true

        const parsedUpdate =
          Array.isArray(update)
            ? new Uint8Array(
                update
              )
            : update instanceof
              Uint8Array
              ? update
              : new Uint8Array(
                  Object.values(
                    update
                  )
                )

        Y.applyUpdate(
          ydoc,
          parsedUpdate
        )

      } catch (error) {

        console.error(
          "YJS update error:",
          error
        )

      } finally {

        isRemoteUpdate.current =
          false
      }
    }

    
    const handleAwareness = ({
      socketId,
      awarenessState,
    }) => {

      setUsers((prev) => {

        const filtered =
          prev.filter(
            (u) =>
              u.socketId !==
              socketId
          )

        if (
          awarenessState?.user
        ) {

          return [
            ...filtered,
            {
              socketId,
              ...awarenessState.user,
            },
          ]
        }

        return filtered
      })
    }

    
    const handleUserLeft = ({
      socketId,
    }) => {

      setUsers((prev) =>
        prev.filter(
          (u) =>
            u.socketId !==
            socketId
        )
      )
    }

    
    onSocketReady((socket) => {

      if (
        joinedRef.current
      ) return

      joinedRef.current =
        true

      socketRef.current =
        socket

      console.log(
        "Joining room:",
        roomId
      )

      socket.emit(
        SOCKET_EVENTS.JOIN_ROOM,
        {
          roomId,
          userId: user.id,
          username:
            user.username,
        }
      )

      toast.success(
        `Connected to ${roomId}`
      )

      setTimeout(() => {

        socket.emit(
          SOCKET_EVENTS.AWARENESS_UPDATE,
          {
            roomId,

            awarenessState:
            {
              user: {
                username:
                  user.username,

                userId:
                  user.id,
              },
            },
          }
        )

      }, 300)

      socket.on(
        SOCKET_EVENTS.YJS_SYNC,
        handleSync
      )

      socket.on(
        SOCKET_EVENTS.YJS_UPDATE,
        handleUpdate
      )

      socket.on(
        SOCKET_EVENTS.AWARENESS_UPDATE,
        handleAwareness
      )

      socket.on(
        SOCKET_EVENTS.USER_LEFT,
        handleUserLeft
      )
    })

    
    const handleYjsUpdate = (
      update
    ) => {

      if (
        isRemoteUpdate.current
      ) return

      const socket =
        socketRef.current

      if (!socket) return

      socket.emit(
        SOCKET_EVENTS.YJS_UPDATE,
        Array.from(update)
      )
    }

    ydoc.on(
      "update",
      handleYjsUpdate
    )

    
    return () => {

      const socket =
        socketRef.current

      if (socket) {

        socket.off(
          SOCKET_EVENTS.YJS_SYNC,
          handleSync
        )

        socket.off(
          SOCKET_EVENTS.YJS_UPDATE,
          handleUpdate
        )

        socket.off(
          SOCKET_EVENTS.AWARENESS_UPDATE,
          handleAwareness
        )

        socket.off(
          SOCKET_EVENTS.USER_LEFT,
          handleUserLeft
        )
      }

      ydoc.off(
        "update",
        handleYjsUpdate
      )

      bindingRef.current?.destroy()

      ydoc.destroy()

      joinedRef.current =
        false

      setUsers([])
    }

  }, [
    roomId,
    user?.id,
  ])

  
  const handleMount = (
    editor
  ) => {

    editorRef.current =
      editor

    const model =
      editor.getModel()

    if (!model) return

    bindingRef.current =
      new MonacoBinding(
        yText,
        model,
        new Set([editor])
      )

    editor.focus()

    editor.updateOptions({
      fontSize: 14,
      fontFamily:
        "JetBrains Mono, monospace",

      smoothScrolling: true,

      cursorSmoothCaretAnimation:
        "on",

      minimap: {
        enabled: false,
      },
    })
  }

  return {
    handleMount,
    users,
    yText,
  }
}