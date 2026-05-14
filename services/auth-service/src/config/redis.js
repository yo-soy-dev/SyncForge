import { createClient } from "redis"

const redisClient = createClient({
  url: process.env.REDIS_URL 
})

redisClient.on("error", (err) => console.error("Redis error:", err))
redisClient.on("connect", () => console.log("Auth Service: Redis connected"))

export const connectRedis = async () => {
  if (redisClient.isOpen) return  
  await redisClient.connect()
}
export default redisClient