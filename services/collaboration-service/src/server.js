import "dotenv/config"
import { httpServer } from "./app.js"
import { connectRedis } from "./config/redis.js"

const PORT = process.env.PORT || 4003

const startServer = async () => {
  try {
    await connectRedis()

    httpServer.listen(PORT, () => {
      console.log(`Collaboration service running on port ${PORT}`)
    })

  } catch (error) {
    console.error("Server failed:", error.message)
    process.exit(1)
  }
}

startServer()