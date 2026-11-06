import test from "node:test"
import assert from "node:assert/strict"
import { EVENT_TYPES, sanitizeMeta, eventsForPatch, validateSummary, MAX_SUMMARY_CHARS, buildSummarySource } from "../src/utils/report.js"
import { applyInterviewPatch } from "../src/utils/interview.js"

const A = "a".repeat(24), B = "b".repeat(24), E = "e".repeat(24), V = "d".repeat(24)

test("event metadata keeps only small flat primitives", () => {
  const m = sanitizeMeta({ kind: "manual", size: 12, ok: true, nested: { a: 1 }, list: [1], long: "x".repeat(500), nope: undefined })
  assert.deepEqual(Object.keys(m).sort(), ["kind", "long", "ok", "size"])
  assert.equal(m.long.length, 80)
  assert.deepEqual(sanitizeMeta(null), {}); assert.deepEqual(sanitizeMeta([1, 2]), {}); assert.deepEqual(sanitizeMeta("x"), {})
})
test("at most 8 metadata keys are kept", () => {
  const big = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`k${i}`, i]))
  assert.equal(Object.keys(sanitizeMeta(big)).length, 8)
})

const room = (iv = {}) => ({ type: "interview", owner: A, members: [{ userId: A }, { userId: B }], interview: { status: "scheduled", candidateId: B, ...iv } })
const typesFor = (r, patch) => eventsForPatch(applyInterviewPatch(r, patch).set).map(([t]) => t)

test("start, lock/unlock, AI on/off and end map to the right events", () => {
  assert.deepEqual(typesFor(room(), { status: "live" }), ["interview_started"])
  assert.deepEqual(typesFor(room({ status: "live" }), { locked: true }), ["candidate_locked"])
  assert.deepEqual(typesFor(room({ status: "live" }), { locked: false }), ["candidate_unlocked"])
  assert.deepEqual(typesFor(room({ status: "live" }), { aiAssist: true }), ["ai_enabled"])
  assert.deepEqual(typesFor(room({ status: "live" }), { aiAssist: false }), ["ai_disabled"])
  assert.deepEqual(typesFor(room({ status: "live" }), { status: "ended" }), ["interview_ended"])
})
test("a combined patch yields several events in a stable order", () => {
  assert.deepEqual(typesFor(room({ status: "live" }), { locked: true, aiAssist: true, status: "ended" }),
    ["ai_enabled", "candidate_locked", "interview_ended"])
})
test("every event type the code can emit is a known type (the model enum accepts it)", () => {
  const all = [
    ...typesFor(room(), { candidateId: B, status: "live" }), ...typesFor(room({ status: "live" }), { locked: true, aiAssist: true, status: "ended" }),
    "room_created", "member_joined", "snapshot_saved", "scorecard_saved", "summary_saved",
  ]
  for (const t of all) assert.ok(EVENT_TYPES.includes(t), `${t} missing from EVENT_TYPES`)
})

test("summary: accepts text, defaults aiAssisted to false", () => {
  assert.deepEqual(validateSummary({ text: "ok" }).value, { text: "ok", aiAssisted: false })
  assert.equal(validateSummary({ text: "ok", aiAssisted: true }).value.aiAssisted, true)
  assert.equal(validateSummary({ text: "" }).value.text, "")
})
test("summary: rejects wrong types, unknown fields, oversize", () => {
  assert.match(validateSummary({ text: 5 }).error, /string/)
  assert.match(validateSummary({ text: "x", aiAssisted: "yes" }).error, /true or false/)
  assert.match(validateSummary({ text: "x", roomId: "1" }).error, /Unknown field/)
  assert.match(validateSummary({ text: "x".repeat(MAX_SUMMARY_CHARS + 1) }).error, /exceeds/)
  assert.ok(validateSummary(null).error); assert.ok(validateSummary([]).error)
})

const ended = () => ({
  type: "interview", name: "Backend round", language: "javascript", owner: A,
  members: [{ userId: A, username: "alice" }, { userId: B, username: "bob" }, { userId: E, username: "eve", role: "editor" }, { userId: V, username: "vic", role: "viewer" }],
  interview: { status: "ended", candidateId: B, durationMin: 45, startedAt: "2026-01-01T10:00:00Z", endedAt: "2026-01-01T10:30:00Z", aiAssist: false,
               candidateCode: "SECRET1", observerCode: "SECRET2" },
  code: "MAINSECRET",
})
const events = [
  { type: "member_joined", at: "2026-01-01T09:58:00Z", actorName: "bob", meta: { as: "candidate" } },
  { type: "interview_started", at: "2026-01-01T10:00:00Z", actorName: "alice", meta: {} },
  { type: "ai_enabled", at: "2026-01-01T10:05:00Z", actorName: "alice", meta: {} },
  { type: "snapshot_saved", at: "2026-01-01T10:12:30Z", actorName: "bob", meta: { kind: "before-ai", size: 50 } },
  { type: "snapshot_saved", at: "2026-01-01T10:20:00Z", actorName: "bob", meta: { kind: "manual", size: 80 } },
  { type: "interview_ended", at: "2026-01-01T10:30:00Z", actorName: "alice", meta: {} },
]

test("source: participants, roles, minutes, AI usage", () => {
  const s = buildSummarySource({ room: ended(), events, finalSnapshot: { text: "function f(){}", language: "javascript" } })
  const roles = Object.fromEntries(s.participants.map((p) => [p.name, p.role]))
  assert.deepEqual(roles, { alice: "interviewer (owner)", bob: "candidate", eve: "interviewer", vic: "observer" })
  assert.equal(s.actualMinutes, 30)
  assert.equal(s.plannedMinutes, 45)
  assert.equal(s.aiAssistanceWasEnabled, true)
  assert.equal(s.aiChangesAccepted, 1)
  assert.deepEqual(s.timeline.map((e) => e.atMinute), [-2, 0, 5, 12.5, 20, 30])
  assert.equal(s.finalCode.text, "function f(){}")
})
test("source: NEVER contains scorecards, ratings, recommendations or join codes", () => {
  const room = ended()
  room.scorecards = [{ ratings: { problemSolving: 4 }, recommendation: "strong_yes", notes: "great" }]
  const json = JSON.stringify(buildSummarySource({ room, events, finalSnapshot: { text: "x" } }))
  for (const forbidden of ["scorecard", "ratings", "recommendation", "strong_yes", "problemSolving", "great", "SECRET1", "SECRET2", "MAINSECRET"]) {
    assert.ok(!json.includes(forbidden), `source leaked: ${forbidden}`)
  }
})
test("source: long code is truncated and flagged; missing snapshot is null; events are capped", () => {
  const big = buildSummarySource({ room: ended(), events, finalSnapshot: { text: "x".repeat(30_000) } })
  assert.equal(big.finalCode.text.length, 20_000); assert.equal(big.finalCode.truncated, true)
  assert.equal(buildSummarySource({ room: ended(), events }).finalCode, null)
  const many = Array.from({ length: 500 }, () => events[1])
  assert.equal(buildSummarySource({ room: ended(), events: many }).timeline.length, 200)
})
test("source: unstarted interview has no relative minutes", () => {
  const r = ended(); r.interview.startedAt = undefined; r.interview.endedAt = undefined
  const s = buildSummarySource({ room: r, events })
  assert.equal(s.actualMinutes, null); assert.ok(s.timeline.every((e) => e.atMinute === null))
})