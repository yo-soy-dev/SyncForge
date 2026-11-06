// Pure state for the video call UI. No browser APIs, so it can be tested with plain Node.

export const initialCallState = {
  status: "idle",        // idle | joining | joined
  you: null,
  peers: {},             // socketId -> { ...peer, stream, connection }
  localStream: null,
  canCamera: false,      // false when we joined without a camera: turning one on later would need renegotiation
  muted: { audio: false, video: false },
  sharingId: null,        // socketId of whoever is sharing their screen
  screenSharing: false,   // are WE sharing
  error: null,           // { code, message } — the call could not be joined
  notice: null,          // a non-fatal message
}

const withPeer = (state, socketId, patch) =>
  state.peers[socketId] ? { ...state, peers: { ...state.peers, [socketId]: { ...state.peers[socketId], ...patch } } } : state

export const callReducer = (state, a) => {
  switch (a.type) {
    case "joining": return { ...initialCallState, status: "joining" }
    case "joined":
      return {
        ...state, status: "joined", you: a.you, error: null,
        peers: Object.fromEntries(a.peers.map((p) => [p.socketId, { ...p, stream: null, connection: "new" }])),
      }
    case "peer-added": return { ...state, peers: { ...state.peers, [a.peer.socketId]: { ...a.peer, stream: null, connection: "new" } } }
    case "peer-removed": {
      const peers = { ...state.peers }
      delete peers[a.socketId]
      return { ...state, peers, sharingId: state.sharingId === a.socketId ? null : state.sharingId }
    }
    case "peer-stream": return withPeer(state, a.socketId, { stream: a.stream })
    case "peer-connection": return withPeer(state, a.socketId, { connection: a.state })
    case "peer-media": return withPeer(state, a.socketId, { audio: a.audio, video: a.video })
       case "local-stream": return { ...state, localStream: a.stream }
    case "local-capabilities": return { ...state, canCamera: !!a.camera }
    case "local-muted": return { ...state, muted: { audio: a.audio, video: a.video } }
    case "screen-state":
      return {
        ...withPeer(state, a.socketId, { sharing: a.sharing }),
        sharingId: a.sharing ? a.socketId : state.sharingId === a.socketId ? null : state.sharingId,
      }
    case "local-screen": return { ...state, screenSharing: !!a.sharing }
    case "notice": return { ...state, notice: a.message }
    case "error": return { ...initialCallState, error: { code: a.code || "ERROR", message: a.message || "Something went wrong" } }
    case "left": return { ...initialCallState, notice: a.reason === "disconnected" ? "You were disconnected from the call." : null }
    default: return state
  }
}

export const peerList = (state) =>
  Object.values(state.peers).sort((x, y) => String(x.username).localeCompare(String(y.username)))

// Free public STUN servers by default. Override with a JSON array (e.g. to add your own TURN server).
export const DEFAULT_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
]

export const parseIceServers = (raw) => {
  if (!raw) return DEFAULT_ICE_SERVERS
  try {
    const parsed = JSON.parse(raw)
    const ok = Array.isArray(parsed) && parsed.length > 0 &&
      parsed.every((s) => s && (typeof s.urls === "string" || (Array.isArray(s.urls) && s.urls.every((u) => typeof u === "string"))))
    return ok ? parsed : DEFAULT_ICE_SERVERS
  } catch {
    return DEFAULT_ICE_SERVERS
  }
}