import { roleFor, isCandidate } from "./access.js"

export const EVENT_TYPES = [
  "room_created", "member_joined", "candidate_set", "interview_started", "interview_ended",
  "candidate_locked", "candidate_unlocked", "ai_enabled", "ai_disabled",
  "snapshot_saved", "scorecard_saved", "summary_saved",
  "call_joined", "call_left", "call_screen_started", "call_screen_stopped",
]

// Only small, flat, primitive metadata is stored with an event.
export const sanitizeMeta = (meta) => {
  const out = {}
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return out
  for (const [k, v] of Object.entries(meta).slice(0, 8)) {
    if (typeof v === "string") out[k] = v.slice(0, 80)
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = v
    else if (typeof v === "boolean") out[k] = v
  }
  return out
}

// Pure: which timeline events does an applied interview patch (a Mongo $set map) correspond to?
export const eventsForPatch = (set) => {
  const out = []
  if ("interview.candidateId" in set) out.push(["candidate_set", {}])
  if ("interview.aiAssist" in set) out.push([set["interview.aiAssist"] ? "ai_enabled" : "ai_disabled", {}])
  if ("interview.locked" in set) out.push([set["interview.locked"] ? "candidate_locked" : "candidate_unlocked", {}])
  if (set["interview.status"] === "live") out.push(["interview_started", {}])
  if (set["interview.status"] === "ended") out.push(["interview_ended", {}])
  return out
}

export const MAX_SUMMARY_CHARS = 8000

// Pure: the interviewer's own summary text. aiAssisted records whether it started from an AI draft.
export const validateSummary = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Invalid body" }
  for (const k of Object.keys(body)) {
    if (!["text", "aiAssisted"].includes(k)) return { error: `Unknown field: ${k}` }
  }
  if (typeof body.text !== "string") return { error: "text must be a string" }
  if (body.text.length > MAX_SUMMARY_CHARS) return { error: `Summary exceeds ${MAX_SUMMARY_CHARS} characters` }
  if (body.aiAssisted !== undefined && typeof body.aiAssisted !== "boolean") return { error: "aiAssisted must be true or false" }
  return { value: { text: body.text, aiAssisted: body.aiAssisted === true } }
}

const MAX_CODE_CHARS = 20_000
const MAX_EVENTS = 200

const roleLabel = (room, m) => {
  if (String(room.owner) === String(m.userId)) return "interviewer (owner)"
  if (isCandidate(room, m.userId)) return "candidate"
  const r = roleFor(room, m.userId)
  return r === "viewer" ? "observer" : "interviewer"
}

// Pure: the factual material an AI summary may use. Deliberately EXCLUDES scorecards,
// ratings and recommendations: a draft describes what happened, it never evaluates anyone.
export const buildSummarySource = ({ room, events = [], finalSnapshot = null }) => {
  const iv = room.interview || {}
  const start = iv.startedAt ? new Date(iv.startedAt).getTime() : null
  const end = iv.endedAt ? new Date(iv.endedAt).getTime() : null

   // Call join/leave times are connectivity facts, not performance. They stay out of the AI draft on purpose.
  const timeline = events.filter((e) => !e.type.startsWith("call_")).slice(0, MAX_EVENTS).map((e) => {
    const t = new Date(e.at).getTime()
    return {
      atMinute: start === null ? null : Math.round(((t - start) / 60000) * 10) / 10,
      type: e.type,
      actor: e.actorName || "",
      detail: e.meta && Object.keys(e.meta).length ? e.meta : undefined,
    }
  })

  let finalCode = null
  if (finalSnapshot && typeof finalSnapshot.text === "string") {
    finalCode = {
      language: finalSnapshot.language || room.language,
      text: finalSnapshot.text.slice(0, MAX_CODE_CHARS),
      truncated: finalSnapshot.text.length > MAX_CODE_CHARS,
    }
  }

  return {
    title: room.name,
    language: room.language,
    status: iv.status,
    plannedMinutes: iv.durationMin ?? null,
    actualMinutes: start !== null && end !== null ? Math.round(((end - start) / 60000) * 10) / 10 : null,
    participants: (room.members || []).map((m) => ({ name: m.username || "Unknown", role: roleLabel(room, m) })),
    aiAssistanceWasEnabled: events.some((e) => e.type === "ai_enabled") || iv.aiAssist === true,
    aiChangesAccepted: events.filter((e) => e.type === "snapshot_saved" && e.meta?.kind === "before-ai").length,
    timeline,
    finalCode,
  }
}