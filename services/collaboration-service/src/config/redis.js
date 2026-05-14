import { createClient } from "redis"


export const redisClient = createClient({ url: process.env.REDIS_URL })
export const redisSub = redisClient.duplicate() 
export const redisPub = redisClient.duplicate()

redisClient.on("error", err => console.error("Redis error:", err))
redisSub.on("error", err => console.error("Redis Sub error:", err))
redisPub.on("error", err => console.error("Redis Pub error:", err))

export const connectRedis = async () => {
  await Promise.all([
    redisClient.connect(),
    redisSub.connect(),
    redisPub.connect(),
  ])
  console.log("Collaboration Service: Redis connected (3 clients)")
}