// import { nanoid } from "nanoid"
// import Room from "../models/Room.js"
// import redisClient from "../config/redis.js"

// const CACHE_TTL = 60 * 60 


// const getCached = async (key) => {
//   const data = await redisClient.get(key)
//   return data ? JSON.parse(data) : null
// }

// const setCache = async (key, data, ttl = CACHE_TTL) => {
//   await redisClient.setEx(key, ttl, JSON.stringify(data))
// }

// const invalidateCache = async (...keys) => {
//   await Promise.all(keys.map(key => redisClient.del(key)))
// }


// export const createRoom = async ({ name, language, userId, username }) => {
//   const code = nanoid(8).toUpperCase() 

//   const room = await Room.create({
//     name,
//     code,
//     language: language || "javascript",
//     owner: userId,
//     members: [{ userId, username, joinedAt: new Date() }]
//   })

//   await setCache(`room:${room._id}`, room.toObject())
//   await setCache(`room:code:${code}`, room.toObject())

//   return room
// }

// export const joinRoom = async ({ code, userId, username }) => {
//   let room = await getCached(`room:code:${code}`)

//   if (!room) {
//     room = await Room.findOne({ code, isActive: true }).lean()
//     if (!room) throw new Error("Room nahi mila ya inactive hai")

//     await setCache(`room:code:${code}`, room)
//     await setCache(`room:${room._id}`, room)
//   }

//   const alreadyMember = room.members?.some(
//     m => m.userId.toString() === userId.toString()
//   )
//   if (alreadyMember) return room 

//   const updatedRoom = await Room.findByIdAndUpdate(
//     room._id,
//     {
//       $push: {
//         members: { userId, username, joinedAt: new Date() }
//       }
//     },
//     { new: true }
//   ).lean()

//   await invalidateCache(`room:${room._id}`, `room:code:${code}`)
//   await setCache(`room:${room._id}`, updatedRoom)
//   await setCache(`room:code:${code}`, updatedRoom)

//   return updatedRoom
// }

// export const getMyRooms = async (userId) => {
//   const rooms = await Room.find({
//     $or: [
//       { owner: userId },
//       { "members.userId": userId }
//     ],
//     isActive: true
//   })
//   .select("name code language members createdAt") // sirf zaruri fields
//   .sort({ updatedAt: -1 }) 
//   .lean()

//   return rooms
// }

// export const getRoomById = async (roomId) => {
//   const cacheKey = `room:${roomId}`
//   let room = await getCached(cacheKey)

//   if (!room) {
//     room = await Room.findById(roomId).lean()
//     if (!room) throw new Error("Room nahi mila")
//     await setCache(cacheKey, room)
//   }

//   return room
// }

// export const deleteRoom = async (roomId, userId) => {
//   const room = await Room.findById(roomId)
//   if (!room) throw new Error("Room nahi mila")

//   if (room.owner.toString() !== userId.toString()) {
//     throw new Error("Sirf room owner delete kar sakta hai")
//   }

//   room.isActive = false 
//   await room.save()

//   await invalidateCache(`room:${roomId}`, `room:code:${room.code}`)
// }







import mongoose from "mongoose"  
import { nanoid } from "nanoid"
import Room from "../models/Room.js"
import redisClient from "../config/redis.js"


const CACHE_TTL = 60 * 60

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


// Helper — string ko ObjectId banao
const toObjectId = (id) => {
  try {
    return new mongoose.Types.ObjectId(id)
  } catch {
    throw new Error("Invalid user ID")
  }
}

export const createRoom = async ({ name, language, userId, username }) => {
  const userObjectId = toObjectId(userId)  // ✅ convert karo

  const code = nanoid(8).toUpperCase()

  const room = await Room.create({
    name,
    code,
    language: language || "javascript",
    owner: userObjectId,               // ✅ ObjectId
    members: [{
      userId: userObjectId,            // ✅ ObjectId
      username,
      joinedAt: new Date()
    }]
  })

  await setCache(`room:${room._id}`, room.toObject())
  await setCache(`room:code:${code}`, room.toObject())

  return room
}

export const joinRoom = async ({ code, userId, username }) => {
  const userObjectId = toObjectId(userId)  // ✅ convert karo

  let room = await getCached(`room:code:${code}`)

  if (!room) {
    room = await Room.findOne({ code, isActive: true }).lean()
    if (!room) throw new Error("Room nahi mila ya inactive hai")
    await setCache(`room:code:${code}`, room)
    await setCache(`room:${room._id}`, room)
  }

  // ✅ Ab sahi compare hoga
  const alreadyMember = room.members?.some(
    m => m.userId.toString() === userObjectId.toString()
  )
  if (alreadyMember) return room

  const updatedRoom = await Room.findByIdAndUpdate(
    room._id,
    {
      $push: {
        members: {
          userId: userObjectId,   // ✅ ObjectId
          username,
          joinedAt: new Date()
        }
      }
    },
    { new: true }
  ).lean()

  await invalidateCache(`room:${room._id}`, `room:code:${code}`)
  await setCache(`room:${room._id}`, updatedRoom)
  await setCache(`room:code:${code}`, updatedRoom)

  return updatedRoom
}

export const getMyRooms = async (userId) => {
  const userObjectId = toObjectId(userId)  // ✅ convert karo

  const rooms = await Room.find({
    $or: [
      { owner: userObjectId },              // ✅
      { "members.userId": userObjectId }    // ✅
    ],
    isActive: true
  })
  .select("name code language members createdAt")
  .sort({ updatedAt: -1 })
  .lean()

  return rooms
}

export const deleteRoom = async (roomId, userId) => {
  const userObjectId = toObjectId(userId)  // ✅ convert karo

  const room = await Room.findById(roomId)
  if (!room) throw new Error("Room nahi mila")

  if (room.owner.toString() !== userObjectId.toString()) {  // ✅
    throw new Error("Sirf room owner delete kar sakta hai")
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
    if (!room) throw new Error("Room nahi mila")
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