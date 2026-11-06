import { useEffect, useRef } from "react"
import { roomApi } from "../services/api"

/* Saves a snapshot every `everyMs` while enabled, only if the text changed. */
export const useAutoSnapshot = ({ roomId, language, enabled, getText, everyMs = 90_000 }) => {
  const last = useRef(null)
  const getRef = useRef(getText)
  getRef.current = getText

  useEffect(() => {
    if (!enabled) return
    const tick = async () => {
      const text = getRef.current?.() ?? ""
      if (!text.trim() || text === last.current) return
      try {
        await roomApi.createSnapshot(roomId, { text, language, kind: "auto" })
        last.current = text
      } catch {
        /* best effort: a missed auto-snapshot must never bother the user */
      }
    }
    const id = setInterval(tick, everyMs)
    return () => clearInterval(id)
  }, [roomId, language, enabled, everyMs])
}