import "dotenv/config"
import app from "./app.js"
import { connectRedis } from "./config/redis.js"

const PORT = process.env.PORT || 3000

const startServer = async () => {
  try {

    await connectRedis()

    app.listen(PORT, () => {
      console.log(`API Gateway running on port ${PORT}`)

      console.log(`Auth service  → ${process.env.AUTH_SERVICE_URL}`)

      console.log(`Room service  → ${process.env.ROOM_SERVICE_URL}`)

      console.log(`Collab service → ${process.env.COLLAB_SERVICE_URL}`)
    })

  } catch (error) {

    console.error("Gateway startup failed:", error.message)

    process.exit(1)
  }
}

startServer()

