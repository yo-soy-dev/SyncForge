import redisClient from "../config/redis.js"

const WINDOW_SIZE = 15 * 60      
const MAX_REQUESTS = 100          

export const rateLimiter = async (req, res, next) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown"
  const key = `rate_limit:${ip}`

  try {
    const current = await redisClient.incr(key)

    if (current === 1) {
      await redisClient.expire(key, WINDOW_SIZE)
    }

    if (current > MAX_REQUESTS) {
      const ttl = await redisClient.ttl(key) 
      return res.status(429).json({
        success: false,
        message: "Bahut zyada requests! Thoda ruko.",
        retryAfter: `${Math.ceil(ttl / 60)} minutes`
      })
    }

    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS)
    res.setHeader("X-RateLimit-Remaining", MAX_REQUESTS - current)

    next()
  } catch (error) {
    console.error("Rate limiter error:", error)
    next()
  }
}