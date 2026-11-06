import test from "node:test"
import assert from "node:assert/strict"
import { buildReportMarkdown, describeEvent, formatOffset } from "../src/utils/reportMarkdown.js"

const A = "a".repeat(24), B = "b".repeat(24), V = "d".repeat(24)
const room = {
  name: "Backend round", language: "javascript", owner: A,
  members: [{ userId: A, username: "alice" }, { userId: B, username: "bob" }, { userId: V, username: "vic", role: "viewer" }],
  interview: { status: "ended", candidateId: B, durationMin: 45, startedAt: "2026-01-01T10:00:00Z", endedAt: "2026-01-01T10:30:00Z", aiAssist: true },
}
const events = [
  { type: "member_joined", at: "2026-01-01T09:58:00Z", actorName: "bob", meta: { as: "candidate" } },
  { type: "interview_started", at: "2026-01-01T10:00:00Z", actorName: "alice", meta: {} },
  { type: "snapshot_saved", at: "2026-01-01T10:12:30Z", actorName: "bob", meta: { kind: "before-ai" } },
  { type: "interview_ended", at: "2026-01-01T10:30:00Z", actorName: "alice", meta: {} },
]
const base = { room, events, summary: { text: "Went well.", aiAssisted: true, updatedByName: "alice" }, scorecards: [], finalCode: "let a = 1" }

test("overview: roles, duration and AI usage", () => {
  const md = buildReportMarkdown({ ...base, exportedAt: new Date(0) })
  assert.match(md, /^# Interview report: Backend round/)
  assert.match(md, /alice \(interviewer \(owner\)\), bob \(candidate\), vic \(observer\)/)
  assert.match(md, /Actual duration: 30 min/)
  assert.match(md, /AI suggestions: enabled, 1 accepted/)
})
test("timeline shows offsets from the start and plain-language events", () => {
  const md = buildReportMarkdown(base)
  assert.match(md, /\(2 min before start\): bob joined as candidate/)
  assert.match(md, /\(\+12.5 min\): bob accepted an AI suggestion/)
  assert.match(md, /not recorded/)
  assert.equal(formatOffset(null), ""); assert.equal(formatOffset(5), "+5 min")
})
test("the summary says whether it began as an AI draft and who owns it", () => {
  assert.match(buildReportMarkdown(base), /Started from an AI draft and edited by alice/)
  const human = buildReportMarkdown({ ...base, summary: { text: "Mine.", aiAssisted: false, updatedByName: "alice" } })
  assert.match(human, /Written by alice/); assert.doesNotMatch(human, /AI draft and edited/)
  assert.match(buildReportMarkdown({ ...base, summary: null }), /No summary written/)
})
test("free text cannot inject headings: summary and notes are quoted line by line", () => {
  const md = buildReportMarkdown({
    ...base,
    summary: { text: "ok\n# Fake heading\n```\nbreakout", aiAssisted: false, updatedByName: "alice" },
    scorecards: [{ interviewerName: "alice\n## Evil", ratings: { problemSolving: 3 }, recommendation: "yes", notes: "n1\n## Injected" }],
  })
  assert.doesNotMatch(md, /^# Fake heading/m)
  assert.doesNotMatch(md, /^## Injected/m)
  assert.doesNotMatch(md, /^## Evil/m)
  assert.match(md, /^> # Fake heading$/m)
  assert.match(md, /^### alice ## Evil$/m)
})
test("scorecards list ratings, 'not rated' and the human recommendation", () => {
  const md = buildReportMarkdown({ ...base, scorecards: [{ interviewerName: "alice", ratings: { problemSolving: 3, testing: null }, recommendation: "strong_yes", notes: "" }] })
  assert.match(md, /Problem solving: 3/); assert.match(md, /Testing: not rated/); assert.match(md, /Recommendation: Strong yes/)
  assert.match(md, /Nothing in this report is scored or recommended by AI/)
})
test("final code is fenced with a fence longer than any backticks inside it", () => {
  const md = buildReportMarkdown({ ...base, finalCode: "const s = '```'\n## not a heading" })
  const lines = md.split("\n"); const open = lines.findIndex((l) => l.startsWith("````javascript"))
  assert.ok(open > -1); assert.equal(lines[open + 3], "````")
})
test("describeEvent never throws on odd data", () => {
  assert.match(describeEvent({ type: "mystery", actorName: "x" }), /x: mystery/)
  assert.match(describeEvent({ type: "snapshot_saved", actorName: "x\ny", meta: { kind: "???" } }), /^x y saved a snapshot$/)
})