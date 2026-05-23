import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import { createServer } from "http"
import { createSocketServer } from "./config/socket.js"

const app = express()
app.use(helmet())
app.use(morgan("dev"))
app.use(cors({ origin: "*" }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "collaboration-service" })
})

app.get("/", (req, res) => {
  res.send("collaboration-service server is running")
})

export const httpServer = createServer(app)
createSocketServer(httpServer)

export default app
