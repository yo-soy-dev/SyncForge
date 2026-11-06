import { useEffect, useState } from "react"
import { getSocket, onSocketReady } from "../services/socket"

// "offline" | "joining" | "synced"
export const useConnection = () => {
  const [status, setStatus] = useState(() => (getSocket()?.connected ? "joining" : "offline"))

  useEffect(() => {
    const onSync = () => setStatus("synced")
    const onDrop = () => setStatus("offline")
    const offReady = onSocketReady((socket) => {
      setStatus("joining")
      socket.off("yjs-sync", onSync)
      socket.on("yjs-sync", onSync)
      socket.off("disconnect", onDrop)
      socket.on("disconnect", onDrop)
    })
    return () => {
      offReady()
      const s = getSocket()
      s?.off("yjs-sync", onSync)
      s?.off("disconnect", onDrop)
    }
  }, [])

  return status
}