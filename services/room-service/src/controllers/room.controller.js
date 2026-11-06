import * as roomService from "../services/room.service.js"
import { asyncHandler } from "../../shared/utils/asyncHandler.js"
import { createLogger } from "../../shared/utils/logger.js"
import { getIdentity, isObjectId, canWriteNow, canUseAI, canAskAI, roleFor, isInterviewer } from "../utils/access.js"
import { sanitizeRoomForViewer } from "../utils/interview.js"
import { validateScorecard } from "../utils/scorecard.js"
import { validateSummary } from "../utils/report.js"
import { validateSnapshotInput } from "../utils/snapshots.js"
import { keysMatch, validateCallEvent } from "../utils/callEvents.js"

const logger = createLogger("room-service")


export const createRoom = async (req, res) => {
  try {
    const { userId, username: verifiedName } = getIdentity(req)
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" })

    const room = await roomService.createRoom({
      name: req.body?.name,
      language: req.body?.language,
      type: req.body?.type,
      userId,
      username: verifiedName
    })

    logger.info("Room created", { roomId: room._id, userId })
    res.status(201).json({ success: true, room })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

export const joinRoom = async (req, res) => {
  try {
    const { userId, username: verifiedName } = getIdentity(req)
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" })

    const room = await roomService.joinRoom({
      code: req.body.code,
      userId,
      username: verifiedName
    })

    res.status(200).json({ success: true, room: sanitizeRoomForViewer(room, roleFor(room, userId)) })
  } catch (error) {
    res.status(error.status || 404).json({ success: false, message: error.message })
  }
}

export const getMyRooms = async (req, res) => {
  try {
    const { userId } = getIdentity(req)
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" })
    const rooms = (await roomService.getMyRooms(userId)).map((r) => sanitizeRoomForViewer(r, roleFor(r, userId)))
    res.status(200).json({ success: true, rooms })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getRoomById = async (req, res) => {
  const { userId } = getIdentity(req)
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" })
  if (!isObjectId(req.params.roomId)) {
    return res.status(400).json({ success: false, message: "Invalid room id" })
  }

  const access = await roomService.getRoomWithRole(req.params.roomId, userId)
  if (!access) return res.status(403).json({ success: false, message: "No access to this room" })

  res.status(200).json({
    success: true,
    room: sanitizeRoomForViewer(access.room, access.role),   
    role: access.role,
    canWrite: canWriteNow(access.room, userId),   
    canUseAI: canUseAI(access.room, userId),
    canAskAI: canAskAI(access.room, userId),
  })
}

export const deleteRoom = async (req, res) => {
  try {
    const { userId } = getIdentity(req)
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" })
    await roomService.deleteRoom(req.params.roomId, userId)
    res.status(200).json({ success: true, message: "Room deleted" })
  } catch (error) {
    res.status(403).json({ success: false, message: error.message })
  }
}



export const getRoomByCode = async (req, res) => {
  try {
    const room = await roomService.getRoomByCode(req.params.code)
    if (!room) return res.status(404).json({ success: false, message: "Room not found" })
    const { _id, name, code, language } = room
    res.status(200).json({ success: true, room: { _id, name, code, language, memberCount: room.members?.length || 0 } })
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not look up room" })
  }
}



export const leaveRoom = asyncHandler(async (req, res) => {
    const { userId } = getIdentity(req)
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" })
  await roomService.leaveRoom(req.params.roomId, userId)
  res.status(200).json({ success: true, message: "Room left successfully" })
})




export const updateMemberRole = async (req, res) => {
  const { userId } = getIdentity(req)
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" })
  const { roomId, userId: targetId } = req.params
  if (!isObjectId(roomId) || !isObjectId(targetId)) {
    return res.status(400).json({ success: false, message: "Invalid id" })
  }
  try {
    const room = await roomService.updateMemberRole(roomId, userId, targetId, req.body?.role)
    res.status(200).json({ success: true, room })
  } catch (error) {
    const forbidden = /owner/i.test(error.message)
    res.status(forbidden ? 403 : 400).json({ success: false, message: error.message })
  }
}




// ---------------- interview control ----------------
export const updateInterview = async (req, res) => {
  const { userId, username } = getIdentity(req)
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" })
  if (!isObjectId(req.params.roomId)) return res.status(400).json({ success: false, message: "Invalid room id" })
  try {
    const room = await roomService.updateInterview(req.params.roomId, userId, req.body || {}, username)
    res.status(200).json({ success: true, room })
  } catch (error) {
    const forbidden = /only the room owner/i.test(error.message)
    res.status(forbidden ? 403 : 400).json({ success: false, message: error.message })
  }
}

// ---------------- snapshots ----------------
export const createSnapshot = async (req, res) => {
  const { userId, username } = getIdentity(req)
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" })
  if (!isObjectId(req.params.roomId)) return res.status(400).json({ success: false, message: "Invalid room id" })

  const access = await roomService.getRoomWithRole(req.params.roomId, userId)
  if (!access || !canWriteNow(access.room, userId)) {
    return res.status(403).json({ success: false, message: "No write access to this room" })
  }
  const { value, error } = validateSnapshotInput(req.body)
  if (error) return res.status(400).json({ success: false, message: error })

  const snapshot = await roomService.createSnapshot(req.params.roomId, { userId, username }, value)

    if (access.room.type === "interview" && value.kind !== "auto") {
    await roomService.recordEvent(req.params.roomId, "snapshot_saved", { userId, username }, { kind: value.kind, size: value.size })
  }
  res.status(201).json({ success: true, snapshot })
}

export const listSnapshots = async (req, res) => {
  const { userId } = getIdentity(req)
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" })
  if (!isObjectId(req.params.roomId)) return res.status(400).json({ success: false, message: "Invalid room id" })
  const access = await roomService.getRoomWithRole(req.params.roomId, userId)
  if (!access) return res.status(403).json({ success: false, message: "No access to this room" })
  res.status(200).json({ success: true, snapshots: await roomService.listSnapshots(req.params.roomId) })
}

export const getSnapshot = async (req, res) => {
  const { userId } = getIdentity(req)
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" })
  const { roomId, snapshotId } = req.params
  if (!isObjectId(roomId) || !isObjectId(snapshotId)) return res.status(400).json({ success: false, message: "Invalid id" })
  const access = await roomService.getRoomWithRole(roomId, userId)
  if (!access) return res.status(403).json({ success: false, message: "No access to this room" })
  const snapshot = await roomService.getSnapshot(roomId, snapshotId)
  if (!snapshot) return res.status(404).json({ success: false, message: "Snapshot not found" })
  res.status(200).json({ success: true, snapshot })
}






// ---------------- scorecards ----------------
export const saveScorecard = async (req, res) => {
  const { userId, username } = getIdentity(req)
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" })
  if (!isObjectId(req.params.roomId)) return res.status(400).json({ success: false, message: "Invalid room id" })

  const access = await roomService.getRoomWithRole(req.params.roomId, userId)
  if (!access || !isInterviewer(access.room, userId)) {
    return res.status(403).json({ success: false, message: "Only interviewers can fill a scorecard" })
  }
  const { value, error } = validateScorecard(req.body)
  if (error) return res.status(400).json({ success: false, message: error })

  const scorecard = await roomService.upsertScorecard(req.params.roomId, { userId, username }, value)
    await roomService.recordEvent(req.params.roomId, "scorecard_saved", { userId, username })
  res.status(200).json({ success: true, scorecard })
}

// Owner sees every interviewer's scorecard; other interviewers see only their own
// (independent scoring avoids anchoring on a colleague's rating).
export const listScorecards = async (req, res) => {
  const { userId } = getIdentity(req)
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" })
  if (!isObjectId(req.params.roomId)) return res.status(400).json({ success: false, message: "Invalid room id" })

  const access = await roomService.getRoomWithRole(req.params.roomId, userId)
  if (!access || !isInterviewer(access.room, userId)) {
    return res.status(403).json({ success: false, message: "Only interviewers can view scorecards" })
  }
  const scorecards = await roomService.listScorecards(req.params.roomId, access.role === "owner" ? null : userId)
  res.status(200).json({ success: true, scorecards })
}



// ---------------- timeline / summary / report (interviewers only) ----------------
const requireInterviewer = async (req, res) => {
  const { userId, username } = getIdentity(req)
  if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return null }
  if (!isObjectId(req.params.roomId)) { res.status(400).json({ success: false, message: "Invalid room id" }); return null }
  const access = await roomService.getRoomWithRole(req.params.roomId, userId)
  if (!access || !isInterviewer(access.room, userId)) {
    res.status(403).json({ success: false, message: "Only interviewers can do this" }); return null
  }
  return { userId, username, ...access }
}

export const getTimeline = async (req, res) => {
  const ctx = await requireInterviewer(req, res)
  if (!ctx) return
  res.status(200).json({ success: true, events: await roomService.listEvents(req.params.roomId) })
}

export const getSummary = async (req, res) => {
  const ctx = await requireInterviewer(req, res)
  if (!ctx) return
  res.status(200).json({ success: true, summary: (await roomService.getReport(req.params.roomId)) || null })
}

export const saveSummary = async (req, res) => {
  const ctx = await requireInterviewer(req, res)
  if (!ctx) return
  if (ctx.role !== "owner") {
    return res.status(403).json({ success: false, message: "Only the interview owner can write the summary" })
  }
  const { value, error } = validateSummary(req.body)
  if (error) return res.status(400).json({ success: false, message: error })
  const summary = await roomService.upsertReport(req.params.roomId, { userId: ctx.userId, username: ctx.username }, value)
  res.status(200).json({ success: true, summary })
}

// Used by the AI service to draft a summary. Owner only, and only once the interview has ended.
export const getSummarySource = async (req, res) => {
  const ctx = await requireInterviewer(req, res)
  if (!ctx) return
  if (ctx.role !== "owner") {
    return res.status(403).json({ success: false, message: "Only the interview owner can draft a summary" })
  }
  if (ctx.room.interview?.status !== "ended") {
    return res.status(409).json({ success: false, message: "The interview has not ended yet" })
  }
  res.status(200).json({ success: true, source: await roomService.getSummarySource(ctx.room) })
}

// Internal only: the collaboration service reports who joined or left the video call.
// The gateway does not hold INTERNAL_EVENTS_KEY, so a user can never reach this successfully.
export const recordCallEvent = async (req, res) => {
  const expected = process.env.INTERNAL_EVENTS_KEY
  if (!expected) return res.status(503).json({ success: false, message: "Call events are not configured" })
  if (!keysMatch(req.headers["x-events-key"], expected)) return res.status(403).json({ success: false, message: "Forbidden" })

  const { value, error } = validateCallEvent(req.body)
  if (error) return res.status(400).json({ success: false, message: error })

  const result = await roomService.recordCallEvent(req.params.roomId, value)
  res.status(result.recorded ? 201 : 200).json({ success: true, recorded: result.recorded })
}