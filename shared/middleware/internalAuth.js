import crypto from "crypto"

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a))
  const y = Buffer.from(String(b))
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

/**
 * Rejects any request that does not carry the shared INTERNAL_API_KEY.
 * Fails CLOSED: if INTERNAL_API_KEY is not configured, every request is refused.
 */
export const requireInternalKey = (explicitKey) => (req, res, next) => {
  const expected = explicitKey ?? process.env.INTERNAL_API_KEY
  if (!expected) {
    return res.status(503).json({
      success: false,
      message: "Service misconfigured: INTERNAL_API_KEY is not set",
    })
  }
  const provided = req.headers["x-internal-key"]
  if (!provided || !safeEqual(provided, expected)) {
    return res.status(401).json({ success: false, message: "Unauthorized" })
  }
  next()
}