// Sab services mein common constants
// Magic numbers aur strings ek jagah

export const HTTP_STATUS = {
  OK:                    200,
  CREATED:               201,
  NO_CONTENT:            204,
  BAD_REQUEST:           400,
  UNAUTHORIZED:          401,
  FORBIDDEN:             403,
  NOT_FOUND:             404,
  CONFLICT:              409,
  TOO_MANY_REQUESTS:     429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE:   503,
}

export const REDIS_KEYS = {
  SESSION:    (userId) => `session:${userId}`,       // auth
  ROOM:       (roomId) => `room:${roomId}`,           // room cache
  ROOM_CODE:  (code)   => `room:code:${code}`,        // room by code
  YDOC:       (roomId) => `ydoc:${roomId}`,           // yjs doc
  RATE_LIMIT: (ip)     => `rate_limit:${ip}`,         // rate limiter
}

export const REDIS_TTL = {
  SESSION:    7 * 24 * 60 * 60,   // 7 din
  ROOM:       60 * 60,            // 1 ghanta
  YDOC:       7 * 24 * 60 * 60,   // 7 din
  RATE_LIMIT: 15 * 60,            // 15 min
}

export const SOCKET_EVENTS = {
  // Client → Server
  JOIN_ROOM:        "join-room",
  YJS_UPDATE:       "yjs-update",
  AWARENESS_UPDATE: "awareness-update",

  // Server → Client
  YJS_SYNC:         "yjs-sync",
  USER_LEFT:        "user-left",
  ERROR:            "error",
}

export const LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "java",
  "cpp",
  "go",
]