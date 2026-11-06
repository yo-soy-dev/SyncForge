import fetch from "node-fetch"

// Exact-match allowlist (the old startsWith() would also whitelist e.g. /api/auth/login-anything).
const PUBLIC_ROUTES = [
  { method: "POST", path: "/api/auth/signup" },
  { method: "POST", path: "/api/auth/login" },
  { method: "POST", path: "/api/auth/guest" },
  { method: "POST", path: "/api/auth/forgot-password" },
  { method: "POST", path: "/api/auth/reset-password" },
]

// Use originalUrl: when mounted with app.use("/api", ...) Express strips the mount path from req.path.
export const requestPath = (req) =>
  (req.originalUrl || req.url || "").split("?")[0].replace(/\/+$/, "")

export const isPublicRoute = (req) =>
  PUBLIC_ROUTES.some((r) => r.method === req.method && r.path === requestPath(req))

// Clients must never supply identity headers. Run BEFORE authenticate.
export const stripIdentityHeaders = (req, res, next) => {
  delete req.headers["x-user-id"]
  delete req.headers["x-user-data"]
  delete req.headers["x-user-guest"]
  delete req.headers["x-internal-key"]
  next()
}

export const authenticate = async (req, res, next) => {
  if (isPublicRoute(req)) return next()

  const token = req.headers.authorization?.split(" ")[1]
  if (!token) {
    return res.status(401).json({ success: false, message: "Please log in first — token not found" })
  }

  try {
    const response = await fetch(`${process.env.AUTH_SERVICE_URL}/verify-token`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    })
    const data = await response.json()

    if (!response.ok || !data.success) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" })
    }

    req.headers["x-user-id"] = String(data.user.userId)
    if (data.user.isGuest) req.headers["x-user-guest"] = "1"
    // encodeURIComponent: header values must be latin1-safe; usernames may not be.
    req.headers["x-user-data"] = encodeURIComponent(
      JSON.stringify({ userId: data.user.userId, username: data.user.username || "" })
    )
    next()
  } catch (error) {
    console.error("Auth check failed:", error.message)
    res.status(503).json({ success: false, message: "Authentication service unavailable" })
  }
}