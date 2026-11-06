export const MAX_SNAPSHOT_CHARS = 150_000
export const MAX_SNAPSHOTS_PER_ROOM = 200
export const CLIENT_KINDS = ["manual", "auto", "before-ai", "before-restore"]  // "interview-end" is server-only
export const LANGUAGES = ["javascript", "python", "typescript", "java", "cpp", "go"]

// Pure: returns { value } or { error }.
export const validateSnapshotInput = (body = {}) => {
  const { text, language, kind } = body
  if (typeof text !== "string") return { error: "text must be a string" }
  if (text.length > MAX_SNAPSHOT_CHARS) return { error: `text exceeds ${MAX_SNAPSHOT_CHARS} characters` }
  const k = kind ?? "manual"
  if (!CLIENT_KINDS.includes(k)) return { error: "Invalid kind" }
  const lang = language ?? "javascript"
  if (!LANGUAGES.includes(lang)) return { error: "Invalid language" }
  return { value: { text, language: lang, kind: k, size: text.length } }
}