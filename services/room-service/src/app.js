import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import { errorHandler } from "../shared/middleware/errorHandler.js"
import roomRoutes from "./routes/room.routes.js"
import fileRoutes from "./routes/file.routes.js"

const app = express()
app.use(helmet())
app.use(morgan("dev"))
app.use(cors({ origin: "*" }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))


app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "room-service" })
})

app.use("/", roomRoutes)
app.use("/", fileRoutes)

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" })
})

app.use(errorHandler)
export default app
