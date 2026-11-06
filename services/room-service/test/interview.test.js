import test from "node:test"
import assert from "node:assert/strict"
import { applyInterviewPatch } from "../src/utils/interview.js"

const A = "a".repeat(24), B = "b".repeat(24), C = "c".repeat(24)
const mk = (iv = {}) => ({
  type: "interview", owner: A,
  members: [{ userId: A }, { userId: B }],
  interview: { status: "scheduled", locked: false, ...iv },
})
const err = (r, re) => { assert.ok(r.error, "expected an error"); assert.match(r.error, re) }

test("collab rooms cannot be controlled as interviews", () => {
  err(applyInterviewPatch({ type: "collab" }, { locked: true }), /Not an interview/)
})
test("unknown fields are rejected (no mass assignment)", () => {
  err(applyInterviewPatch(mk(), { owner: B }), /Unknown field/)
  err(applyInterviewPatch(mk(), { "interview.status": "live" }), /Unknown field/)
})
test("candidate must be a member, not the owner, valid id, set before start", () => {
  assert.deepEqual(applyInterviewPatch(mk(), { candidateId: B }).set, { "interview.candidateId": B })
  err(applyInterviewPatch(mk(), { candidateId: C }), /member/)
  err(applyInterviewPatch(mk(), { candidateId: A }), /owner/)
  err(applyInterviewPatch(mk(), { candidateId: "nope" }), /Invalid candidateId/)
  err(applyInterviewPatch(mk({ status: "live", candidateId: B }), { candidateId: B }), /before the interview starts/)
})
test("cannot start without a candidate; can start with one (set now or earlier)", () => {
  err(applyInterviewPatch(mk(), { status: "live" }), /Set a candidate/)
  const a = applyInterviewPatch(mk(), { candidateId: B, status: "live" })
  assert.equal(a.set["interview.status"], "live"); assert.ok(a.set["interview.startedAt"] instanceof Date)
  assert.equal(applyInterviewPatch(mk({ candidateId: B }), { status: "live" }).set["interview.status"], "live")
})
test("status only moves forward; ended is final", () => {
  err(applyInterviewPatch(mk({ status: "live", candidateId: B }), { status: "scheduled" }), /Cannot go from live to scheduled/)
  err(applyInterviewPatch(mk({ status: "ended" }), { locked: true }), /has ended/)
  const e = applyInterviewPatch(mk({ status: "live", candidateId: B }), { status: "ended" })
  assert.ok(e.set["interview.endedAt"] instanceof Date)
})
test("locked must be boolean; duration bounded", () => {
  assert.deepEqual(applyInterviewPatch(mk(), { locked: true }).set, { "interview.locked": true })
  err(applyInterviewPatch(mk(), { locked: "yes" }), /true or false/)
  err(applyInterviewPatch(mk(), { durationMin: 1 }), /5-240/)
  err(applyInterviewPatch(mk(), { durationMin: 45.5 }), /5-240/)
  assert.equal(applyInterviewPatch(mk(), { durationMin: 60 }).set["interview.durationMin"], 60)
})
test("finalText is accepted only together with status ended", () => {
  err(applyInterviewPatch(mk(), { finalText: "x" }), /only accepted when ending/)
  const r = applyInterviewPatch(mk({ status: "live", candidateId: B }), { status: "ended", finalText: "code" })
  assert.equal(r.finalText, "code")
})