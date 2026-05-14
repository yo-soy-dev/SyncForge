import "dotenv/config"

import app from "./app.js"

import connectDB from "./config/db.js"

import { connectRedis } from "./config/redis.js"

const PORT = process.env.PORT || 4002

const startServer = async () => {

  try {

    await connectDB()
    await connectRedis()

    app.listen(PORT, () => {
      console.log(`Room service running on port ${PORT}`)
    })

  } catch (error) {

    console.error("Room service startup failed:", error.message)

    process.exit(1)
  }
}

startServer()

