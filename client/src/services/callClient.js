// WebRTC mesh call client. Browser APIs are injected so the whole offer/answer exchange can be tested with fakes.
// Rules:
//  - The person who JOINS sends the offers; people already in the call only answer (no offer collisions).
//  - Only the side that made the offer restarts ICE on failure.
//  - Observers (publish:false) never send media, and their media is never rendered.
//  - Two people who both do not publish never connect to each other.

const AUDIO = { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
const VIDEO = { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } }
const EARLY_SIGNAL_MS = 3000
const DISCONNECT_GRACE_MS = 4000
const MAX_RESTARTS = 3
const MAX_VIDEO_BITRATE = 600_000
const MAX_SCREEN_BITRATE = 1_500_000 // text on a screen needs more than a face does // mesh: every extra person multiplies upload, so keep each stream modest
const FATAL_CODES = new Set(["CALL_CLOSED", "ACCESS_REVOKED"])

// "ideal", not "exact": if the remembered device is unplugged we fall back to the default instead of failing.
const constraintsFor = (prefs = {}, { audio = true, video = true } = {}) => ({
  ...(audio ? { audio: { ...AUDIO, ...(prefs.micId ? { deviceId: { ideal: prefs.micId } } : {}) } } : {}),
  ...(video ? { video: { ...VIDEO, ...(prefs.camId ? { deviceId: { ideal: prefs.camId } } : {}) } } : {}),
})

export const describeMediaError = (err) => {
  switch (err?.name) {
    case "NotAllowedError": return "Camera and microphone access is blocked. Allow it in your browser's address bar, then rejoin."
    case "NotFoundError": return "No camera or microphone was found."
    case "NotReadableError": return "Your camera or microphone is being used by another app."
    case "OverconstrainedError": return "That device is no longer available."
    default: return "Could not start your camera or microphone."
  }
}

export const createCallClient = ({
  socket,
  iceServers,
  forceRelay = false,
  getDisplayMedia = (constraints) => navigator.mediaDevices.getDisplayMedia(constraints),
  getDevicePrefs = () => ({}),                              // { micId, camId } chosen by the user
  createStream = (tracks) => new MediaStream(tracks),       // a NEW stream object makes React re-attach the <video>
  onEvent,
  createPeerConnection = (config) => new RTCPeerConnection(config),
  getUserMedia = (constraints) => navigator.mediaDevices.getUserMedia(constraints),
}) => {
  const pcs = new Map()        // socketId -> RTCPeerConnection
  const queued = new Map()     // socketId -> ICE candidates that arrived before the remote description
  const early = new Map()      // socketId -> signals from someone not announced yet
  const peers = new Map()      // socketId -> peer info from the server
  const offered = new Set()    // peers we sent the offer to (we are the ones who restart ICE for them)
  const restarts = new Map()
  const remoteStreams = new Map() // socketId -> one MediaStream built from that person's tracks
  const timers = new Map()
  let ice = iceServers         // replaced by the server's list (with short-lived TURN credentials) on join
  let me = null
  let local = null
  let joined = false
  let screen = null            // { track, cameraWasOn } while WE share our screen
  let hadVideo = false         // joined WITH a camera: only then can we turn it off and on again
  let ready = Promise.resolve()
  const handlers = {}

  const send = (to, data) => socket.emit("call-signal", { to, data })
  const wantsConnection = (peer) => !!(me?.publish || peer?.publish)
  const localTracks = () => (local ? local.getTracks() : [])

  const announceMedia = () => {
    const on = (kind) => localTracks().some((t) => t.kind === kind && t.enabled)
    socket.emit("call-media-state", { audio: on("audio"), video: on("video") })
  }

  // Add our tracks once. A re-offer (ICE restart) must not add them again.
  const addLocal = (pc) => {
    const senders = pc.getSenders?.() ?? []
    for (const t of localTracks()) if (!senders.some((s) => s.track === t)) pc.addTrack(t, local)
  }

  // Publishers must be able to SEND video even with no camera: a screen share is just replaceTrack.
  const allowVideoSend = (pc) => {
    if (!me?.publish) return
    for (const t of pc.getTransceivers?.() ?? []) {
      if (t.receiver?.track?.kind === "video" && t.direction === "recvonly") t.direction = "sendrecv"
    }
  }

  const videoSender = (pc) => (pc.getTransceivers?.() ?? []).find((t) => t.receiver?.track?.kind === "video")?.sender

  // Someone who joins while we are sharing must receive the screen too.
  const attachScreen = (pc) => {
    if (screen) videoSender(pc)?.replaceTrack(screen.track).catch(() => { })
  }

  const retune = (bitrate) => Promise.all([...pcs.values()].map((pc) => capBitrate(pc, bitrate)))

  const capBitrate = async (pc, bitrate = MAX_VIDEO_BITRATE) => {
    for (const s of pc.getSenders?.() ?? []) {
      if (s.track?.kind !== "video" || !s.getParameters) continue
      try {
        const p = s.getParameters()
        p.encodings = p.encodings?.length ? p.encodings : [{}]
        p.encodings[0].maxBitrate = bitrate
        await s.setParameters(p)
      } catch { /* not supported yet: fine */ }
    }
  }

  const restartIce = async (id) => {
    const pc = pcs.get(id)
    if (!pc || !joined || pc.connectionState === "connected") return
    const n = (restarts.get(id) || 0) + 1
    restarts.set(id, n)
    if (n > MAX_RESTARTS) {
      onEvent({ type: "notice", message: "Could not reconnect to someone. Leave and rejoin the call." })
      return
    }
    try {
      const offer = await pc.createOffer({ iceRestart: true })
      await pc.setLocalDescription(offer)
      send(id, { type: "offer", sdp: (pc.localDescription || offer).sdp })
    } catch { /* the next state change tries again */ }
  }

  const createPc = (id) => {
    const pc = createPeerConnection({ iceServers: ice, ...(forceRelay ? { iceTransportPolicy: "relay" } : {}) })
    pcs.set(id, pc)
    pc.onicecandidate = (e) => {
      if (e.candidate) send(id, { type: "candidate", candidate: typeof e.candidate.toJSON === "function" ? e.candidate.toJSON() : e.candidate })
    }
    pc.ontrack = (e) => {
      // Observers do not publish: never render a stream that claims to come from one.
      if (peers.get(id)?.publish === false) return
      // The sender may have no stream (e.g. a screen share from someone with no camera), so we build one
      // per person from their tracks. A NEW object each time makes React re-attach the <video>.
      const known = remoteStreams.get(id)?.getTracks() ?? []
      if (known.includes(e.track)) return
      const stream = createStream([...known, e.track])
      remoteStreams.set(id, stream)
      onEvent({ type: "peer-stream", socketId: id, stream })
    }
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      onEvent({ type: "peer-connection", socketId: id, state })
      clearTimeout(timers.get(id)); timers.delete(id)
      if (state === "connected") { restarts.delete(id); return }
      if (!offered.has(id)) return // only the side that made the offer restarts: no offer collisions
      if (state === "failed") restartIce(id)
      else if (state === "disconnected") timers.set(id, setTimeout(() => restartIce(id), DISCONNECT_GRACE_MS))
    }
    return pc
  }

  const closePeer = (id) => {
    const pc = pcs.get(id)
    if (pc) { pc.onicecandidate = null; pc.ontrack = null; pc.onconnectionstatechange = null; pc.close() }
    clearTimeout(timers.get(id))
    pcs.delete(id); queued.delete(id); early.delete(id); timers.delete(id); offered.delete(id); restarts.delete(id); remoteStreams.delete(id)
  }

  const flushCandidates = async (id, pc) => {
    for (const c of queued.get(id) || []) { try { await pc.addIceCandidate(c) } catch { /* stale candidate */ } }
    queued.delete(id)
  }

  const connectTo = async (peer) => {
    if (!wantsConnection(peer)) return
    const pc = createPc(peer.socketId)
    offered.add(peer.socketId)
    // For each kind: send what we have, otherwise still RECEIVE it (e.g. we joined audio-only).
    for (const kind of ["audio", "video"]) {
      const track = localTracks().find((t) => t.kind === kind)
      if (track) pc.addTrack(track, local)
      else pc.addTransceiver(kind, { direction: kind === "video" && me.publish ? "sendrecv" : "recvonly" })
    }
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    send(peer.socketId, { type: "offer", sdp: (pc.localDescription || offer).sdp })
    capBitrate(pc)
  }

  const handleSignal = async ({ from, data }) => {
    if (!joined || !data) return
    if (!peers.has(from)) { // not announced yet: hold it briefly
      const list = early.get(from) || []
      list.push({ from, data })
      early.set(from, list)
      const timer = setTimeout(() => early.delete(from), EARLY_SIGNAL_MS)
      timer.unref?.()
      return
    }
    await ready // our own camera permission may still be pending
    if (!joined) return
    const peer = peers.get(from)

    if (data.type === "offer") {
      if (!wantsConnection(peer)) return // two non-publishers never connect
      const pc = pcs.get(from) || createPc(from)
      await pc.setRemoteDescription({ type: "offer", sdp: data.sdp })
            addLocal(pc) // after the offer, so we answer on its m-lines
      allowVideoSend(pc)
      attachScreen(pc)
      await flushCandidates(from, pc)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      send(from, { type: "answer", sdp: (pc.localDescription || answer).sdp })
      capBitrate(pc)
    } else if (data.type === "answer") {
      const pc = pcs.get(from)
      if (!pc) return
      await pc.setRemoteDescription({ type: "answer", sdp: data.sdp })
      await flushCandidates(from, pc)
    } else if (data.type === "candidate") {
      const pc = pcs.get(from)
      if (!pc || !pc.remoteDescription) { queued.set(from, [...(queued.get(from) || []), data.candidate]); return }
      try { await pc.addIceCandidate(data.candidate) } catch { /* stale candidate */ }
    }
  }

  const bind = () => {
    handlers["call-peer-joined"] = (peer) => {
      peers.set(peer.socketId, peer)
      onEvent({ type: "peer-added", peer })
      for (const s of early.get(peer.socketId) || []) handleSignal(s)
      early.delete(peer.socketId)
    }
    handlers["call-peer-left"] = ({ socketId }) => { closePeer(socketId); peers.delete(socketId); onEvent({ type: "peer-removed", socketId }) }
    handlers["call-signal"] = (msg) => handleSignal(msg).catch((e) => onEvent({ type: "notice", message: `Connection problem: ${e.message}` }))
        handlers["call-screen-state"] = ({ socketId, sharing }) => onEvent({ type: "screen-state", socketId, sharing: !!sharing })
    handlers["call-media-state"] = ({ socketId, audio, video }) => {
      const p = peers.get(socketId); if (p) { p.audio = audio; p.video = video }
      onEvent({ type: "peer-media", socketId, audio, video })
    }
    handlers["call-error"] = ({ code, message }) => {
      if (FATAL_CODES.has(code)) { cleanup(); onEvent({ type: "error", code, message }); return } // the server removed us
      onEvent({ type: "notice", message: message || "Call error" })
    }
    handlers["disconnect"] = () => { cleanup(); onEvent({ type: "left", reason: "disconnected" }) }
    for (const [ev, fn] of Object.entries(handlers)) socket.on(ev, fn)
  }

  const unbind = () => { for (const [ev, fn] of Object.entries(handlers)) socket.off(ev, fn) }

  function cleanup() {
    unbind()
    for (const id of [...pcs.keys()]) closePeer(id)
    localTracks().forEach((t) => t.stop())
        if (screen) { screen.track.onended = null; screen.track.stop(); screen = null }
    local = null; me = null; joined = false; hadVideo = false
    peers.clear(); early.clear(); queued.clear(); offered.clear(); restarts.clear()
  }

  // Full-quality first; if the camera is the problem, fall back to audio only (not to nothing).
  const acquire = async () => {
    const prefs = getDevicePrefs()
    try {
      const stream = await getUserMedia(constraintsFor(prefs))
      hadVideo = stream.getTracks().some((t) => t.kind === "video")
      return { stream, note: null, camera: hadVideo }
    } catch (err) {
      if (err?.name === "NotAllowedError") throw err // blocked: don't retry silently
      const stream = await getUserMedia(constraintsFor(prefs, { video: false }))
      hadVideo = false
      return { stream, note: "Camera unavailable. You joined with audio only.", camera: false }
    }
  }

  const join = async () => {
    onEvent({ type: "joining" })
    const res = await new Promise((resolve) => socket.emit("call-join", {}, resolve))
    if (!res?.ok) {
      onEvent({ type: "error", code: res?.code || "JOIN_FAILED", message: res?.message || "Could not join the call" })
      return false
    }
    me = res.you
    joined = true
    if (Array.isArray(res.iceServers) && res.iceServers.length) ice = res.iceServers
    res.peers.forEach((p) => peers.set(p.socketId, p))
    let markReady
    ready = new Promise((r) => { markReady = r })
    bind()
    onEvent({ type: "joined", you: me, peers: res.peers })

    if (me.publish) {
      try {
        const { stream, note, camera } = await acquire()
        local = stream
        onEvent({ type: "local-stream", stream: local })
        onEvent({ type: "local-capabilities", camera })
        if (note) onEvent({ type: "notice", message: note })
        announceMedia()
      } catch (err) {
        local = null
        onEvent({ type: "notice", message: `${describeMediaError(err)} You joined as a listener.` })
      }
    }
    markReady()
    await Promise.all(res.peers.map((p) => connectTo(p).catch((e) => onEvent({ type: "notice", message: `Could not connect to ${p.username}: ${e.message}` }))))
    return true
  }

  const leave = () => {
    if (!joined) return
    socket.emit("call-leave")
    cleanup()
    onEvent({ type: "left" })
  }

  // The senders of one kind, across every connection. replaceTrack() swaps media without renegotiating.
  const sendersOf = (kind) =>
    [...pcs.values()].flatMap((pc) =>
      (pc.getTransceivers?.() ?? []).filter((t) => t.receiver?.track?.kind === kind).map((t) => t.sender),
    )

  const publishFrom = (tracks) => {
    local = createStream(tracks)
    onEvent({ type: "local-stream", stream: local })
  }

  const reportMuted = () => {
    const on = (kind) => localTracks().some((t) => t.kind === kind && t.enabled)
    announceMedia()
    onEvent({ type: "local-muted", audio: !on("audio"), video: !on("video") })
  }

  // off === true: STOP the camera (the hardware light goes out) and send nothing.
  // off === false: get the camera again and swap it into every connection.
  const setCamera = async (off) => {
    if (!local) return
    if (off) {
      localTracks().filter((t) => t.kind === "video").forEach((t) => t.stop())
      await Promise.all(sendersOf("video").map((s) => s.replaceTrack(null).catch(() => { })))
      publishFrom(localTracks().filter((t) => t.kind !== "video"))
      return
    }
    try {
      const stream = await getUserMedia(constraintsFor(getDevicePrefs(), { audio: false }))
      const track = stream.getTracks().find((t) => t.kind === "video")
      await Promise.all(sendersOf("video").map((s) => s.replaceTrack(track).catch(() => { })))
      publishFrom([...localTracks().filter((t) => t.kind === "audio"), track])
    } catch (err) {
      onEvent({ type: "notice", message: describeMediaError(err) })
    }
  }

   const stopScreen = async () => {
    if (!screen) return
    const { track, cameraWasOn } = screen
    screen = null
    track.onended = null
    track.stop()
    socket.emit("call-screen-stop")
    await Promise.all(sendersOf("video").map((s) => s.replaceTrack(null).catch(() => {})))
    onEvent({ type: "local-screen", sharing: false })
    if (cameraWasOn && joined) await setCamera(false) // the camera comes back if it was on before
    await retune(MAX_VIDEO_BITRATE)
    reportMuted()
  }

  const startScreen = async () => {
    if (!joined || !me?.publish || screen) return false

    // Must run straight from the click: browsers only show the picker for a user gesture.
    let stream
    try {
      stream = await getDisplayMedia({ video: { frameRate: { ideal: 15, max: 30 } }, audio: false })
    } catch (err) {
      if (err?.name !== "NotAllowedError") onEvent({ type: "notice", message: "Could not start screen sharing." })
      return false // NotAllowedError = the person cancelled the picker: not an error
    }
    const track = stream.getVideoTracks()[0]
    if (!track) return false
    track.contentHint = "detail" // keeps text sharp

    const res = await new Promise((resolve) => socket.emit("call-screen-start", {}, resolve))
    if (!res?.ok || !joined) {
      track.stop()
      if (res?.ok) socket.emit("call-screen-stop") // we left while the picker was open
      else onEvent({ type: "notice", message: res?.message || "Could not start screen sharing." })
      return false
    }

    const cameraWasOn = localTracks().some((t) => t.kind === "video" && t.enabled)
    if (cameraWasOn) await setCamera(true) // the camera light goes off while sharing
    await Promise.all(sendersOf("video").map((s) => s.replaceTrack(track).catch(() => {})))
    screen = { track, cameraWasOn }
    track.onended = () => { stopScreen() } // the browser's own "Stop sharing" button
    await retune(MAX_SCREEN_BITRATE)
    reportMuted()
    onEvent({ type: "local-screen", sharing: true })
    return true
  }

  // video === true means "camera muted", the same meaning as before.
  const setMuted = async ({ audio, video }) => {
    if (audio !== undefined) for (const t of localTracks()) if (t.kind === "audio") t.enabled = !audio
        if (video !== undefined && screen) onEvent({ type: "notice", message: "Stop sharing your screen to use your camera." })
    else if (video !== undefined && hadVideo) await setCamera(video)
    reportMuted()
  }

  // Switch microphone or camera mid-call. The user picked it explicitly, so use "exact".
  const switchDevice = async (kind, deviceId) => {
    if (!local || !deviceId || (kind !== "audio" && kind !== "video")) return
    if (kind === "video" && !localTracks().some((t) => t.kind === "video")) return // camera is off: the saved choice is used when it comes back on
    try {
      const stream = await getUserMedia(
        kind === "audio"
          ? { audio: { ...AUDIO, deviceId: { exact: deviceId } } }
          : { video: { ...VIDEO, deviceId: { exact: deviceId } } },
      )
      const next = stream.getTracks().find((t) => t.kind === kind)
      const old = localTracks().filter((t) => t.kind === kind)
      if (kind === "audio" && old[0]) next.enabled = old[0].enabled // stay muted if we were muted
      await Promise.all(sendersOf(kind).map((s) => s.replaceTrack(next).catch(() => { })))
      old.forEach((t) => t.stop())
      publishFrom([...localTracks().filter((t) => t.kind !== kind), next])
      reportMuted()
    } catch (err) {
      onEvent({ type: "notice", message: describeMediaError(err) })
    }
  }

    return { join, leave, setMuted, switchDevice, startScreen, stopScreen, isJoined: () => joined }
}