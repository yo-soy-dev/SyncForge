import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { getSocket, onSocketReady } from "../services/socket"

const MESSAGES = {
  LOCKED: "Editing is locked right now",
  READ_ONLY: "You have read-only access in this room",
  ACCESS_REVOKED: "You no longer have access to this room",
}

// Listens for the server's access decisions on the shared socket:
//   "room-role" { role, canWrite }  -> onRole()
//   "error"     { code, message }   -> toast (throttled) and onRevoked() for ACCESS_REVOKED
export const useRoomAccessEvents = ({ onRole, onRevoked }) => {
  const cb = useRef({ onRole, onRevoked })
  useEffect(() => {
    cb.current = { onRole, onRevoked }
  })
  const lastToast = useRef(0)

  useEffect(() => {
    let sock = null

    const onRoleEvent = (payload) => cb.current.onRole?.(payload)
    const onErrorEvent = (e) => {
      if (!MESSAGES[e?.code]) return
      if (Date.now() - lastToast.current > 4000) {
        lastToast.current = Date.now()
        toast.warning(MESSAGES[e.code])
      }
      if (e.code === "ACCESS_REVOKED") cb.current.onRevoked?.()
    }

    const attach = (s) => {
      sock = s
      s.on("room-role", onRoleEvent)
      s.on("error", onErrorEvent)
    }

    const existing = getSocket()
    if (existing) attach(existing)
    else onSocketReady(attach)

    return () => {
      sock?.off("room-role", onRoleEvent)
      sock?.off("error", onErrorEvent)
    }
  }, [])
}