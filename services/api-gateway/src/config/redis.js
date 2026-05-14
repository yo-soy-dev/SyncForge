import { createClient } from "redis"

const redisClient = createClient({
  url: process.env.REDIS_URL
})

redisClient.on("error", (err) => console.error("Redis Client Error:", err))
redisClient.on("connect", () => console.log("Gateway: Redis connected"))

export const connectRedis = async () => {
  if (redisClient.isOpen) return  
  await redisClient.connect()
}

export default redisClient