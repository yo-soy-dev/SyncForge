import fetch from "node-fetch"

const PUBLIC_ROUTES = [
  { method: "POST", path: "/api/auth/signup" },
  { method: "POST", path: "/api/auth/login" },
]

const isPublicRoute = (req) => {
  return PUBLIC_ROUTES.some(
    (route) => route.method === req.method && req.path.startsWith(route.path)
  )
}

export const authenticate = async (req, res, next) => {
  if (isPublicRoute(req)) return next()

  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Login karo pehle — token nahi mila"
    })
  }

  try {
    const response = await fetch(
      `${process.env.AUTH_SERVICE_URL}/verify-token`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )

    const data = await response.json()

    if (!response.ok || !data.success) {
      return res.status(401).json({
        success: false,
        message: "Invalid ya expired token"
      })
    }

    req.headers["x-user-id"] = data.user.userId
    req.headers["x-user-data"] = JSON.stringify(data.user)

    next()
  } catch (error) {
    console.error("Auth check failed:", error)
    res.status(503).json({
      success: false,
      message: "Auth service unavailable"
    })
  }
}
