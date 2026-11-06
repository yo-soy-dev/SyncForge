import mongoose from "mongoose"
import { nanoid } from "nanoid"
import Room from "../models/Room.js"
import redisClient from "../config/redis.js"
import { roleFor, ROLES, ROOM_TYPES } from "../utils/access.js"
import { applyInterviewPatch, decideInterviewJoin } from "../utils/interview.js"
import Scorecard from "../models/Scorecard.js"
import InterviewEvent from "../models/InterviewEvent.js"
import { CALL_EVENT_TYPES, MAX_CALL_EVENTS_PER_USER } from "../utils/callEvents.js"
import InterviewReport from "../models/InterviewReport.js"
import { sanitizeMeta, eventsForPatch, buildSummarySource } from "../utils/report.js"
import { MAX_SNAPSHOTS_PER_ROOM } from "../utils/snapshots.js"
import Snapshot from "../models/Snapshot.js"
import { ValidationError } from "../../shared/errors/ApiError.js"


const CACHE_TTL = 60 

const getCached = async (key) => {
  const data = await redisClient.get(key)
  return data ? JSON.parse(data) : null
}

const setCache = async (key, data, ttl = CACHE_TTL) => {
  await redisClient.setEx(key, ttl, JSON.stringify(data))
}

const invalidateCache = async (...keys) => {
  await Promise.all(keys.map(key => redisClient.del(key)))
}


const toObjectId = (id) => {
  try {
    return new mongoose.Types.ObjectId(id)
  } catch {
    throw new Error("Invalid user ID")
  }
}

export const createRoom = async ({ name, language, type = "collab", userId, username }) => {
  if (!ROOM_TYPES.includes(type)) throw new Error("Invalid room type")
  const userObjectId = toObjectId(userId)

  const code = nanoid(8).toUpperCase()

  const room = await Room.create({
    name,
    code,
    language: language || "javascript",
    type,
    ...(type === "interview"
      ? {
        interview: {
          status: "scheduled", locked: false,
          candidateCode: nanoid(10).toUpperCase(), observerCode: nanoid(10).toUpperCase()
        }
      }
      : {}),
    owner: userObjectId,
    members: [{
      userId: userObjectId,
      username,
      joinedAt: new Date()
    }]
  })

  const roomObj = room.toObject()

  await setCache(`room:${room._id}`, roomObj)
  await setCache(`room:code:${code}`, roomObj)

  if (type === "interview") await recordEvent(room._id, "room_created", { userId, username })

  return roomObj
}

// Candidate / observer links. Returns the updated room, or null when `code` is not an interview code.
const joinWithInterviewCode = async ({ code, userId, username }) => {
  const room = await Room.findOne({
    isActive: true,
    type: "interview",
    $or: [{ "interview.candidateCode": code }, { "interview.observerCode": code }],
  }).lean()
  if (!room) return null

  const kind = room.interview.candidateCode === code ? "candidate" : "observer"
  const decision = decideInterviewJoin(room, kind, userId)
  if (decision.action === "reject") {
    const err = new Error(decision.message); err.status = decision.status; throw err
  }
  if (decision.action === "rejoin") {
    const alreadyIn = (room.members || []).some((m) => String(m.userId) === String(userId))
    if (alreadyIn) return room
    // They pressed Leave earlier and were removed from members: put them back.
    const uid = toObjectId(userId)
    const restored = await Room.findOneAndUpdate(
      { _id: room._id, isActive: true, "interview.status": { $ne: "ended" }, "members.userId": { $ne: uid } },
      { $push: { members: { userId: uid, username, role: kind === "candidate" ? "editor" : "viewer", joinedAt: new Date() } } },
      { new: true }
    ).lean()
    await invalidateCache("room:" + room._id, "room:code:" + room.code)
    return restored || (await Room.findById(room._id).lean())
  }

  const uid = toObjectId(userId)
  const member = { userId: uid, username, role: kind === "candidate" ? "editor" : "viewer", joinedAt: new Date() }

  // Atomic: a single-use candidate link cannot be claimed by two people at once.
  const filter = { _id: room._id, isActive: true, "interview.status": { $ne: "ended" }, "members.userId": { $ne: uid } }
  const update = { $push: { members: member } }
  if (kind === "candidate") {
    filter["interview.candidateId"] = { $exists: false }
    update.$set = { "interview.candidateId": uid }
  }
  const updated = await Room.findOneAndUpdate(filter, update, { new: true }).lean()
  if (!updated) {
    const err = new Error(kind === "candidate" ? "This candidate link has already been used" : "Could not join this interview")
    err.status = 409; throw err
  }
  await invalidateCache(`room:${room._id}`, `room:code:${room.code}`)
  await recordEvent(room._id, "member_joined", { userId, username }, { as: kind })
  return updated
}

export const joinRoom = async ({ code, userId, username }) => {
  const viaInterviewCode = await joinWithInterviewCode({ code, userId, username })
  if (viaInterviewCode) return viaInterviewCode

  const userObjectId = toObjectId(userId)

  let room = await getCached(`room:code:${code}`)

  if (!room) {
    room = await Room.findOne({ code, isActive: true }).lean()
    if (!room) throw new Error("Room not found or no longer active")
    await setCache(`room:code:${code}`, room)
    await setCache(`room:${room._id}`, room)
  }

    const alreadyMember = !!(await Room.exists({ _id: room._id, "members.userId": userObjectId })) || room.members?.some(
    m => m.userId.toString() === userObjectId.toString()
  )
  if (alreadyMember) return (await Room.findById(room._id).lean()) || room

  const updatedRoom = await Room.findByIdAndUpdate(
    room._id,
    {
      $push: {
        members: {
          userId: userObjectId,
          username,
          joinedAt: new Date()
        }
      }
    },
    { new: true }
  ).lean()

  await invalidateCache(`room:${room._id}`, `room:code:${code}`)


  if (updatedRoom.type === "interview") await recordEvent(updatedRoom._id, "member_joined", { userId, username }, { as: "interviewer" })

  return updatedRoom
}

export const getMyRooms = async (userId) => {
  const userObjectId = toObjectId(userId)

  const rooms = await Room.find({
    $or: [
      { owner: userObjectId },
      { "members.userId": userObjectId }
    ],
    isActive: true
  })
    .select("name code language type members owner interview createdAt updatedAt")
    .sort({ updatedAt: -1 })
    .lean()

  return rooms
}

export const deleteRoom = async (roomId, userId) => {
  const userObjectId = toObjectId(userId)

  const room = await Room.findById(roomId)
  if (!room) throw new Error("Room not found")

  if (room.owner.toString() !== userObjectId.toString()) {
    throw new Error("Only the room owner can delete this room")
  }

  room.isActive = false
  await room.save()
  await invalidateCache(`room:${roomId}`, `room:code:${room.code}`)
}

export const getRoomById = async (roomId) => {
  const cacheKey = `room:${roomId}`
  let room = await getCached(cacheKey)

  if (!room) {
    room = await Room.findById(roomId).lean()
    if (!room) throw new Error("Room not found")
    await setCache(cacheKey, room)
  }

  return room
}


export const getRoomByCode = async (code) => {
  const cacheKey = `room:code:${code}`
  let room = await getCached(cacheKey)

  if (!room) {
    room = await Room.findOne({ code, isActive: true }).lean()
    if (!room) return null
    await setCache(cacheKey, room)
  }

  return room
}




export const leaveRoom = async (roomId, userId) => {
  const userObjectId = toObjectId(userId)
  const room = await Room.findById(roomId)
  if (!room) throw new Error("Room not found")

  if (room.owner.toString() === userObjectId.toString()) {
    throw new ValidationError("Room owner cannot leave the room. Delete the room instead.")
  }

  const updatedRoom = await Room.findByIdAndUpdate(
    roomId,
    { $pull: { members: { userId: userObjectId } } },
    { new: true }
  ).lean()

  await invalidateCache(`room:${roomId}`, `room:code:${room.code}`)

  return updatedRoom
}





export const getRoomWithRole = async (roomId, userId) => {
  let room
  try {
    room = await getRoomById(roomId)
  } catch {
    return null
  }
  const role = roleFor(room, userId)
  return role ? { room, role } : null
}

export const updateMemberRole = async (roomId, ownerId, targetUserId, role) => {
  if (!ROLES.includes(role)) throw new Error("Invalid role")
  const room = await Room.findById(roomId)
  if (!room || !room.isActive) throw new Error("Room not found")
  if (room.owner.toString() !== String(ownerId)) throw new Error("Only the room owner can change roles")
  if (room.owner.toString() === String(targetUserId)) throw new Error("The owner's role cannot be changed")

  const updated = await Room.findOneAndUpdate(
    { _id: roomId, "members.userId": toObjectId(targetUserId) },
    { $set: { "members.$.role": role } },
    { new: true }
  ).lean()
  if (!updated) throw new Error("Member not found")

  await invalidateCache(`room:${roomId}`, `room:code:${room.code}`)
  return updated
}




// ---------------- interview control (owner only) ----------------
export const updateInterview = async (roomId, ownerId, patch, ownerName = "Interviewer") => {
  const room = await Room.findById(roomId).lean()
  if (!room || !room.isActive) throw new Error("Room not found")
  if (String(room.owner) !== String(ownerId)) throw new Error("Only the room owner can control the interview")

  const { set, error, finalText } = applyInterviewPatch(room, patch)
  if (error) throw new Error(error)

  const updated = await Room.findByIdAndUpdate(roomId, { $set: set }, { new: true }).lean()
  await invalidateCache(`room:${roomId}`, `room:code:${room.code}`)

  const actor = { userId: ownerId, username: ownerName }
  for (const [type, meta] of eventsForPatch(set)) await recordEvent(roomId, type, actor, meta)

  // Ending the interview stores the final document state (sent by the owner's client,
  // because the live document lives in the collaboration service).
  if (set["interview.status"] === "ended" && typeof finalText === "string") {
    await createSnapshot(roomId, { userId: ownerId, username: ownerName },
      { text: finalText.slice(0, 150000), language: room.language, kind: "interview-end", size: Math.min(finalText.length, 150000) })
  }
  return updated
}

// ---------------- snapshots / version history ----------------
export const createSnapshot = async (roomId, user, value) => {
  const snap = await Snapshot.create({
    roomId: toObjectId(roomId),
    text: value.text, language: value.language, kind: value.kind, size: value.size,
    createdBy: toObjectId(user.userId), createdByName: user.username,
  })
  // keep the newest MAX_SNAPSHOTS_PER_ROOM only
  const extra = await Snapshot.find({ roomId: toObjectId(roomId) })
    .sort({ createdAt: -1 }).skip(MAX_SNAPSHOTS_PER_ROOM).select("_id").lean()
  if (extra.length) await Snapshot.deleteMany({ _id: { $in: extra.map((e) => e._id) } })
  const { text, ...meta } = snap.toObject()
  return meta
}

export const listSnapshots = (roomId) =>
  Snapshot.find({ roomId: toObjectId(roomId) })
    .select("kind language size createdBy createdByName createdAt")
    .sort({ createdAt: -1 }).limit(MAX_SNAPSHOTS_PER_ROOM).lean()

export const getSnapshot = (roomId, snapshotId) =>
  Snapshot.findOne({ _id: toObjectId(snapshotId), roomId: toObjectId(roomId) }).lean()



// ---------------- scorecards (interviewers only; routes enforce who) ----------------
export const upsertScorecard = async (roomId, user, value) => {
  const set = { interviewerName: user.username }
  for (const [k, v] of Object.entries(value.ratings || {})) set[`ratings.${k}`] = v
  if (value.notes !== undefined) set.notes = value.notes
  if (value.recommendation !== undefined) set.recommendation = value.recommendation
  return Scorecard.findOneAndUpdate(
    { roomId: toObjectId(roomId), interviewerId: toObjectId(user.userId) },
    { $set: set },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean()
}

export const listScorecards = (roomId, onlyInterviewerId = null) =>
  Scorecard.find({
    roomId: toObjectId(roomId),
    ...(onlyInterviewerId ? { interviewerId: toObjectId(onlyInterviewerId) } : {}),
  }).sort({ updatedAt: -1 }).lean()



// ---------------- interview timeline, summary, report ----------------
// Best effort: a failure to log an event must never break the action that caused it.
export const recordEvent = async (roomId, type, actor = {}, meta = {}) => {
  try {
    await InterviewEvent.create({
      roomId: toObjectId(roomId),
      type,
      actorId: actor.userId ? toObjectId(actor.userId) : undefined,
      actorName: actor.username || "",
      meta: sanitizeMeta(meta),
    })
  } catch (e) {
    console.error("event not recorded:", type, e.message)
  }
}

export const listEvents = (roomId) =>
  InterviewEvent.find({ roomId: toObjectId(roomId) }).sort({ at: 1 }).limit(500).lean()

export const getReport = (roomId) => InterviewReport.findOne({ roomId: toObjectId(roomId) }).lean()

// Called by the collaboration service (never by users). Verifies the room and the member itself.
export const recordCallEvent = async (roomId, { userId, type, meta }) => {
  const room = await Room.findOne({ _id: toObjectId(roomId), isActive: true }).select("type members").lean()
  if (!room || room.type !== "interview") return { recorded: false }

  const member = (room.members || []).find((m) => String(m.userId) === String(userId))
  if (!member) return { recorded: false }

  // A flaky connection must not flood the timeline.
  const count = await InterviewEvent.countDocuments({
    roomId: room._id,
    actorId: toObjectId(userId),
    type: { $in: CALL_EVENT_TYPES },
  })
  if (count >= MAX_CALL_EVENTS_PER_USER) return { recorded: false }

  await recordEvent(room._id, type, { userId, username: member.username }, meta)
  return { recorded: true }
}

export const upsertReport = async (roomId, user, value) => {
  const report = await InterviewReport.findOneAndUpdate(
    { roomId: toObjectId(roomId) },
    { $set: { text: value.text, aiAssisted: value.aiAssisted, updatedById: toObjectId(user.userId), updatedByName: user.username } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean()
  await recordEvent(roomId, "summary_saved", user, { aiAssisted: value.aiAssisted })
  return report
}

// Material for an AI-drafted summary (facts only; see buildSummarySource).
export const getSummarySource = async (room) => {
  const events = await listEvents(room._id)
  const finalSnapshot =
    (await Snapshot.findOne({ roomId: toObjectId(room._id), kind: "interview-end" }).sort({ createdAt: -1 }).lean()) ||
    (await Snapshot.findOne({ roomId: toObjectId(room._id) }).sort({ createdAt: -1 }).lean())
  return buildSummarySource({ room, events, finalSnapshot })
}