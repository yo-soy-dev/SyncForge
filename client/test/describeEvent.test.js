import test from "node:test"
import assert from "node:assert/strict"
import { describeEvent } from "../utils/reportMarkdown.js"

test("call events read naturally", () => {
  assert.equal(describeEvent({ type: "call_joined", actorName: "sam", meta: { as: "candidate" } }), "sam joined the video call as candidate")
  assert.equal(describeEvent({ type: "call_joined", actorName: "sam", meta: {} }), "sam joined the video call")
  assert.equal(describeEvent({ type: "call_left", actorName: "sam", meta: { reason: "left" } }), "sam left the video call")
  assert.equal(describeEvent({ type: "call_left", actorName: "sam", meta: { reason: "disconnected" } }), "sam lost connection to the video call")
  assert.equal(describeEvent({ type: "call_left", actorName: "olga", meta: { reason: "removed" } }), "olga was removed from the video call")
  assert.equal(describeEvent({ type: "call_left", actorName: "sam", meta: { reason: "closed" } }), "sam was disconnected when the interview ended")
})

test("an unknown reason falls back to a neutral line, and names cannot inject lines", () => {
  assert.equal(describeEvent({ type: "call_left", actorName: "sam", meta: {} }), "sam left the video call")
  assert.equal(describeEvent({ type: "call_joined", actorName: "a\n# Heading", meta: {} }), "a # Heading joined the video call")
})