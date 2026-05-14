import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import aiRoutes from "./routes/ai.routes.js"

const app = express()

app.use(helmet())
app.use(morgan("dev"))
app.use(cors({ origin: "*" }))
app.use(express.json({ limit: "50kb" }))

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "ai-service" })
})

app.use("/api/ai", aiRoutes)

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" })
})

export default app