import "dotenv/config"
import http from "http"
import app from "./app.js"
import { connectRedis } from "./config/redis.js"
import { setupRoutes } from "./routes/gateway.routes.js"

const PORT = process.env.PORT || 3000

const startServer = async () => {
  try {
    await connectRedis()

    const server = http.createServer(app)

    // WebSocket upgrade handle karo
    const { createProxyMiddleware } = await import("http-proxy-middleware")
    const wsProxy = createProxyMiddleware({
      target: process.env.COLLAB_SERVICE_URL,
      changeOrigin: true,
      ws: true,
      on: {
        error: (err) => console.error("WS Proxy error:", err.message)
      }
    })

    server.on("upgrade", wsProxy.upgrade)

    server.listen(PORT, () => {
      console.log(`API Gateway running on port ${PORT}`)
      console.log(`Auth service  -> ${process.env.AUTH_SERVICE_URL}`)
      console.log(`Room service  -> ${process.env.ROOM_SERVICE_URL}`)
      console.log(`Collab service -> ${process.env.COLLAB_SERVICE_URL}`)
    })
  } catch (error) {
    console.error("Gateway startup failed:", error.message)
    process.exit(1)
  }
}

startServer()
