import { redisClient } from "../config/redis.js"

const CACHE_TTL = 60 * 60

const getCached = async (key) => {
  try {
    const data = await redisClient.get(key)
    return data ? JSON.parse(data) : null
  } catch (err) {
    console.error("Redis get error:", err)
    return null
  }
}

const setCache = async (key, value) => {
  try {
    await redisClient.setEx(
      key,
      CACHE_TTL,
      JSON.stringify(value)
    )
  } catch (err) {
    console.error("Redis set error:", err)
  }
}

const fetchJson = async (url, options = {}) => {
  const controller = new AbortController()

  const timeout = setTimeout(() => {
    controller.abort()
  }, 5000)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })

    if (!response.ok) {
      return null
    }

    try {
      return await response.json()
    } catch {
      return null
    }

  } catch (err) {

    if (err.name === "AbortError") {
      console.error("Request timeout:", url)
      return null
    }

    console.error("fetchJson error:", err)
    return null

  } finally {
    clearTimeout(timeout)
  }
}

export const getRoomByCode = async (code) => {
  try {
    const cacheKey = `room:code:${code}`

    const cached = await getCached(cacheKey)

    if (cached) {
      console.log("[CACHE HIT]", cacheKey)
      return cached
    }

    console.log("[CACHE MISS]", cacheKey)

    const data = await fetchJson(
      `${process.env.ROOM_SERVICE_URL}/api/rooms/code/${code}`
    )

    const room = data?.room || null

    if (room) {
      await setCache(cacheKey, room)
    }

    return room
  } catch (err) {
    console.error("getRoomByCode error:", err)
    return null
  }
}

export const getRoomById = async (roomId, userId) => {
  try {
    const cacheKey = `room:id:${roomId}:user:${userId}`

    const cached = await getCached(cacheKey)

    if (cached) {
      console.log("[CACHE HIT]", cacheKey)
      return cached
    }

    console.log("[CACHE MISS]", cacheKey)

    const data = await fetchJson(
      `${process.env.ROOM_SERVICE_URL}/api/rooms/${roomId}`,
      {
        headers: {
          "x-user-id": userId,
        },
      }
    )

    const room = data?.room || null

    if (room) {
      await setCache(cacheKey, room)
    }

    return room
  } catch (err) {
    console.error("getRoomById error:", err)
    return null
  }
}