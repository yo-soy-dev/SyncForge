export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000"

export const LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "java",
  "cpp",
  "go",
]

export const SOCKET_EVENTS = {
  JOIN_ROOM:        "join-room",
  YJS_UPDATE:       "yjs-update",
  YJS_SYNC:         "yjs-sync",
  AWARENESS_UPDATE: "awareness-update",
  USER_LEFT:        "user-left",
  ERROR:            "error",
}