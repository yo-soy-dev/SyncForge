import { fenceFor } from "./exportMarkdown.js"

// Pure helpers: no browser APIs, so they can be tested with plain Node.

const RATINGS = [
  ["problemSolving", "Problem solving"],
  ["codeQuality", "Code quality"],
  ["communication", "Communication"],
  ["testing", "Testing"],
]
const RECS = { strong_no: "Strong no", no: "No", yes: "Yes", strong_yes: "Strong yes" }
const SNAPSHOT_KIND = {
  manual: "saved a snapshot", auto: "auto-saved a snapshot", "before-ai": "accepted an AI suggestion (restore point saved)",
  "before-restore": "restored an earlier snapshot", "interview-end": "final code saved",
}

// Names and labels go on one line; they must never inject headings or list items.
const oneLine = (v) => String(v ?? "").replace(/\s+/g, " ").trim()

// Free text is quoted line by line, so headings or fences inside it cannot restructure the report.
const quote = (text) => String(text ?? "").split(/\r?\n/).map((l) => `> ${l}`).join("\n")

const CALL_LEFT = {
  left: "left the video call",
  disconnected: "lost connection to the video call", // says what happened, not that they chose to leave
  removed: "was removed from the video call",
  closed: "was disconnected when the interview ended",
}

export const describeEvent = (e) => {
  const who = oneLine(e.actorName) || "Someone"
  switch (e.type) {
    case "room_created": return `${who} created the interview room`
    case "member_joined": return `${who} joined as ${oneLine(e.meta?.as) || "a member"}`
    case "candidate_set": return `${who} set the candidate`
    case "interview_started": return `${who} started the interview`
    case "interview_ended": return `${who} ended the interview`
    case "candidate_locked": return `${who} locked the candidate's editor`
    case "candidate_unlocked": return `${who} unlocked the candidate's editor`
    case "ai_enabled": return `${who} turned AI suggestions on`
    case "ai_disabled": return `${who} turned AI suggestions off`
    case "snapshot_saved": return `${who} ${SNAPSHOT_KIND[e.meta?.kind] || "saved a snapshot"}`
    case "scorecard_saved": return `${who} saved a scorecard`
    case "summary_saved": return `${who} saved the summary${e.meta?.aiAssisted ? " (started from an AI draft)" : ""}`
    case "call_joined": return `${who} joined the video call${e.meta?.as ? ` as ${oneLine(e.meta.as)}` : ""}`
    case "call_left": return `${who} ${CALL_LEFT[e.meta?.reason] || "left the video call"}`
    case "call_screen_started": return `${who} started sharing their screen`
    case "call_screen_stopped": return `${who} stopped sharing their screen`
    default: return `${who}: ${oneLine(e.type)}`
  }
}

const minutes = (iso, startIso) => {
  if (!startIso) return null
  return Math.round(((new Date(iso) - new Date(startIso)) / 60000) * 10) / 10
}

export const formatOffset = (m) => (m === null ? "" : m < 0 ? `${Math.abs(m)} min before start` : `+${m} min`)

export const buildReportMarkdown = ({ room, events = [], summary = null, scorecards = [], finalCode = "", exportedAt = new Date(), exportedBy = "" }) => {
  const iv = room.interview || {}
  const lang = room.language || "text"
  const members = room.members || []
  const roleOf = (m) =>
    String(room.owner) === String(m.userId) ? "interviewer (owner)"
      : String(iv.candidateId) === String(m.userId) ? "candidate"
        : m.role === "viewer" ? "observer" : "interviewer"

  const actual = iv.startedAt && iv.endedAt ? Math.round(((new Date(iv.endedAt) - new Date(iv.startedAt)) / 60000) * 10) / 10 : null
  const accepted = events.filter((e) => e.type === "snapshot_saved" && e.meta?.kind === "before-ai").length
  const aiOn = events.some((e) => e.type === "ai_enabled") || iv.aiAssist === true

  const out = [
    `# Interview report: ${oneLine(room.name) || "Untitled"}`,
    `Exported ${new Date(exportedAt).toISOString()}${exportedBy ? ` by ${oneLine(exportedBy)}` : ""}. Confidential: contains interviewer notes.`,
    "",
    "## Overview",
    `- Status: ${oneLine(iv.status)}`,
    `- Language: ${oneLine(lang)}`,
    `- Planned duration: ${iv.durationMin ?? "not set"} min`,
    `- Started: ${iv.startedAt ? new Date(iv.startedAt).toISOString() : "not started"}`,
    `- Ended: ${iv.endedAt ? new Date(iv.endedAt).toISOString() : "not ended"}`,
    `- Actual duration: ${actual === null ? "not recorded" : `${actual} min`}`,
    `- AI suggestions: ${aiOn ? `enabled, ${accepted} accepted` : "not enabled"}`,
    `- Participants: ${members.map((m) => `${oneLine(m.username) || "Unknown"} (${roleOf(m)})`).join(", ") || "none"}`,
    "",
    "## Timeline",
  ]

  if (events.length === 0) out.push("_No events recorded._")
  for (const e of events) {
    const off = formatOffset(minutes(e.at, iv.startedAt))
    out.push(`- ${new Date(e.at).toISOString()}${off ? ` (${off})` : ""}: ${describeEvent(e)}`)
  }
  out.push("_Joins through the live editor, disconnects and reconnects are not recorded._", "")

  out.push("## Summary")
  if (summary?.text?.trim()) {
    out.push(quote(summary.text))
    out.push(`_${summary.aiAssisted ? "Started from an AI draft and edited by" : "Written by"} ${oneLine(summary.updatedByName) || "the interviewer"}. The interviewer is responsible for its content._`)
  } else out.push("_No summary written._")
  out.push("")

  out.push("## Scorecards", "_The interviewers' own assessments. Nothing in this report is scored or recommended by AI._")
  if (scorecards.length === 0) out.push("", "_None visible to you._")
  for (const s of scorecards) {
    out.push("", `### ${oneLine(s.interviewerName) || "Interviewer"}`)
    for (const [k, label] of RATINGS) out.push(`- ${label}: ${s.ratings?.[k] ?? "not rated"}`)
    out.push(`- Recommendation: ${s.recommendation ? RECS[s.recommendation] : "none"}`)
    if (s.notes?.trim()) out.push("", quote(s.notes))
  }

  const code = String(finalCode ?? "")
  const f = fenceFor(code)
  out.push("", "## Final code", `${f}${oneLine(lang)}`, code, f)
  return out.join("\n") + "\n"
}