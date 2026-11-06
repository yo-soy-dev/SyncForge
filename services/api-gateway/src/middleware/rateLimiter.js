import redisClient from "../config/redis.js"
import { makeLimiter } from "./rateLimit.core.js"
import { requestPath } from "./auth.js"

const clientIp = (req) => req.ip || req.socket?.remoteAddress || "unknown"

// Before authentication: per IP.
export const rateLimiter = makeLimiter({
  redis: redisClient,
  keyFn: (req) => `ip:${clientIp(req)}`,
  pathFn: requestPath,
})

// After authentication: per user. Mount only after authenticate.
export const userRateLimiter = makeLimiter({
  redis: redisClient,
  keyFn: (req) => `user:${req.headers["x-user-id"] || clientIp(req)}`,
  pathFn: requestPath,
})