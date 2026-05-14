import { createClient } from "redis"

const redisClient = createClient({
  url: process.env.REDIS_URL
})

redisClient.on("error", (err) => console.error("Room Service Redis error:", err))
redisClient.on("connect", () => console.log("Room Service: Redis connected"))

export const connectRedis = async () => {
  if (redisClient.isOpen) return  
  await redisClient.connect()
}

export default redisClient