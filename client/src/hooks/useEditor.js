// import { useEffect, useRef, useMemo, useState, useCallback } from "react"
// import * as Y from "yjs"
// import { MonacoBinding } from "y-monaco"
// import { useSocket } from "./useSocket"
// import { SOCKET_EVENTS } from "../utils/constants"
// import { useAuth } from "../context/AuthContext"

// export const useEditor = (roomId) => {
//     const editorRef = useRef(null)
//     const bindingRef = useRef(null)
//     const isRemoteUpdate = useRef(false)
//     const [users, setUsers] = useState([])
//     const { user } = useAuth()
//     const { socket, joinRoom, sendUpdate, on } = useSocket(roomId)

//     const ydoc = useMemo(() => new Y.Doc(), [roomId])
//     const yText = useMemo(() => ydoc.getText("monaco"), [ydoc])

//     useEffect(() => {
//         if (!user || !roomId) return
//         if (!socket) return

//         // joinRoom(user.id, user.username)
//         if (socket.connected) {
//             joinRoom(user.id, user.username)
//         } else {
//             // Connected hone ka wait karo
//             socket.once("connect", () => {
//                 joinRoom(user.id, user.username)
//             })
//         }

//         // ? Server se initial sync � poora content
//         const offSync = on(SOCKET_EVENTS.YJS_SYNC, (stateUpdate) => {
//             try {
//                 isRemoteUpdate.current = true
//                 const update = Array.isArray(stateUpdate)
//                     ? new Uint8Array(stateUpdate)
//                     : stateUpdate instanceof Uint8Array
//                         ? stateUpdate
//                         : new Uint8Array(Object.values(stateUpdate))
//                 Y.applyUpdate(ydoc, update)
//                 console.log("YJS_SYNC received � size:", update.length)
//             } catch (e) {
//                 console.error("YJS_SYNC apply error:", e)
//             } finally {
//                 isRemoteUpdate.current = false
//             }
//         })

//         // ? Doosre users ke updates
//         const offUpdate = on(SOCKET_EVENTS.YJS_UPDATE, (update) => {
//             try {
//                 isRemoteUpdate.current = true
//                 const u = Array.isArray(update)
//                     ? new Uint8Array(update)
//                     : update instanceof Uint8Array
//                         ? update
//                         : new Uint8Array(Object.values(update))
//                 Y.applyUpdate(ydoc, u)
//             } catch (e) {
//                 console.error("YJS_UPDATE apply error:", e)
//             } finally {
//                 isRemoteUpdate.current = false
//             }
//         })

//         const offAwareness = on(SOCKET_EVENTS.AWARENESS_UPDATE, ({ socketId, awarenessState }) => {
//             setUsers(prev => {
//                 const filtered = prev.filter(u => u.socketId !== socketId)
//                 if (awarenessState?.user) {
//                     return [...filtered, { socketId, ...awarenessState.user }]
//                 }
//                 return filtered
//             })
//         })

//         const offLeft = on(SOCKET_EVENTS.USER_LEFT, ({ socketId }) => {
//             setUsers(prev => prev.filter(u => u.socketId !== socketId))
//         })

//         const handleUpdate = (update) => {
//             if (isRemoteUpdate.current) return
//             sendUpdate(Array.from(update))
//         }

//         ydoc.on("update", handleUpdate)

//         return () => {
//             offSync()
//             offUpdate()
//             offAwareness()
//             offLeft()
//             ydoc.off("update", handleUpdate)
//             ydoc.destroy()
//         }
//     }, [roomId, user])

//     const handleMount = (editor) => {
//         editorRef.current = editor
//         bindingRef.current = new MonacoBinding(
//             yText,
//             editor.getModel(),
//             new Set([editor]),
//         )
//     }

//     return { handleMount, users, yText }
// }





import { useEffect, useRef, useMemo, useState } from "react"
import * as Y from "yjs"
import { MonacoBinding } from "y-monaco"
import { useSocket } from "./useSocket"
import { SOCKET_EVENTS } from "../utils/constants"
import { useAuth } from "../context/AuthContext"

export const useEditor = (roomId) => {
    const editorRef = useRef(null)
    const bindingRef = useRef(null)
    const isRemoteUpdate = useRef(false)
    const [users, setUsers] = useState([])
    const { user } = useAuth()
    const { socket, joinRoom, sendUpdate, on } = useSocket(roomId)

    const ydoc = useMemo(() => new Y.Doc(), [roomId])
    const yText = useMemo(() => ydoc.getText("monaco"), [ydoc])

    useEffect(() => {
        if (!user || !roomId || !socket) return

        const doJoin = () => joinRoom(user.id, user.username)

        if (socket.connected) {
            doJoin()
        } else {
            socket.once("connect", doJoin)
        }

        const offSync = on(SOCKET_EVENTS.YJS_SYNC, (stateUpdate) => {
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
        })

        const offUpdate = on(SOCKET_EVENTS.YJS_UPDATE, (update) => {
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
        })

        const offAwareness = on(SOCKET_EVENTS.AWARENESS_UPDATE, ({ socketId, awarenessState }) => {
            setUsers(prev => {
                const filtered = prev.filter(u => u.socketId !== socketId)
                if (awarenessState?.user) {
                    return [...filtered, { socketId, ...awarenessState.user }]
                }
                return filtered
            })
        })

        const offLeft = on(SOCKET_EVENTS.USER_LEFT, ({ socketId }) => {
            setUsers(prev => prev.filter(u => u.socketId !== socketId))
        })

        const handleUpdate = (update) => {
            if (isRemoteUpdate.current) return
            sendUpdate(Array.from(update))
        }

        ydoc.on("update", handleUpdate)

        return () => {
            socket.off("connect", doJoin)  // ← cleanup listener
            offSync()
            offUpdate()
            offAwareness()
            offLeft()
            ydoc.off("update", handleUpdate)
            ydoc.destroy()
        }
    }, [roomId, user, socket])  // ← socket add kiya

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