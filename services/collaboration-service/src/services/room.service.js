// import fetch from "node-fetch"

// export const validateRoom = async (roomId, userId) => {
//   try {
//     const response = await fetch(
//       `${process.env.ROOM_SERVICE_URL}/api/rooms/${roomId}`,
//       {
//         headers: { "x-user-id": userId }
//       }
//     )

//     if (!response.ok) return null

//     const data = await response.json()
//     return data.room
//   } catch (err) {
//     console.error("Room validation error:", err)
//     return null
//   }
// }




import mongoose from "mongoose"
import { createClient } from "redis"

// Redis client
const redisClient = createClient({ url: process.env.REDIS_URL })
await redisClient.connect()

const CACHE_TTL = 60 * 60

const getCached = async (key) => {
  const data = await redisClient.get(key)
  return data ? JSON.parse(data) : null
}

// Room Service se fetch karo
export const getRoomByCode = async (code) => {
  try {
    // Pehle Redis cache check karo
    const cached = await getCached(`room:code:${code}`)
    if (cached) return cached

    // Cache miss — Room Service se fetch karo
    const response = await fetch(
      `${process.env.ROOM_SERVICE_URL}/api/rooms/code/${code}`
    )
    if (!response.ok) return null

    const data = await response.json()
    return data.room || null
  } catch (err) {
    console.error("getRoomByCode error:", err)
    return null
  }
}