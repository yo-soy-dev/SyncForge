export const WINDOW_SECONDS = 15 * 60

export const LIMITS = [
  { prefix: "/api/execute", max: 150, failClosed: true },
  { prefix: "/api/ai", max: 60, failClosed: true },
  { prefix: "/api/auth", max: 30, failClosed: false }, // brute-force protection
]
export const DEFAULT_LIMIT = { prefix: "default", max: 600, failClosed: false }

// Demo (guest) accounts get a much smaller budget on the expensive routes.
export const GUEST_MAX = { "/api/execute": 20, "/api/ai": 10 }

export const resolveLimit = (path) =>
  LIMITS.find((l) => path === l.prefix || path.startsWith(l.prefix + "/")) || DEFAULT_LIMIT

export const makeLimiter = ({ redis, keyFn, pathFn, windowSeconds = WINDOW_SECONDS }) =>
  async (req, res, next) => {
    const limit = resolveLimit(pathFn(req))
    const max = req.headers["x-user-guest"] === "1" ? (GUEST_MAX[limit.prefix] ?? limit.max) : limit.max
    try {
      const key = `rate_limit:${limit.prefix}:${keyFn(req)}`
      const current = await redis.incr(key)
      if (current === 1) await redis.expire(key, windowSeconds)

      if (current > max) {
        let ttl = await redis.ttl(key)
        if (ttl < 0) {
          await redis.expire(key, windowSeconds)
          ttl = windowSeconds
        }
        res.setHeader("Retry-After", Math.max(ttl, 1))
        return res.status(429).json({
          success: false,
          message: "Too many requests. Please wait and try again.",
          retryAfterSeconds: Math.max(ttl, 1),
        })
      }
      res.setHeader("X-RateLimit-Limit", max)
      res.setHeader("X-RateLimit-Remaining", Math.max(max - current, 0))
      next()
    } catch (error) {
      console.error("Rate limiter error:", error.message)
      if (limit.failClosed) {
        return res.status(503).json({ success: false, message: "Rate limiter unavailable" })
      }
      next()
    }
  }