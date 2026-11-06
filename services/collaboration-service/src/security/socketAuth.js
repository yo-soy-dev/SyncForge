// Socket security: identity, room access and write permission.

export const MAX_UPDATE_BYTES = 512 * 1024      // a single Yjs update
export const ROLE_REFRESH_MS = Number(process.env.ROLE_REFRESH_MS) || 30_000
// Interview rooms re-check much more often so "Lock candidate" takes effect within seconds.
export const INTERVIEW_REFRESH_MS = Number(process.env.INTERVIEW_REFRESH_MS) || 2_000

export const refreshMsFor = (roomType) => (roomType === "interview" ? INTERVIEW_REFRESH_MS : ROLE_REFRESH_MS)
export const ROOM_ID = /^[a-f0-9]{24}$/i

export const canWrite = (role) => role === "owner" || role === "editor"

const timeout = (ms) => AbortSignal.timeout(ms)
const TRANSIENT = Symbol("transient") // room-service was slow or unreachable: not the same as "no access"

/**
 * Socket.IO middleware. The ONLY identity the server uses is the one returned by
 * auth-service for the supplied JWT. Anything the client claims is ignored.
 */
export const createSocketAuth = ({
  authUrl = process.env.AUTH_SERVICE_URL,
  fetchImpl = fetch,
  timeoutMs = 3000,
} = {}) => async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token
    if (!token || typeof token !== "string") return next(new Error("Unauthorized"))

    const res = await fetchImpl(`${authUrl}/verify-token`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: timeout(timeoutMs),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success || !data.user?.userId) return next(new Error("Unauthorized"))

    socket.userId = String(data.user.userId)
    socket.username = data.user.username || "Anonymous"
    socket.avatarUrl = typeof data.user.avatarUrl === "string" ? data.user.avatarUrl : ""
    next()
  } catch {
       const err = new Error("Unauthorized")
    err.data = { retryable: true } // auth-service was unreachable: the client keeps retrying
    next(err)                              // fail closed
  }
}

/** Asks room-service whether `userId` may access `roomId`. Returns { room, role } or null. */
const fetchRoomAccessOnce = async ({
  roomId,
  userId,
  roomUrl = process.env.ROOM_SERVICE_URL,
  internalKey = process.env.INTERNAL_API_KEY,
  fetchImpl = fetch,
  timeoutMs = 3000,
}) => {
  if (!ROOM_ID.test(String(roomId)) || !userId) return null
  try {
    const res = await fetchImpl(`${roomUrl}/${roomId}`, {
      headers: { "x-user-id": String(userId), "x-internal-key": internalKey || "" },
      signal: timeout(timeoutMs),
    })
    if (!res.ok) return res.status >= 500 ? TRANSIENT : null
    const data = await res.json()
    if (!data?.room || !data?.role) return null
    return {
      room: data.room,
      role: data.role,
      roomType: data.room.type || "collab",
      // room-service decides (role + interview lock/status). Older responses fall back to role only.
      canWrite: typeof data.canWrite === "boolean" ? data.canWrite : canWrite(data.role),
    }
  } catch {
    return TRANSIENT                        // network error or timeout: the wrapper retries
  }
}

// Retries transient failures; fails closed only on a definite "no" or after repeated failures.
export const fetchRoomAccess = async (args) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await fetchRoomAccessOnce(args)
    if (result !== TRANSIENT) return result
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
  }
  return null
}

/** Validates shape and size of an incoming Yjs update. Returns a Uint8Array or null. */
export const parseUpdate = (update) => {
  let bytes
  if (Array.isArray(update)) bytes = Uint8Array.from(update)
  else if (update instanceof ArrayBuffer) bytes = new Uint8Array(update)
  else if (ArrayBuffer.isView(update)) bytes = new Uint8Array(update.buffer, update.byteOffset, update.byteLength)
  else return null
  if (bytes.length === 0 || bytes.length > MAX_UPDATE_BYTES) return null
  return bytes
}