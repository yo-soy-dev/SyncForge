import jwt from "jsonwebtoken"
import redisClient from "../config/redis.js"

export const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  )
}

export const saveSession = async (userId, token) => {
  try {
    await redisClient.setEx(
      `session:${userId}`, 
      7 * 24 * 60 * 60,     
      token                  
    )
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
