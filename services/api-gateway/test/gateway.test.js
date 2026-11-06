import test from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import { isPublicRoute, stripIdentityHeaders, authenticate } from "../src/middleware/auth.js"
import { makeLimiter, resolveLimit } from "../src/middleware/rateLimit.core.js"

const req = (method, originalUrl, headers = {}) => ({ method, originalUrl, url: originalUrl, headers })
const mkRes = () => {
  const r = { code: null, body: null, headers: {} }
  r.status = (c) => { r.code = c; return r }
  r.json = (b) => { r.body = b; return r }
  r.setHeader = (k, v) => { r.headers[k] = v }
  return r
}

test("login/signup are public; anything else is not", () => {
  assert.equal(isPublicRoute(req("POST", "/api/auth/login")), true)
  assert.equal(isPublicRoute(req("POST", "/api/auth/signup?x=1")), true)
  assert.equal(isPublicRoute(req("POST", "/api/auth/login-anything")), false)
  assert.equal(isPublicRoute(req("GET", "/api/auth/login")), false)
  assert.equal(isPublicRoute(req("POST", "/api/execute/run")), false)
  assert.equal(isPublicRoute(req("POST", "/api/ai/chat")), false)
})

test("client-supplied identity headers are stripped", () => {
  const r = req("GET", "/api/rooms/my-rooms", {
    "x-user-id": "victim", "x-user-data": "{}", "x-internal-key": "guess", authorization: "Bearer t",
  })
  stripIdentityHeaders(r, mkRes(), () => {})
  assert.equal(r.headers["x-user-id"], undefined)
  assert.equal(r.headers["x-user-data"], undefined)
  assert.equal(r.headers["x-internal-key"], undefined)
  assert.equal(r.headers.authorization, "Bearer t")
})

test("authenticate: rejects missing/invalid token, accepts valid and sets verified identity", async () => {
  const srv = http.createServer((q, s) => {
    const ok = q.headers.authorization === "Bearer good"
    s.writeHead(ok ? 200 : 401, { "content-type": "application/json" })
    s.end(JSON.stringify(ok ? { success: true, user: { userId: "u1", username: "ünïcode" } } : { success: false }))
  })
  await new Promise((r) => srv.listen(0, r))
  process.env.AUTH_SERVICE_URL = `http://127.0.0.1:${srv.address().port}`
  try {
    let res = mkRes(); let called = false
    await authenticate(req("POST", "/api/execute/run"), res, () => { called = true })
    assert.equal(res.code, 401); assert.equal(called, false)

    res = mkRes(); called = false
    await authenticate(req("POST", "/api/execute/run", { authorization: "Bearer bad" }), res, () => { called = true })
    assert.equal(res.code, 401); assert.equal(called, false)

    res = mkRes(); called = false
    const good = req("GET", "/api/rooms/my-rooms", { authorization: "Bearer good", "x-user-id": "forged" })
    await authenticate(good, res, () => { called = true })
    assert.equal(called, true)
    assert.equal(good.headers["x-user-id"], "u1")
    assert.equal(JSON.parse(decodeURIComponent(good.headers["x-user-data"])).username, "ünïcode")
  } finally { srv.close() }
})

test("authenticate: auth-service down => 503, never lets request through", async () => {
  process.env.AUTH_SERVICE_URL = "http://127.0.0.1:1"
  const res = mkRes(); let called = false
  await authenticate(req("GET", "/api/rooms/x", { authorization: "Bearer t" }), res, () => { called = true })
  assert.equal(res.code, 503); assert.equal(called, false)
})

const fakeRedis = () => {
  const m = new Map()
  return {
    broken: false,
    async incr(k) { if (this.broken) throw new Error("down"); m.set(k, (m.get(k) || 0) + 1); return m.get(k) },
    async expire() {}, async ttl() { return 42 },
  }
}

test("per-route limits are actually applied", () => {
  assert.equal(resolveLimit("/api/execute/run").max, 150)
  assert.equal(resolveLimit("/api/ai/chat").max, 60)
  assert.equal(resolveLimit("/api/rooms/x").max, 600)
  assert.equal(resolveLimit("/api/executefoo").prefix, "default")
})

test("limiter blocks after max and sets Retry-After", async () => {
  const redis = fakeRedis()
  const lim = makeLimiter({ redis, keyFn: () => "ip:1", pathFn: (r) => r.originalUrl })
  let last
  for (let i = 0; i < 61; i++) { last = mkRes(); await lim(req("POST", "/api/execute/run"), last, () => {}) }
  assert.equal(last.code, 429); assert.equal(last.headers["Retry-After"], 42)
})

test("redis failure: execute fails CLOSED, ordinary routes fail open", async () => {
  const redis = fakeRedis(); redis.broken = true
  const lim = makeLimiter({ redis, keyFn: () => "ip:1", pathFn: (r) => r.originalUrl })
  let res = mkRes(); let called = false
  await lim(req("POST", "/api/execute/run"), res, () => { called = true })
  assert.equal(res.code, 503); assert.equal(called, false)
  res = mkRes(); called = false
  await lim(req("GET", "/api/rooms/x"), res, () => { called = true })
  assert.equal(called, true)
})