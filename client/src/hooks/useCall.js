import { useCallback, useEffect, useReducer, useRef } from "react"
import { getSocket } from "../services/socket"
import { createCallClient } from "../services/callClient"
import { callReducer, initialCallState, parseIceServers } from "../utils/callState"
import { getDevicePrefs } from "./useMediaDevices"

// The server sends ICE servers (with short-lived TURN credentials) when you join.
// This is only a fallback for local development.
const FALLBACK_ICE = parseIceServers(import.meta.env.VITE_ICE_SERVERS)
// Set VITE_FORCE_RELAY=true to prove your TURN server works: calls then connect ONLY through TURN.
const FORCE_RELAY = import.meta.env.VITE_FORCE_RELAY === "true"

// The call lives in the Room page (not in a panel), so closing the panel does not hang up.
export const useCall = ({ roomId }) => {
  const [state, dispatch] = useReducer(callReducer, initialCallState)
  const holder = useRef({ client: null, busy: false })

  const join = useCallback(async () => {
    const h = holder.current
    if (h.busy) return
    const socket = getSocket()
    if (!socket?.connected) {
      dispatch({ type: "error", code: "NOT_CONNECTED", message: "Not connected to the room yet. Try again in a moment." })
      return
    }
    h.busy = true
    try {
      h.client?.leave()
      const client = createCallClient({
        socket,
        iceServers: FALLBACK_ICE,
        forceRelay: FORCE_RELAY,
        getDevicePrefs,
        onEvent: dispatch,
      })
      h.client = client
      await client.join()
    } finally {
      h.busy = false
    }
  }, [])

  const leave = useCallback(() => {
    holder.current.client?.leave()
    holder.current.client = null
  }, [])

  const rejoin = useCallback(async () => {
    leave()
    await join()
  }, [leave, join])

  const setMuted = useCallback((m) => holder.current.client?.setMuted(m), [])
    const switchDevice = useCallback((kind, id) => holder.current.client?.switchDevice(kind, id), [])
  const startScreen = useCallback(() => holder.current.client?.startScreen(), [])
  const stopScreen = useCallback(() => holder.current.client?.stopScreen(), [])

  // Leaving the room page (or switching rooms) ends the call and releases the camera.
  useEffect(() => {
    const h = holder.current
    return () => { h.client?.leave(); h.client = null }
  }, [roomId])

  return { state, join, leave, rejoin, setMuted, switchDevice, startScreen, stopScreen }
}