export const OBJECT_ID = /^[a-f0-9]{24}$/i
export const isObjectId = (v) => typeof v === "string" && OBJECT_ID.test(v)

export const ROLES = ["editor", "viewer"] // owner is implicit (room.owner)

// Returns "owner" | "editor" | "viewer" | null (null = not a member).
// Members stored before roles existed have no role => treated as editor.
export const roleFor = (room, userId) => {
  if (!room || !userId || room.isActive === false) return null
  const uid = String(userId)
  if (String(room.owner) === uid) return "owner"
  const m = (room.members || []).find((x) => String(x.userId) === uid)
  if (!m) return null
  return m.role === "viewer" ? "viewer" : "editor"
}

export const canWrite = (role) => role === "owner" || role === "editor"

// Identity comes ONLY from headers set by the gateway (verified token).
export const getIdentity = (req) => {
  const userId = req.headers["x-user-id"]
  let username = "Anonymous"
  try {
    const raw = req.headers["x-user-data"]
    if (raw) username = JSON.parse(decodeURIComponent(raw)).username || username
  } catch { /* ignore malformed header */ }
  return { userId: isObjectId(userId) ? userId : null, username }
}







export const ROOM_TYPES = ["collab", "interview"]

export const isCandidate = (room, userId) =>
  room?.type === "interview" &&
  !!room.interview?.candidateId &&
  String(room.interview.candidateId) === String(userId)


export const canWriteNow = (room, userId) => {
  if (!canWrite(roleFor(room, userId))) return false
  if (room.type === "interview") {
    const iv = room.interview || {}
    if (iv.status === "ended") return false
    if (isCandidate(room, userId) && (iv.status !== "live" || iv.locked)) return false
  }
  return true
}


// Interviewers = owner + editor members of an interview room, excluding the candidate.
export const isInterviewer = (room, userId) =>
  room?.type === "interview" && canWrite(roleFor(room, userId)) && !isCandidate(room, userId)




// Whether this user may ask the AI for edit suggestions right now.
// Suggestions are only useful to someone who can accept them, so write access is required.
// Interview rooms additionally need the owner to switch AI assistance on (off by default).
export const canUseAI = (room, userId) => {
  if (!canWriteNow(room, userId)) return false
  if (room.type === "interview") return room.interview?.aiAssist === true
  return true
}



// Whether this user may use ANY AI assistance in the room (review, explain, chat, fix, suggest).
// Collaboration rooms: members only (viewers may ask for explanations). Interview rooms: only when the
// owner switched AI on and the user can currently edit, i.e. exactly canUseAI.
export const canAskAI = (room, userId) => {
  if (!roleFor(room, userId)) return false
  if (room.type === "interview") return canUseAI(room, userId)
  return true
}