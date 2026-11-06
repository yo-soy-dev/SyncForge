import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import { errorHandler } from "../shared/middleware/errorHandler.js"
import { rateLimiter, userRateLimiter } from "./middleware/rateLimiter.js"
import { authenticate, stripIdentityHeaders } from "./middleware/auth.js"
import { setupRoutes } from "./routes/gateway.routes.js"

const app = express()
app.set("trust proxy", 1)

app.use(helmet())
app.use(morgan("dev"))
const allowedOrigins = (process.env.CLIENT_URL || "").split(",").map(o => o.trim()).filter(Boolean)
app.use(cors({
  // Explicit allowlist. If unset: open in dev, closed in production.
  origin: allowedOrigins.length ? allowedOrigins : process.env.NODE_ENV !== "production",
  credentials: true,
}))
app.use(express.json({ limit: "300kb" }))        
app.use(express.urlencoded({ extended: true }))

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "api-gateway" })
})

app.get("/", (req, res) => {
  res.send("api-gateway-service server is running")
})

app.use(rateLimiter)
app.use(stripIdentityHeaders)
setupRoutes(app, { authenticate, userRateLimiter })

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" })
})

app.use(errorHandler)
export default app
