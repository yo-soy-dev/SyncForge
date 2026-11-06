import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware"


const makeProxy = (target, pathRewrite) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    selfHandleResponse: false,
    on: {
      error: (err, req, res) => {
        console.error(`Proxy error → ${target}:`, err.message)
        if (res && !res.headersSent) {
          res.status(503).json({
            success: false,
            message: "Service temporarily unavailable"
          })
        }
      },
      // proxyReq: (proxyReq, req, res) => {
      //   fixRequestBody(proxyReq, req)
      //   proxyReq.setHeader("x-internal-key", process.env.INTERNAL_API_KEY || "")
      // }
      proxyReq: (proxyReq, req) => {
        proxyReq.setHeader("x-internal-key", process.env.INTERNAL_API_KEY || "")
        fixRequestBody(proxyReq, req)
      }
    }
  })

const makeWsProxy = (target) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    ws: true,
    on: {
      error: (err) => console.error("WS Proxy error:", err.message)
    }
  })


export const setupRoutes = (app, { authenticate, userRateLimiter }) => {

  app.use("/socket.io",
    makeWsProxy(process.env.COLLAB_SERVICE_URL)
  )

  app.use("/api", authenticate)
  app.use("/api/execute", userRateLimiter)
  app.use("/api/ai", userRateLimiter)

  app.use("/api/auth",
    makeProxy(process.env.AUTH_SERVICE_URL, { "^/api/auth": "/api/auth" })
  )

  // Internal-only routes are never reachable from the internet (they are also protected by a key the gateway doesn't have).
  app.use("/api/rooms/internal", (req, res) => res.status(404).json({ success: false, message: "Route not found" }))

  app.use("/api/rooms",
    makeProxy(process.env.ROOM_SERVICE_URL, { "^/api/rooms": "/api/rooms" })
  )

  app.use("/api/collab",
    makeProxy(process.env.COLLAB_SERVICE_URL, { "^/api/collab": "/api/collab" })
  )

  app.use("/api/ai",
    makeProxy(process.env.AI_SERVICE_URL, { "^/api/ai": "/api/ai" })
  )

  app.use("/api/execute",
    makeProxy(process.env.EXECUTE_SERVICE_URL, { "^/api/execute": "/api/execute" })
  )

  app.use("/api/files",
    makeProxy(process.env.ROOM_SERVICE_URL, { "^/api/files": "/api/files" })
  )

}
