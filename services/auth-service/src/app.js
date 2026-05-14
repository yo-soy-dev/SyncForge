import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import { errorHandler } from "../shared/middleware/errorHandler.js"
import authRoutes from "./routes/auth.routes.js"

const app = express()
app.use(helmet())
app.use(morgan("dev"))
app.use(cors({ origin: "*" }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// app.use("/api/auth", authRoutes)
app.use("/", authRoutes)

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "auth-service" })
})

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" })
})

app.use(errorHandler)
export default app
