import test from "node:test"
import assert from "node:assert/strict"
import { decideInterviewJoin, sanitizeRoomForViewer } from "../src/utils/interview.js"
import { validateScorecard, MAX_NOTES } from "../src/utils/scorecard.js"
import { isInterviewer, canAskAI } from "../src/utils/access.js"

const A = "a".repeat(24), B = "b".repeat(24), C = "c".repeat(24), V = "d".repeat(24), E = "e".repeat(24)
const room = (iv = {}, members = [{ userId: A }]) => ({
  type: "interview", owner: A, code: "MAINCODE",
  members, interview: { status: "scheduled", candidateCode: "CAND123", observerCode: "OBS123", ...iv },
})

test("candidate link: first stranger joins; second stranger is refused (single use)", () => {
  assert.equal(decideInterviewJoin(room(), "candidate", B).action, "join")
  const used = room({ candidateId: B }, [{ userId: A }, { userId: B }])
  const r = decideInterviewJoin(used, "candidate", C)
  assert.equal(r.action, "reject"); assert.equal(r.status, 409); assert.match(r.message, /already been used/)
})
test("candidate can reconnect with their own link", () => {
  const used = room({ candidateId: B }, [{ userId: A }, { userId: B }])
  assert.equal(decideInterviewJoin(used, "candidate", B).action, "rejoin")
})
test("owner or an existing member cannot become the candidate", () => {
  assert.equal(decideInterviewJoin(room(), "candidate", A).action, "reject")
  const withEditor = room({}, [{ userId: A }, { userId: E, role: "editor" }])
  assert.equal(decideInterviewJoin(withEditor, "candidate", E).action, "reject")
})
test("observer link joins as a new member; viewers may rejoin; others rejected", () => {
  assert.equal(decideInterviewJoin(room(), "observer", C).action, "join")
  const withViewer = room({}, [{ userId: A }, { userId: V, role: "viewer" }])
  assert.equal(decideInterviewJoin(withViewer, "observer", V).action, "rejoin")
  const withEditor = room({}, [{ userId: A }, { userId: E, role: "editor" }])
  assert.equal(decideInterviewJoin(withEditor, "observer", E).action, "reject")
  assert.equal(decideInterviewJoin(room(), "observer", A).action, "reject")
})
test("no new joins once the interview has ended", () => {
  const ended = room({ status: "ended" })
  assert.equal(decideInterviewJoin(ended, "candidate", B).action, "reject")
  assert.equal(decideInterviewJoin(ended, "observer", C).action, "reject")
})

test("owner sees all codes; everyone else sees none", () => {
  const r = room()
  assert.equal(sanitizeRoomForViewer(r, "owner").code, "MAINCODE")
  assert.equal(sanitizeRoomForViewer(r, "owner").interview.candidateCode, "CAND123")
  for (const role of ["editor", "viewer"]) {
    const s = sanitizeRoomForViewer(r, role)
    assert.equal(s.code, undefined)
    assert.equal(s.interview.candidateCode, undefined)
    assert.equal(s.interview.observerCode, undefined)
    assert.equal(s.interview.status, "scheduled")
  }
})
test("sanitising never mutates the original and leaves collab rooms alone", () => {
  const r = room(); sanitizeRoomForViewer(r, "viewer")
  assert.equal(r.code, "MAINCODE"); assert.equal(r.interview.candidateCode, "CAND123")
  const collab = { type: "collab", code: "X", members: [] }
  assert.equal(sanitizeRoomForViewer(collab, "viewer"), collab)
})

test("interviewers = owner + editors, never the candidate, observers or outsiders", () => {
  const r = room({ candidateId: B }, [{ userId: A }, { userId: B }, { userId: E, role: "editor" }, { userId: V, role: "viewer" }])
  assert.equal(isInterviewer(r, A), true)
  assert.equal(isInterviewer(r, E), true)
  assert.equal(isInterviewer(r, B), false)
  assert.equal(isInterviewer(r, V), false)
  assert.equal(isInterviewer(r, C), false)
  assert.equal(isInterviewer({ ...r, type: "collab" }, A), false)
})

test("valid scorecard passes; ratings 1-4 or null", () => {
  const { value } = validateScorecard({ ratings: { problemSolving: 3, testing: null }, notes: "good", recommendation: "yes" })
  assert.deepEqual(value.ratings, { problemSolving: 3, testing: null })
  assert.equal(value.recommendation, "yes")
})
test("out-of-range, fractional and unknown ratings are rejected", () => {
  assert.match(validateScorecard({ ratings: { codeQuality: 5 } }).error, /1-4/)
  assert.match(validateScorecard({ ratings: { codeQuality: 0 } }).error, /1-4/)
  assert.match(validateScorecard({ ratings: { codeQuality: 2.5 } }).error, /1-4/)
  assert.match(validateScorecard({ ratings: { charisma: 4 } }).error, /Unknown rating/)
})
test("unknown top-level fields, bad recommendation and oversize notes are rejected", () => {
  assert.match(validateScorecard({ roomId: "x" }).error, /Unknown field/)
  assert.match(validateScorecard({ recommendation: "hire!" }).error, /recommendation/)
  assert.match(validateScorecard({ notes: "a".repeat(MAX_NOTES + 1) }).error, /exceed/)
  assert.match(validateScorecard({ notes: 5 }).error, /string/)
  assert.ok(validateScorecard({ recommendation: null }).value)
})
test("non-object bodies are errors, not crashes", () => {
  assert.ok(validateScorecard(undefined).error); assert.ok(validateScorecard([]).error); assert.ok(validateScorecard("x").error)
})



// ---------- Phase 3: AI assistance permission ----------
import { canUseAI } from "../src/utils/access.js"
import { applyInterviewPatch } from "../src/utils/interview.js"

const ai = (iv = {}, members = [{ userId: A }, { userId: B }, { userId: V, role: "viewer" }]) => ({
  isActive: true, type: "interview", owner: A, members,
  interview: { candidateId: B, status: "live", locked: false, aiAssist: false, ...iv },
})

test("collab rooms: anyone who can write may use AI; viewers and outsiders may not", () => {
  const collab = { isActive: true, type: "collab", owner: A, members: [{ userId: A }, { userId: B }, { userId: V, role: "viewer" }] }
  assert.equal(canUseAI(collab, A), true)
  assert.equal(canUseAI(collab, B), true)
  assert.equal(canUseAI(collab, V), false)
  assert.equal(canUseAI(collab, C), false)
})
test("interview: AI is OFF by default for everyone, including the interviewer", () => {
  assert.equal(canUseAI(ai(), A), false)
  assert.equal(canUseAI(ai(), B), false)
})
test("interview: when enabled, those who can write may use it; observers never", () => {
  assert.equal(canUseAI(ai({ aiAssist: true }), A), true)
  assert.equal(canUseAI(ai({ aiAssist: true }), B), true)
  assert.equal(canUseAI(ai({ aiAssist: true }), V), false)
})
test("interview: a locked, not-started or ended room blocks AI for the candidate (cannot accept anyway)", () => {
  assert.equal(canUseAI(ai({ aiAssist: true, locked: true }), B), false)
  assert.equal(canUseAI(ai({ aiAssist: true, status: "scheduled" }), B), false)
  assert.equal(canUseAI(ai({ aiAssist: true, status: "ended" }), A), false)
})
test("owner can switch aiAssist; it must be a boolean", () => {
  const room = { type: "interview", owner: A, members: [{ userId: A }, { userId: B }], interview: { status: "live", candidateId: B } }
  assert.deepEqual(applyInterviewPatch(room, { aiAssist: true }).set, { "interview.aiAssist": true })
  assert.match(applyInterviewPatch(room, { aiAssist: "yes" }).error, /true or false/)
})







const aiRoom = (type, iv = {}, members = [{ userId: A }, { userId: B }, { userId: V, role: "viewer" }]) =>
  type === "interview"
    ? { isActive: true, type, owner: A, members, interview: { candidateId: B, status: "live", locked: false, aiAssist: false, ...iv } }
    : { isActive: true, type, owner: A, members }

test("collab rooms: any member may use AI features, including viewers; outsiders may not", () => {
  const r = aiRoom("collab")
  assert.equal(canAskAI(r, A), true); assert.equal(canAskAI(r, B), true); assert.equal(canAskAI(r, V), true)
  assert.equal(canAskAI(r, C), false)
})
test("collab: a deleted room grants nothing", () => {
  assert.equal(canAskAI({ ...aiRoom("collab"), isActive: false }, A), false)
})
test("interview: ALL AI features are off by default, for everyone", () => {
  const r = aiRoom("interview")
  for (const u of [A, B, V, C]) assert.equal(canAskAI(r, u), false, u)
})
test("interview: when the owner enables AI, only people who can edit get it; observers never", () => {
  const r = aiRoom("interview", { aiAssist: true })
  assert.equal(canAskAI(r, A), true); assert.equal(canAskAI(r, B), true)
  assert.equal(canAskAI(r, V), false); assert.equal(canAskAI(r, C), false)
})
test("interview: locked, not-started or ended rooms block AI for the candidate", () => {
  assert.equal(canAskAI(aiRoom("interview", { aiAssist: true, locked: true }), B), false)
  assert.equal(canAskAI(aiRoom("interview", { aiAssist: true, status: "scheduled" }), B), false)
  assert.equal(canAskAI(aiRoom("interview", { aiAssist: true, status: "ended" }), A), false)
})