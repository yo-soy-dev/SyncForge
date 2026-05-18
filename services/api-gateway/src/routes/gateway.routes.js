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
      proxyReq: fixRequestBody
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


export const setupRoutes = (app) => {

  app.use("/socket.io",
    makeWsProxy(process.env.COLLAB_SERVICE_URL)
  )

  app.use("/api/auth",
    makeProxy(process.env.AUTH_SERVICE_URL, { "^/api/auth": "/api/auth" })
  )

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
