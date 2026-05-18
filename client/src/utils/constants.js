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

export const LANGUAGE_EXTENSIONS = {
  javascript: "js",
  typescript: "ts",
  python:     "py",
  java:       "java",
  cpp:        "cpp",
  go:         "go",
}

export const DEFAULT_FILENAME = (language) =>
  `main.${LANGUAGE_EXTENSIONS[language] || language}`


export const SOCKET_EVENTS = {
  JOIN_ROOM:        "join-room",
  YJS_UPDATE:       "yjs-update",
  YJS_SYNC:         "yjs-sync",
  AWARENESS_UPDATE: "awareness-update",
  USER_LEFT:        "user-left",
  ERROR:            "error",
}


export const TERMINAL_OUTPUT_TYPES = {
  OUTPUT: "output",  
  ERROR:  "error",   
  INFO:   "info",   
}


export const EXECUTION_LIMITS = {
  TIMEOUT_MS:    5000,   
  MAX_CODE_SIZE: 50000,  
}