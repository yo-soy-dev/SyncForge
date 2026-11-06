import test from "node:test"
import assert from "node:assert/strict"
import { validateCallEvent, keysMatch, CALL_EVENT_TYPES } from "../src/utils/callEvents.js"
import { EVENT_TYPES, buildSummarySource } from "../src/utils/report.js"

const U = "a".repeat(24)

test("call event types are part of the timeline's event enum", () => {
  for (const t of CALL_EVENT_TYPES) assert.ok(EVENT_TYPES.includes(t))
})

test("a valid event keeps only whitelisted fields", () => {
  const { value } = validateCallEvent({ userId: U, type: "call_left", reason: "disconnected", as: "candidate", username: "forged", at: "2020-01-01" })
  assert.deepEqual(value, { userId: U, type: "call_left", meta: { reason: "disconnected", as: "candidate" } })
})

test("bad input is rejected", () => {
  assert.ok(validateCallEvent(null).error)
  assert.ok(validateCallEvent({ userId: "nope", type: "call_joined" }).error)
  assert.ok(validateCallEvent({ userId: U, type: "interview_ended" }).error)
  assert.ok(validateCallEvent({ userId: U, type: "call_joined", as: "admin" }).error)
  assert.ok(validateCallEvent({ userId: U, type: "call_left", reason: "because" }).error)
})

test("the events key is compared strictly", () => {
  assert.equal(keysMatch("secret", "secret"), true)
  assert.equal(keysMatch("secreT", "secret"), false)
  assert.equal(keysMatch("short", "longer-secret"), false)
  assert.equal(keysMatch("anything", ""), false)
  assert.equal(keysMatch(undefined, "secret"), false)
})

test("call events never reach the AI summary source", () => {
  const room = { name: "r", language: "javascript", interview: { startedAt: new Date(0) }, members: [] }
  const events = [
    { type: "member_joined", at: new Date(1000), actorName: "a", meta: {} },
    { type: "call_joined", at: new Date(2000), actorName: "a", meta: { as: "candidate" } },
    { type: "call_left", at: new Date(3000), actorName: "a", meta: { reason: "disconnected" } },
  ]
  const types = buildSummarySource({ room, events }).timeline.map((e) => e.type)
  assert.deepEqual(types, ["member_joined"])
})
test("screen share events are accepted and are call events", () => {
  assert.equal(validateCallEvent({ userId: U, type: "call_screen_started" }).value.type, "call_screen_started")
  assert.equal(validateCallEvent({ userId: U, type: "call_screen_stopped" }).value.type, "call_screen_stopped")
})