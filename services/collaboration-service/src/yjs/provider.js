import * as Y from "yjs"
import { redisPub, redisSub } from "../config/redis.js"
import { getOrCreateDoc } from "./documentManager.js"

export class RedisYjsProvider {
  constructor(roomId, io) {
    this.roomId = roomId
    this.io = io
    this.channel = `yjs:${roomId}` 
    this.subscribed = false
  }

  async initialize() {
    if (this.subscribed) return
    this.subscribed = true

    await redisSub.subscribe(this.channel, (message) => {
      this.onRedisMessage(message)
    })

    console.log(`Room ${this.roomId}: Redis channel subscribed`)
  }

  onRedisMessage(message) {
    try {
      const { update, excludeSocketId } = JSON.parse(message)
      // const updateBuffer = Buffer.from(update, "base64")
      const updateArray = Array.from(Buffer.from(update, "base64"))

      if (!this.io) return

      this.io.to(this.roomId).except(excludeSocketId).emit(
        "yjs-update",
        // updateBuffer
        updateArray
      )
    } catch (err) {
      console.error("Redis message parse error:", err)
    }
  }

  async publishUpdate(update, excludeSocketId) {

    if (!this.subscribed) {
      console.warn(`Room ${this.roomId}: Not subscribed yet — skipping publish`)
      return
    }
    
    const message = JSON.stringify({
      update: Buffer.from(update).toString("base64"),
      excludeSocketId,
      serverId: process.env.SERVER_ID || "server-1"
    })

    await redisPub.publish(this.channel, message)
  }

  async destroy() {
    await redisSub.unsubscribe(this.channel)
    this.subscribed = false
  }
}

const providers = new Map()

export const getOrCreateProvider = async (roomId, io) => {
  if (!providers.has(roomId)) {
    const provider = new RedisYjsProvider(roomId, io)
    await provider.initialize()
    providers.set(roomId, provider)
  }
  return providers.get(roomId)
}

export const removeProvider = async (roomId) => {
  const provider = providers.get(roomId)
  if (provider) {
    await provider.destroy()
    providers.delete(roomId)
  }
}