import { isObjectId } from "./access.js"

export const INTERVIEW_STATUS = ["scheduled", "live", "ended"]
const NEXT = { scheduled: ["live", "ended"], live: ["ended"], ended: [] }

// Pure: validates an owner's interview patch and returns { set } (a Mongo $set map)
// or { error }. Nothing here touches the database.
export const applyInterviewPatch = (room, patch = {}, now = new Date()) => {
  if (room.type !== "interview") return { error: "Not an interview room" }
  const iv = room.interview || {}
  const set = {}
  const allowed = ["candidateId", "locked", "status", "durationMin", "finalText", "aiAssist"]
  for (const k of Object.keys(patch)) {
    if (!allowed.includes(k)) return { error: `Unknown field: ${k}` }
  }
  if (iv.status === "ended") return { error: "Interview has ended" }

  if (patch.candidateId !== undefined) {
    if (iv.status !== "scheduled") return { error: "Candidate can only be set before the interview starts" }
    if (!isObjectId(patch.candidateId)) return { error: "Invalid candidateId" }
    if (String(room.owner) === patch.candidateId) return { error: "The owner cannot be the candidate" }
    if (!(room.members || []).some((m) => String(m.userId) === patch.candidateId)) {
      return { error: "Candidate must be a room member" }
    }
    set["interview.candidateId"] = patch.candidateId
  }

  if (patch.locked !== undefined) {
    if (typeof patch.locked !== "boolean") return { error: "locked must be true or false" }
    set["interview.locked"] = patch.locked
  }

  if (patch.aiAssist !== undefined) {
    if (typeof patch.aiAssist !== "boolean") return { error: "aiAssist must be true or false" }
    set["interview.aiAssist"] = patch.aiAssist
  }

  if (patch.durationMin !== undefined) {
    const d = patch.durationMin
    if (!Number.isInteger(d) || d < 5 || d > 240) return { error: "durationMin must be 5-240" }
    set["interview.durationMin"] = d
  }

  if (patch.status !== undefined) {
    if (!INTERVIEW_STATUS.includes(patch.status)) return { error: "Invalid status" }
    if (!NEXT[iv.status || "scheduled"].includes(patch.status)) {
      return { error: `Cannot go from ${iv.status || "scheduled"} to ${patch.status}` }
    }
    const candidate = set["interview.candidateId"] ?? iv.candidateId
    if (patch.status === "live" && !candidate) return { error: "Set a candidate before starting" }
    set["interview.status"] = patch.status
    if (patch.status === "live") set["interview.startedAt"] = now
    if (patch.status === "ended") set["interview.endedAt"] = now
  }

  if (patch.finalText !== undefined && patch.status !== "ended") {
    return { error: "finalText is only accepted when ending the interview" }
  }
  return { set, finalText: patch.finalText }
}




// Pure: decides what happens when someone joins with a candidate/observer code.
// kind: "candidate" | "observer". Returns { action: "join" | "rejoin" | "reject", message?, status? }.
export const decideInterviewJoin = (room, kind, userId) => {
  const uid = String(userId)
  const iv = room.interview || {}
  const member = (room.members || []).find((m) => String(m.userId) === uid)
  const isOwner = String(room.owner) === uid

  if (iv.status === "ended") return { action: "reject", message: "This interview has ended", status: 409 }

  if (kind === "candidate") {
    if (iv.candidateId) {
      return String(iv.candidateId) === uid
        ? { action: "rejoin" }
        : { action: "reject", message: "This candidate link has already been used", status: 409 }
    }
    if (member || isOwner) {
      return { action: "reject", message: "You are already in this room and cannot become the candidate", status: 409 }
    }
    return { action: "join" }
  }

  // observer
  if (isOwner) return { action: "reject", message: "You own this room", status: 409 }
  if (member) {
    return member.role === "viewer"
      ? { action: "rejoin" }
      : { action: "reject", message: "You are already in this room with a different role", status: 409 }
  }
  return { action: "join" }
}

// Pure: what a given viewer may see of a room. In interview rooms only the owner sees join codes,
// so a candidate or observer cannot hand out the others' links.
export const sanitizeRoomForViewer = (room, role) => {
  if (!room || room.type !== "interview" || role === "owner") return room
  const { code, ...rest } = room
  const { candidateCode, observerCode, ...interview } = room.interview || {}
  return { ...rest, interview }
}