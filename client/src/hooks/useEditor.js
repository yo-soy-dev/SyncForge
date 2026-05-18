// import { useEffect, useRef, useMemo, useState } from "react"
// import * as Y from "yjs"
// import { MonacoBinding } from "y-monaco"
// import { getSocket } from "../services/socket"
// import { SOCKET_EVENTS } from "../utils/constants"
// import { useAuth } from "../context/AuthContext"

// export const useEditor = (roomId) => {
//   const editorRef   = useRef(null)
//   const bindingRef  = useRef(null)
//   const isRemoteUpdate = useRef(false)
//   const hasJoined   = useRef(false)
//   const [users, setUsers] = useState([])
//   const { user } = useAuth()

//   // Socket poller — wait for socket to be ready
//   const [socket, setSocket] = useState(() => getSocket())

//   useEffect(() => {
//     if (socket) return
//     const id = setInterval(() => {
//       const s = getSocket()
//       if (s) {
//         setSocket(s)
//         clearInterval(id)
//       }
//     }, 100)
//     return () => clearInterval(id)
//   }, [socket])

//   const ydoc  = useMemo(() => new Y.Doc(), [roomId])
//   const yText = useMemo(() => ydoc.getText("monaco"), [ydoc])

//   // Main effect
//   useEffect(() => {
//     if (!user || !roomId || !socket) return
//     if (hasJoined.current) return

//     // Join room
//     const doJoin = () => {
//       if (hasJoined.current) return
//       hasJoined.current = true
//       console.log("Socket ready — joining room", roomId, "userId:", user.id)
//       socket.emit(SOCKET_EVENTS.JOIN_ROOM, {
//         roomId,
//         userId:   user.id,
//         username: user.username,
//       })

//       // Send our own awareness immediately after joining
//       setTimeout(() => {
//         socket.emit(SOCKET_EVENTS.AWARENESS_UPDATE, {
//           roomId,
//           awarenessState: {
//             user: {
//               username: user.username,
//               userId: user.id,
//             }
//           }
//         })
//       }, 500)
//     }

//     if (socket.connected) {
//       doJoin()
//     } else {
//       socket.once("connect", doJoin)
//     }

//     // YJS_SYNC — initial state from server
//     const onSync = (stateUpdate) => {
//       try {
//         isRemoteUpdate.current = true
//         let update
//         if (Array.isArray(stateUpdate)) {
//           update = new Uint8Array(stateUpdate)
//         } else if (stateUpdate instanceof Uint8Array) {
//           update = stateUpdate
//         } else {
//           update = new Uint8Array(Object.values(stateUpdate))
//         }
//         Y.applyUpdate(ydoc, update)
//         console.log("YJS_SYNC received — size:", update.length)
//       } catch (e) {
//         console.error("YJS_SYNC apply error:", e)
//       } finally {
//         isRemoteUpdate.current = false
//       }
//     }

//     // YJS_UPDATE — changes from other users
//     const onUpdate = (update) => {
//       try {
//         isRemoteUpdate.current = true
//         const u = Array.isArray(update)
//           ? new Uint8Array(update)
//           : update instanceof Uint8Array
//             ? update
//             : new Uint8Array(Object.values(update))
//         Y.applyUpdate(ydoc, u)
//       } catch (e) {
//         console.error("YJS_UPDATE apply error:", e)
//       } finally {
//         isRemoteUpdate.current = false
//       }
//     }

//     // Awareness — online users list
//     const onAwareness = ({ socketId, awarenessState }) => {
//       console.log("Awareness received:", socketId, awarenessState)
//       setUsers(prev => {
//         const filtered = prev.filter(u => u.socketId !== socketId)
//         if (awarenessState?.user) {
//           return [...filtered, { socketId, ...awarenessState.user }]
//         }
//         return filtered
//       })
//     }

//     const onUserLeft = ({ socketId }) => {
//       console.log("User left:", socketId)
//       setUsers(prev => prev.filter(u => u.socketId !== socketId))
//     }

//     // Send local yjs updates to server
//     const handleLocalUpdate = (update) => {
//       if (isRemoteUpdate.current) return
//       socket.emit(SOCKET_EVENTS.YJS_UPDATE, Array.from(update))
//     }

//     // Register listeners
//     socket.on(SOCKET_EVENTS.YJS_SYNC,          onSync)
//     socket.on(SOCKET_EVENTS.YJS_UPDATE,         onUpdate)
//     socket.on(SOCKET_EVENTS.AWARENESS_UPDATE,   onAwareness)
//     socket.on(SOCKET_EVENTS.USER_LEFT,          onUserLeft)
//     ydoc.on("update", handleLocalUpdate)

//     // Cleanup
//     return () => {
//       socket.off("connect",                      doJoin)
//       socket.off(SOCKET_EVENTS.YJS_SYNC,         onSync)
//       socket.off(SOCKET_EVENTS.YJS_UPDATE,       onUpdate)
//       socket.off(SOCKET_EVENTS.AWARENESS_UPDATE, onAwareness)
//       socket.off(SOCKET_EVENTS.USER_LEFT,        onUserLeft)
//       ydoc.off("update", handleLocalUpdate)
//       ydoc.destroy()
//       hasJoined.current = false
//     }
//   }, [roomId, user, socket])

//   // Monaco editor mount
//   const handleMount = (editor) => {
//     editorRef.current  = editor
//     bindingRef.current = new MonacoBinding(
//       yText,
//       editor.getModel(),
//       new Set([editor]),
//     )
//   }

//   return { handleMount, users, yText }
// }





import { useEffect, useRef, useMemo, useState } from "react"
import * as Y from "yjs"
import { MonacoBinding } from "y-monaco"
import { onSocketReady } from "../services/socket"
import { SOCKET_EVENTS } from "../utils/constants"
import { useAuth } from "../context/AuthContext"

export const useEditor = (roomId) => {
    const editorRef = useRef(null)
    const bindingRef = useRef(null)
    const isRemoteUpdate = useRef(false)
    const [users, setUsers] = useState([])
    const { user } = useAuth()
    const socketRef = useRef(null)
    const joinedRef = useRef(false)

    const ydoc = useMemo(() => new Y.Doc(), [roomId])
    const yText = useMemo(() => ydoc.getText("monaco"), [ydoc])

    useEffect(() => {
        if (!user || !roomId) return

        joinedRef.current = false
        socketRef.current = null

        const handleSync = (stateUpdate) => {
            try {
                isRemoteUpdate.current = true
                const update = Array.isArray(stateUpdate)
                    ? new Uint8Array(stateUpdate)
                    : stateUpdate instanceof Uint8Array
                        ? stateUpdate
                        : new Uint8Array(Object.values(stateUpdate))
                Y.applyUpdate(ydoc, update)
                console.log("YJS_SYNC received — size:", update.length)
            } catch (e) {
                console.error("YJS_SYNC apply error:", e)
            } finally {
                isRemoteUpdate.current = false
            }
        }

        const handleUpdate = (update) => {
            try {
                isRemoteUpdate.current = true
                const u = Array.isArray(update)
                    ? new Uint8Array(update)
                    : update instanceof Uint8Array
                        ? update
                        : new Uint8Array(Object.values(update))
                Y.applyUpdate(ydoc, u)
            } catch (e) {
                console.error("YJS_UPDATE apply error:", e)
            } finally {
                isRemoteUpdate.current = false
            }
        }

        const handleAwareness = ({ socketId, awarenessState }) => {
            setUsers(prev => {
                const filtered = prev.filter(u => u.socketId !== socketId)
                if (awarenessState?.user) {
                    return [...filtered, { socketId, ...awarenessState.user }]
                }
                return filtered
            })
        }

        const handleUserLeft = ({ socketId }) => {
            setUsers(prev => prev.filter(u => u.socketId !== socketId))
        }

        onSocketReady((s) => {
            if (joinedRef.current) return
            joinedRef.current = true
            socketRef.current = s

            console.log("Emitting join-room:", roomId, user.id)
            s.emit("join-room", { roomId, userId: user.id, username: user.username })

            // Apna awareness emit karo join hone ke baad
            setTimeout(() => {
                s.emit(SOCKET_EVENTS.AWARENESS_UPDATE, {
                    roomId,
                    awarenessState: {
                        user: {
                            username: user.username,
                            userId: user.id,
                        }
                    }
                })
            }, 500)

            s.on(SOCKET_EVENTS.YJS_SYNC, handleSync)
            s.on(SOCKET_EVENTS.YJS_UPDATE, handleUpdate)
            s.on(SOCKET_EVENTS.AWARENESS_UPDATE, handleAwareness)
            s.on(SOCKET_EVENTS.USER_LEFT, handleUserLeft)
        })

        const handleYjsUpdate = (update) => {
            if (isRemoteUpdate.current) return
            const s = socketRef.current
            if (s) s.emit(SOCKET_EVENTS.YJS_UPDATE, Array.from(update))
        }

        ydoc.on("update", handleYjsUpdate)

        return () => {
            const s = socketRef.current
            if (s) {
                s.off(SOCKET_EVENTS.YJS_SYNC, handleSync)
                s.off(SOCKET_EVENTS.YJS_UPDATE, handleUpdate)
                s.off(SOCKET_EVENTS.AWARENESS_UPDATE, handleAwareness)
                s.off(SOCKET_EVENTS.USER_LEFT, handleUserLeft)
            }
            ydoc.off("update", handleYjsUpdate)
            ydoc.destroy()
        }
    }, [roomId, user?.id])

    const handleMount = (editor) => {
        editorRef.current = editor
        bindingRef.current = new MonacoBinding(
            yText,
            editor.getModel(),
            new Set([editor]),
        )
    }

    return { handleMount, users, yText }
}