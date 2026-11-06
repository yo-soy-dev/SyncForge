import { useEffect, useMemo, useRef, useState } from "react"
import * as Y from "yjs"
import { MonacoBinding } from "y-monaco"
import { toast } from "sonner"

import { onSocketReady } from "../services/socket"
import { SOCKET_EVENTS } from "../utils/constants"
import { useAuth } from "../context/AuthContext"

const toUint8 = (data) =>
  Array.isArray(data)
    ? new Uint8Array(data)
    : data instanceof Uint8Array
      ? data
      : new Uint8Array(Object.values(data))

/**
 * trackCursors: only the instance that owns the Monaco editor should pass true.
 * It then sends this user's cursor and receives everyone else's.
 */
export const useEditor = (roomId, { trackCursors = false } = {}) => {
  const bindingRef = useRef(null)
  const socketRef = useRef(null)
  const joinedRef = useRef(false)
  const isRemoteUpdate = useRef(false)

  const knownRef = useRef(new Set()) // socket ids we have already seen
  const lastCursorRef = useRef(null)
  const sendTimerRef = useRef(null)
  const emitRef = useRef(() => { })

  const [users, setUsers] = useState([])
  const [cursors, setCursors] = useState({}) // { [socketId]: { aL, aC, hL, hC } }

  const { user } = useAuth()

  const ydoc = useMemo(() => new Y.Doc(), [roomId])
  const yText = useMemo(() => ydoc.getText("monaco"), [ydoc])

  // Always points at the latest identity so the throttled sender never goes stale
  emitRef.current = () => {
    const socket = socketRef.current
    if (!socket || !user || !lastCursorRef.current) return

    socket.emit(SOCKET_EVENTS.AWARENESS_UPDATE, {
      roomId,
      awarenessState: {
        user: { username: user.username, userId: user.id },
        cursor: lastCursorRef.current,
      },
    })
  }

  useEffect(() => {
    if (!user || !roomId) return

    joinedRef.current = false
    socketRef.current = null

    const handleSync = (stateUpdate) => {
      joinRetries = 0
      joined = true
      try {
        isRemoteUpdate.current = true
        Y.applyUpdate(ydoc, toUint8(stateUpdate))

        // After a RECONNECT the server may have missed edits made while offline (they were sent before we
        // re-joined and got rejected). Yjs merges are idempotent, so send our full state once.
        if (hasSynced && socketRef.current?.connected) {
          socketRef.current.emit(SOCKET_EVENTS.YJS_UPDATE, Array.from(Y.encodeStateAsUpdate(ydoc)))
        }
        hasSynced = true
      } catch (error) {
        console.error("YJS sync error:", error)
        toast.error("Failed to sync editor")
      } finally {
        isRemoteUpdate.current = false
      }
    }

    const handleUpdate = (update) => {
      try {
        isRemoteUpdate.current = true
        Y.applyUpdate(ydoc, toUint8(update))
      } catch (error) {
        console.error("YJS update error:", error)
      } finally {
        isRemoteUpdate.current = false
      }
    }

    const handleAwareness = ({ socketId, awarenessState }) => {
      const info = awarenessState?.user

      // Keep the same array (and each person's position) when only a cursor moved
      setUsers((prev) => {
        const existing = prev.find((u) => u.socketId === socketId)

        if (!info) {
          return existing ? prev.filter((u) => u.socketId !== socketId) : prev
        }
        if (
          existing &&
          existing.username === info.username &&
          existing.userId === info.userId &&
          existing.avatarUrl === info.avatarUrl
        ) {
          return prev
        }

        const next = { socketId, ...info }
        return existing
          ? prev.map((u) => (u.socketId === socketId ? next : u))
          : [...prev, next]
      })

      if (trackCursors) {
        if (!info) {
          setCursors((prev) => {
            const { [socketId]: _gone, ...rest } = prev
            return rest
          })
        } else if (awarenessState.cursor) {
          setCursors((prev) => ({ ...prev, [socketId]: awarenessState.cursor }))
        }
      }

      // A newcomer doesn't know where my cursor is: tell them
      if (info && !knownRef.current.has(socketId)) {
        knownRef.current.add(socketId)
        setTimeout(() => emitRef.current(), 100)
      }
    }

    const handleUserLeft = ({ socketId }) => {
      knownRef.current.delete(socketId)
      setUsers((prev) => prev.filter((u) => u.socketId !== socketId))
      setCursors((prev) => {
        const { [socketId]: _gone, ...rest } = prev
        return rest
      })
    }

    // A failed join (slow room-service, stale cache) used to be silent and final. Retry with backoff.
    let joined = false
    let hasSynced = false
    let joinRetries = 0
    let retryTimer = null

    const handleError = () => {
      if (joined) return // errors after a successful join (read-only, locked...) are not join failures
      if (joinRetries >= 8) {
        if (trackCursors) toast.error("Could not join the room. Reload the page to try again.")
        return
      }
      joinRetries += 1
      clearTimeout(retryTimer)
      retryTimer = setTimeout(() => {
        const s = socketRef.current
        if (s?.connected) s.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, userId: user.id, username: user.username })
      }, Math.min(1000 * 2 ** joinRetries, 10_000))
    }

    const offReady = onSocketReady((socket) => {
      joined = false // a new connection has not joined the room yet

      socketRef.current = socket

      socket.emit(SOCKET_EVENTS.JOIN_ROOM, {
        roomId,
        userId: user.id,
        username: user.username,
      })

      if (trackCursors) toast.success("Connected")

      setTimeout(() => {
        socket.emit(SOCKET_EVENTS.AWARENESS_UPDATE, {
          roomId,
          awarenessState: {
            user: { username: user.username, userId: user.id },
            ...(lastCursorRef.current ? { cursor: lastCursorRef.current } : {}),
            hello: true,
          },
        })
      }, 300)

      // After a reconnect this is the SAME socket object: remove first so handlers are never added twice.
      socket.off(SOCKET_EVENTS.YJS_SYNC, handleSync)
      socket.off(SOCKET_EVENTS.YJS_UPDATE, handleUpdate)
      socket.off(SOCKET_EVENTS.AWARENESS_UPDATE, handleAwareness)
      socket.off(SOCKET_EVENTS.USER_LEFT, handleUserLeft)
      socket.off(SOCKET_EVENTS.ERROR, handleError)
      socket.on(SOCKET_EVENTS.ERROR, handleError)
      socket.on(SOCKET_EVENTS.YJS_SYNC, handleSync)
      socket.on(SOCKET_EVENTS.YJS_UPDATE, handleUpdate)
      socket.on(SOCKET_EVENTS.AWARENESS_UPDATE, handleAwareness)
      socket.on(SOCKET_EVENTS.USER_LEFT, handleUserLeft)
    })

    const handleYjsUpdate = (update) => {
      if (isRemoteUpdate.current) return
      const socket = socketRef.current
      if (!socket) return
      socket.emit(SOCKET_EVENTS.YJS_UPDATE, Array.from(update))
    }

    ydoc.on("update", handleYjsUpdate)

    return () => {
      const socket = socketRef.current

      if (socket) {
        socket.off(SOCKET_EVENTS.YJS_SYNC, handleSync)
        socket.off(SOCKET_EVENTS.YJS_UPDATE, handleUpdate)
        socket.off(SOCKET_EVENTS.AWARENESS_UPDATE, handleAwareness)
        socket.off(SOCKET_EVENTS.USER_LEFT, handleUserLeft)
        socket.off(SOCKET_EVENTS.ERROR, handleError)
      }

      offReady()
      clearTimeout(retryTimer)
      // Tell the server we left, so we don't stay in everyone's Users list as a ghost.
      if (trackCursors && socket?.connected) socket.emit("leave-room")
      ydoc.off("update", handleYjsUpdate)
      bindingRef.current?.destroy()
      ydoc.destroy()

      clearTimeout(sendTimerRef.current)
      sendTimerRef.current = null
      knownRef.current.clear()
      joinedRef.current = false

      setUsers([])
      setCursors({})
    }
  }, [roomId, user?.id, trackCursors])

  const handleMount = (editor) => {
    const model = editor.getModel()
    if (!model) return

    bindingRef.current = new MonacoBinding(yText, model, new Set([editor]))
    editor.focus()

    // Font size and wrapping come from <Editor options> + the Settings page.
    // (The old code forced fontSize: 14 here, which overrode the user's setting.)
    editor.updateOptions({
      fontFamily: "JetBrains Mono, monospace",
      smoothScrolling: true,
    })

    if (trackCursors) {
      const report = () => {
        const s = editor.getSelection()
        if (!s) return

        lastCursorRef.current = {
          aL: s.selectionStartLineNumber,
          aC: s.selectionStartColumn,
          hL: s.positionLineNumber,
          hC: s.positionColumn,
        }

        if (sendTimerRef.current) return // throttle: at most one send per 80 ms
        sendTimerRef.current = setTimeout(() => {
          sendTimerRef.current = null
          emitRef.current()
        }, 80)
      }

      editor.onDidChangeCursorSelection(report)
      report()
    }
  }

  return { handleMount, users, cursors, yText }
}