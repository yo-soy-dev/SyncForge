import jwt from "jsonwebtoken"
import redisClient from "../config/redis.js"

export const generateToken = (userId, username, { isGuest = false, expiresIn = "7d" } = {}) => {
  return jwt.sign(
    { userId, username, ...(isGuest ? { isGuest: true } : {}) },
    process.env.JWT_SECRET,
    { expiresIn }
  )
}

export const saveSession = async (userId, token, ttlSeconds = 7 * 24 * 60 * 60) => {
  try {
    await redisClient.setEx(`session:${userId}`, ttlSeconds, token)
  } catch (err) {
    console.error('saveSession error:', err.message)
    throw err
  }
}

export const deleteSession = async (userId) => {
  await redisClient.del(`session:${userId}`)
}

export const verifySession = async (userId) => {
  const token = await redisClient.get(`session:${userId}`)
  return token !== null
}
