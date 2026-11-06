import "dotenv/config"
import app from "./app.js"
import { connectRedis } from "./config/redis.js"

const PORT = process.env.PORT || 4004

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is missing!")
  process.exit(1)
}

const startServer = async () => {
  await connectRedis()
  app.listen(PORT, () => {
    console.log(`AI Service running on port ${PORT}`)
  })
}

startServer()