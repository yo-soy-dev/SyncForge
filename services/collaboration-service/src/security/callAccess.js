// Pure rules for the video call (no sockets, no network) so they can be tested directly.

export const MAX_CALL_PEERS = 6            // plain peer-to-peer mesh: every extra person adds a connection to everyone
export const MAX_SDP_CHARS = 20_000
export const MAX_CANDIDATE_CHARS = 2_000
export const MAX_SIGNALS_PER_MINUTE = 600  // an ICE burst is ~50 messages per peer connection

// What the other people in the call see next to your name.
export const callLabelFor = ({ room, userId, role }) => {
  if (role === "viewer") return "observer"
  if (room?.type === "interview") {
    const candidateId = room.interview?.candidateId
    return candidateId && String(candidateId) === String(userId) ? "candidate" : "interviewer"
  }
  return "participant"
}

// Pure: may this person join the call right now? `access` comes from room-service (fresh, not cached).
export const evaluateCallJoin = ({ access, peerCount, alreadyInCall }) => {
  if (!access) return { error: { code: "FORBIDDEN", message: "No access to this room" } }
  if (access.room?.type === "interview" && access.room.interview?.status === "ended") {
    return { error: { code: "CALL_CLOSED", message: "The interview has ended" } }
  }
  if (!alreadyInCall && peerCount >= MAX_CALL_PEERS) {
    return { error: { code: "CALL_FULL", message: `The call is full (max ${MAX_CALL_PEERS} people)` } }
  }
  // Observers watch and listen only.
  return { ok: true, publish: access.role !== "viewer" }
}

// Pure: returns a cleaned signaling payload, or null when it is not a well-formed offer/answer/candidate.
// Only these fields are ever relayed; anything else the client sent is dropped.
export const validateSignal = (data) => {
  if (!data || typeof data !== "object") return null
  if (data.type === "offer" || data.type === "answer") {
    if (typeof data.sdp !== "string" || !data.sdp || data.sdp.length > MAX_SDP_CHARS) return null
    return { type: data.type, sdp: data.sdp }
  }
  if (data.type === "candidate") {
    const c = data.candidate
    if (!c || typeof c !== "object") return null
    if (typeof c.candidate !== "string" || c.candidate.length > MAX_CANDIDATE_CHARS) return null
    const sdpMid = c.sdpMid === null || c.sdpMid === undefined ? null : c.sdpMid
    if (sdpMid !== null && (typeof sdpMid !== "string" || sdpMid.length > 64)) return null
    const idx = c.sdpMLineIndex === undefined ? null : c.sdpMLineIndex
    if (idx !== null && !(Number.isInteger(idx) && idx >= 0 && idx < 64)) return null
    return { type: "candidate", candidate: { candidate: c.candidate, sdpMid, sdpMLineIndex: idx } }
  }
  return null
}

// Sliding-window limiter: returns a function that says whether one more message is allowed.
export const createRateLimiter = ({ max = MAX_SIGNALS_PER_MINUTE, windowMs = 60_000, now = Date.now } = {}) => {
  let stamps = []
  return () => {
    const t = now()
    stamps = stamps.filter((s) => t - s < windowMs)
    if (stamps.length >= max) return false
    stamps.push(t)
    return true
  }
}