import { useCallback, useEffect, useRef, useState } from "react"
import { describeMediaError } from "../services/callClient"

const KEY = "coduet:devices"

export const getDevicePrefs = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || localStorage.getItem("syncforge:devices")) || {}
  } catch {
    return {}
  }
}

const savePrefs = (prefs) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    /* storage unavailable: ignore */
  }
}

// Device lists + remembered choices. Labels stay empty until the browser has granted permission once.
export const useMediaDevices = () => {
  const [devices, setDevices] = useState({ mics: [], cams: [], speakers: [] })
  const [prefs, setPrefs] = useState(getDevicePrefs)

  const refresh = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    try {
      const list = await navigator.mediaDevices.enumerateDevices()
      setDevices({
        mics: list.filter((d) => d.kind === "audioinput"),
        cams: list.filter((d) => d.kind === "videoinput"),
        speakers: list.filter((d) => d.kind === "audiooutput"),
      })
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    refresh()
    navigator.mediaDevices?.addEventListener?.("devicechange", refresh) // plugged or unplugged
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", refresh)
  }, [refresh])

  const setPref = useCallback((key, value) => {
    setPrefs((p) => {
      const next = { ...p, [key]: value || undefined }
      savePrefs(next)
      return next
    })
  }, [])

  return { devices, prefs, setPref, refresh }
}

// Opt-in camera + microphone check before joining, with a microphone level (0 to 1).
export const useMediaPreview = ({ prefs, onReady }) => {
  const [stream, setStream] = useState(null)
  const [error, setError] = useState("")
  const [level, setLevel] = useState(0)
  const streamRef = useRef(null)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStream(null)
    setLevel(0)
  }, [])

  const start = useCallback(async () => {
    stop()
    setError("")
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, ...(prefs.micId ? { deviceId: { ideal: prefs.micId } } : {}) },
        video: { width: { ideal: 640 }, height: { ideal: 480 }, ...(prefs.camId ? { deviceId: { ideal: prefs.camId } } : {}) },
      })
      streamRef.current = s
      setStream(s)
      onReady?.()
    } catch (err) {
      setError(describeMediaError(err))
    }
  }, [prefs.micId, prefs.camId, stop, onReady])

  // Picking another device while the preview is running restarts it with that device.
  const running = useRef(false)
  running.current = !!stream
  useEffect(() => {
    if (running.current) start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.micId, prefs.camId])

  // Microphone level meter
  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) return
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)
    let raf
    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let peak = 0
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128))
      setLevel(Math.min(1, peak / 64))
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => {
      cancelAnimationFrame(raf)
      source.disconnect()
      ctx.close().catch(() => {})
    }
  }, [stream])

  useEffect(() => stop, [stop]) // release the camera when the panel unmounts

  return { stream, error, level, start, stop }
}