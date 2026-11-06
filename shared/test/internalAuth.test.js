import test from "node:test"
import assert from "node:assert/strict"
import { requireInternalKey } from "../middleware/internalAuth.js"

const run = (mw, headers = {}) => {
  const out = { nextCalled: false, status: null }
  const res = { status(c) { out.status = c; return this }, json() { return this } }
  mw({ headers }, res, () => { out.nextCalled = true })
  return out
}

test("rejects when header missing", () => {
  const r = run(requireInternalKey("k"), {})
  assert.equal(r.status, 401); assert.equal(r.nextCalled, false)
})
test("rejects wrong key", () => {
  const r = run(requireInternalKey("secret-1"), { "x-internal-key": "secret-2" })
  assert.equal(r.status, 401)
})
test("rejects key of different length without throwing", () => {
  const r = run(requireInternalKey("secret"), { "x-internal-key": "s" })
  assert.equal(r.status, 401)
})
test("accepts correct key", () => {
  const r = run(requireInternalKey("secret"), { "x-internal-key": "secret" })
  assert.equal(r.nextCalled, true)
})
test("fails closed when no key configured", () => {
  delete process.env.INTERNAL_API_KEY
  const r = run(requireInternalKey(), { "x-internal-key": "anything" })
  assert.equal(r.status, 503); assert.equal(r.nextCalled, false)
})