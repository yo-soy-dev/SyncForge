import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import express from "express"
import { createRoomAIGuard } from "../src/middleware/roomAI.guard.js"

const ROOM = "1".repeat(24), USER = "a".repeat(24)
const mkRes = () => { const r = { code: null, body: null }; r.status = (c) => { r.code = c; return r }; r.json = (b) => { r.body = b; return r }; return r }
const run = async ({ headers = { "x-user-id": USER }, body = { roomId: ROOM }, access }) => {
  let nextCalled = false
  const guard = createRoomAIGuard({ fetchAccess: async () => access })
  const res = mkRes(); await guard({ headers, body }, res, () => { nextCalled = true })
  return { res, nextCalled }
}

test("no verified identity => 401; identity cannot come from the body", async () => {
  assert.equal((await run({ headers: {}, access: { canAskAI: true } })).res.code, 401)
  assert.equal((await run({ headers: {}, body: { roomId: ROOM, userId: USER }, access: { canAskAI: true } })).res.code, 401)
})
test("missing or malformed roomId => 400, handler never reached", async () => {
  for (const body of [{}, { roomId: "../x" }, { roomId: 5 }, null]) {   // null = no body at all
    const r = await run({ body, access: { canAskAI: true } })
    assert.equal(r.res.code, 400); assert.equal(r.nextCalled, false)
  }
})
test("not a member => 403; handler never reached", async () => {
  const r = await run({ access: null }); assert.equal(r.res.code, 403); assert.equal(r.nextCalled, false)
})
test("interview with AI off => 403 with a clear message; collab non-access => generic 403", async () => {
  const off = await run({ access: { canAskAI: false, roomType: "interview" } })
  assert.equal(off.res.code, 403); assert.match(off.res.body.message, /turned off/); assert.equal(off.nextCalled, false)
  const no = await run({ access: { canAskAI: false, roomType: "collab" } })
  assert.equal(no.res.code, 403); assert.match(no.res.body.message, /No access/)
})
test("allowed => handler is reached", async () => {
  const r = await run({ access: { canAskAI: true, roomType: "collab" } })
  assert.equal(r.nextCalled, true); assert.equal(r.res.code, null)
})

// ---------- the REAL router over HTTP (catches silent wiring mistakes) ----------
let roomSrv, appSrv, base
const ids = { member: "a".repeat(24), outsider: "b".repeat(24), candidate: "c".repeat(24) }

before(async () => {
  roomSrv = http.createServer((q, s) => {
    const uid = q.headers["x-user-id"]
    const body = {
      [ids.member]: { room: { type: "collab" }, role: "editor", canWrite: true, canUseAI: true, canAskAI: true },
      [ids.candidate]: { room: { type: "interview" }, role: "editor", canWrite: true, canUseAI: false, canAskAI: false },
    }[uid]
    s.writeHead(body ? 200 : 403, { "content-type": "application/json" }); s.end(JSON.stringify(body || { success: false }))
  })
  await new Promise((r) => roomSrv.listen(0, "127.0.0.1", r))
  process.env.ROOM_SERVICE_URL = `http://127.0.0.1:${roomSrv.address().port}`
  process.env.INTERNAL_API_KEY = "k"
  process.env.GEMINI_API_KEY = "test-key-never-used"
  const { default: router } = await import("../src/routes/ai.routes.js")
  const app = express(); app.use(express.json()); app.use("/", router)
  appSrv = http.createServer(app)
  await new Promise((r) => appSrv.listen(0, "127.0.0.1", r))
  base = `http://127.0.0.1:${appSrv.address().port}`
})
after(() => { roomSrv.close(); appSrv.close() })

const post = (path, body, uid) =>
  fetch(base + path, { method: "POST", headers: { "content-type": "application/json", ...(uid ? { "x-user-id": uid } : {}) }, body: JSON.stringify(body) })
    .then(async (r) => ({ status: r.status, json: await r.json() }))

const OLD = ["/review", "/chat", "/fix", "/explain"]
const payload = { roomId: ROOM, code: "let a = 1", language: "javascript", message: "hi" }

test("router: the four old AI routes all sit behind the guard (no identity => 401)", async () => {
  for (const p of OLD) assert.equal((await post(p, payload)).status, 401, p)
})
test("router: without a roomId every old route refuses (the bypass is closed)", async () => {
  for (const p of OLD) assert.equal((await post(p, { code: "x", language: "javascript", message: "hi" }, ids.member)).status, 400, p)
})
test("router: a non-member and an interview candidate with AI off are refused on every old route", async () => {
  for (const p of OLD) {
    assert.equal((await post(p, payload, ids.outsider)).status, 403, `${p} outsider`)
    const c = await post(p, payload, ids.candidate)
    assert.equal(c.status, 403, `${p} candidate`)
    assert.match(c.json.message, /turned off/)
  }
})