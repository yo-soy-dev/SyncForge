import crypto from "crypto"

export const CALL_EVENT_TYPES = ["call_joined", "call_left", "call_screen_started", "call_screen_stopped", "call_screen_started", "call_screen_stopped"]
export const MAX_CALL_EVENTS_PER_USER = 30

const OBJECT_ID = /^[a-f0-9]{24}$/i
const LABELS = new Set(["interviewer", "candidate", "observer"])
const REASONS = new Set(["left", "disconnected", "removed", "closed"])

// Pure: returns { value } or { error }. Only whitelisted fields survive; the username comes from the room, never the body.
export const validateCallEvent = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Invalid body" }
  const { userId, type, as, reason } = body

  if (typeof userId !== "string" || !OBJECT_ID.test(userId)) return { error: "Invalid user" }
  if (!CALL_EVENT_TYPES.includes(type)) return { error: "Invalid event type" }

  const meta = {}
  if (as !== undefined) {
    if (!LABELS.has(as)) return { error: "Invalid role label" }
    meta.as = as
  }
  if (type === "call_left" && reason !== undefined) {
    if (!REASONS.has(reason)) return { error: "Invalid reason" }
    meta.reason = reason
  }
  return { value: { userId, type, meta } }
}

// Constant-time comparison, so the key can't be guessed byte by byte.
export const keysMatch = (given, expected) => {
  if (typeof given !== "string" || typeof expected !== "string" || !expected) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}