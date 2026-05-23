import express from "express"
import cors from "cors"
import executeRoutes from "./routes/execute.routes.js"

const app = express()
app.use(cors())
app.use(express.json({ limit: "100kb" }))

app.get("/health", (req, res) => res.json({ status: "ok", service: "code-execution-service" }))
app.get("/", (req, res) => {
  res.send("code-execution-service server is running")
})
app.use("/", executeRoutes)

export default app