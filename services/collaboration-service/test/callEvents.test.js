import test from "node:test"
import assert from "node:assert/strict"
import { recordCallEvent } from "../src/services/callEvents.js"

test("posts the event with both keys", async () => {
  let seen
  const ok = await recordCallEvent({
    roomId: "r1", userId: "u1", type: "call_joined", meta: { as: "candidate" },
    roomUrl: "http://room", internalKey: "ik", eventsKey: "ek",
    fetchImpl: async (url, opts) => { seen = { url, opts }; return { ok: true } },
  })
  assert.equal(ok, true)
  assert.equal(seen.url, "http://room/internal/r1/call-event")
  assert.equal(seen.opts.headers["x-events-key"], "ek")
  assert.equal(seen.opts.headers["x-internal-key"], "ik")
  assert.deepEqual(JSON.parse(seen.opts.body), { userId: "u1", type: "call_joined", as: "candidate" })
})

test("is off without the events key, and swallows network errors", async () => {
  const off = await recordCallEvent({
    roomId: "r", userId: "u", type: "call_left", eventsKey: "", roomUrl: "http://x",
    fetchImpl: async () => { throw new Error("must not be called") },
  })
  assert.equal(off, false)

  const down = await recordCallEvent({
    roomId: "r", userId: "u", type: "call_left", eventsKey: "k", roomUrl: "http://x",
    fetchImpl: async () => { throw new Error("room-service is down") },
  })
  assert.equal(down, false)
})