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
  SESSION:    (userId) => `session:${userId}`,      
  ROOM:       (roomId) => `room:${roomId}`,           
  ROOM_CODE:  (code)   => `room:code:${code}`,        
  YDOC:       (roomId) => `ydoc:${roomId}`,          
  RATE_LIMIT: (ip)     => `rate_limit:${ip}`,         
}

export const REDIS_TTL = {
  SESSION:    7 * 24 * 60 * 60,  
  ROOM:       60 * 60,            
  YDOC:       7 * 24 * 60 * 60,   
  RATE_LIMIT: 15 * 60,            
}

export const SOCKET_EVENTS = {
  
  JOIN_ROOM:        "join-room",
  YJS_UPDATE:       "yjs-update",
  AWARENESS_UPDATE: "awareness-update",

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