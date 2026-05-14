// import { createProxyMiddleware } from "http-proxy-middleware"

// const makeProxy = (target, pathRewrite) =>
//   createProxyMiddleware({
//     target,
//     changeOrigin: true,
//     pathRewrite,
//     on: {
//       error: (err, req, res) => {
//         console.error(`Proxy error → ${target}:`, err.message)
//         res.status(503).json({
//           success: false,
//           message: "Service temporarily unavailable"
//         })
//       }
//     }
//   })

// export const setupRoutes = (app) => {
//   app.use(
//     "/api/auth",
//     makeProxy(process.env.AUTH_SERVICE_URL, {
//       "^/api/auth": "/api/auth"
//     })
//   )

//   app.use(
//     "/api/rooms",
//     makeProxy(process.env.ROOM_SERVICE_URL, {
//       "^/api/rooms": "/api/rooms"
//     })
//   )

//   app.use(
//     "/api/collab",
//     makeProxy(process.env.COLLAB_SERVICE_URL, {
//       "^/api/collab": "/api/collab"
//     })
//   )
// }





// services/api-gateway/src/routes/gateway.routes.js
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
      // },
      //  proxyReq: (proxyReq, req) => {
      //   if (req.body && Object.keys(req.body).length > 0) {
      //     const bodyData = JSON.stringify(req.body)
      //     proxyReq.setHeader("Content-Type", "application/json")
      //     proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData))
      //     proxyReq.write(bodyData)
      //     // proxyReq.end()
      //   }
      // }
    }
  })

// ✅ WebSocket proxy add karo
const makeWsProxy = (target) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    ws: true,  // ✅ WebSocket enable
    on: {
      error: (err) => console.error("WS Proxy error:", err.message)
    }
  })

// export const setupRoutes = (app) => {
//   app.use("/api/auth",
//     makeProxy(process.env.AUTH_SERVICE_URL, { "^/api/auth": "/api/auth" })
//   )

//   app.use("/api/rooms",
//     makeProxy(process.env.ROOM_SERVICE_URL, { "^/api/rooms": "/api/rooms" })
//   )

//   // ✅ WebSocket + HTTP dono proxy karo
//   app.use("/socket.io",
//     makeWsProxy(process.env.COLLAB_SERVICE_URL)
//   )

//   app.use("/api/collab",
//     makeProxy(process.env.COLLAB_SERVICE_URL, { "^/api/collab": "/api/collab" })
//   )
// }

export const setupRoutes = (app) => {
  app.use("/api/auth",
    makeProxy(process.env.AUTH_SERVICE_URL, { "^/api/auth": "/api/auth" })
  )

  app.use("/api/rooms",
    makeProxy(process.env.ROOM_SERVICE_URL, { "^/api/rooms": "/api/rooms" })
  )

  app.use("/api/collab",
    makeProxy(process.env.COLLAB_SERVICE_URL, { "^/api/collab": "/api/collab" })
  )

  app.use("/socket.io",
    makeWsProxy(process.env.COLLAB_SERVICE_URL)
  )
}