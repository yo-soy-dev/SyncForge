import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import { errorHandler } from "../shared/middleware/errorHandler.js"
import { rateLimiter } from "./middleware/rateLimiter.js"
import { authenticate } from "./middleware/auth.js"
import { setupRoutes } from "./routes/gateway.routes.js"

const app = express()
app.use(helmet())
app.use(morgan("dev"))
app.use(cors({ origin: "*", credentials: true }))
app.use(express.json())        
app.use(express.urlencoded({ extended: true }))

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "api-gateway" })
})

app.use(rateLimiter)
app.use(authenticate)
setupRoutes(app)

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" })
})

app.use(errorHandler)
export default app
