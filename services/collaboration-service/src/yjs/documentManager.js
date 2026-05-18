import * as Y from "yjs"
import { redisClient } from "../config/redis.js"

const docs = new Map()
const persistTimers = new Map()

const PERSIST_KEY = (roomId) => `ydoc:${roomId}`
const PERSIST_TTL = 7 * 24 * 60 * 60

export const getOrCreateDoc = async (roomId) => {
  if (docs.has(roomId)) {
    return docs.get(roomId)
  }

  const ydoc = new Y.Doc()

  try {
    const saved = await redisClient.get(PERSIST_KEY(roomId))

    if (saved) {
      const update = Buffer.from(saved, "base64")

      Y.applyUpdate(ydoc, update)

      console.log(`Room ${roomId}: doc loaded from Redis`)
    }
  } catch (err) {
    console.error(`Failed to load doc for room ${roomId}:`, err)
  }

  docs.set(roomId, ydoc)

  ydoc.on("update", () => {
    clearTimeout(persistTimers.get(roomId))

    const timer = setTimeout(async () => {
      await persistDoc(roomId, ydoc)
    }, 2000)

    persistTimers.set(roomId, timer)
  })

  ydoc.on("destroy", () => {
    console.log(`Room ${roomId}: Y.Doc destroyed`)
  })

  return ydoc
}

export const persistDoc = async (roomId, ydoc) => {
  try {
    const update = Y.encodeStateAsUpdate(ydoc)

    const base64 = Buffer.from(update).toString("base64")

    await redisClient.setEx(
      PERSIST_KEY(roomId),
      PERSIST_TTL,
      base64
    )

    console.log(`Room ${roomId}: persisted`)
  } catch (err) {
    console.error(`Failed to persist doc for room ${roomId}:`, err)
  }
}

export const removeDoc = async (roomId) => {
  const ydoc = docs.get(roomId)

  if (ydoc) {
    await persistDoc(roomId, ydoc)

    ydoc.destroy()
  }

  clearTimeout(persistTimers.get(roomId))
  persistTimers.delete(roomId)

  docs.delete(roomId)

  console.log(`Room ${roomId}: doc removed from memory`)
}

export const getActiveRooms = () => {
  return [...docs.keys()]
}