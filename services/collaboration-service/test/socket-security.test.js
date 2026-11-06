import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import * as Y from "yjs"
import { io as ioc } from "socket.io-client"

const A = "a".repeat(24), B = "b".repeat(24), E = "e".repeat(24), V = "d".repeat(24)
const R1 = "1".repeat(24), R2 = "2".repeat(24), R3 = "3".repeat(24)
const KEY = "internal-test-key"

// ---- fake auth-service + room-service ----
const TOKENS = { tokA: [A, "alice"], tokB: [B, "bob"], tokE: [E, "eve"], tokV: [V, "vic"] }
const rooms = {
  [R1]: { owner: A, members: { [E]: "editor", [V]: "viewer" } },
  [R2]: { owner: B, members: {} },
  // interview room: A is the interviewer, E is the candidate
  [R3]: { owner: A, members: { [E]: "editor" }, type: "interview",
          interview: { candidateId: E, status: "scheduled", locked: false } },
}

// mirrors room-service's canWriteNow() — the unit tests for the real rule live in room-service
const computeCanWrite = (r, uid, role) => {
  if (role === "viewer") return false
  if (r.type === "interview") {
    if (r.interview.status === "ended") return false
    if (uid === r.interview.candidateId && (r.interview.status !== "live" || r.interview.locked)) return false
  }
  return true
}
const seenUserIds = []
let authSrv, roomSrv, httpServer, io, URL

const listen = (handler) => new Promise((resolve) => {
  const s = http.createServer(handler); s.listen(0, "127.0.0.1", () => resolve(s))
})
const port = (s) => s.address().port

before(async () => {
  authSrv = await listen((q, s) => {
    const t = (q.headers.authorization || "").split(" ")[1]
    const u = TOKENS[t]
    s.writeHead(u ? 200 : 401, { "content-type": "application/json" })
    s.end(JSON.stringify(u ? { success: true, user: { userId: u[0], username: u[1] } } : { success: false }))
  })
  roomSrv = await listen((q, s) => {
    const send = (c, b) => { s.writeHead(c, { "content-type": "application/json" }); s.end(JSON.stringify(b)) }
    if (q.headers["x-internal-key"] !== KEY) return send(401, { success: false })
    const roomId = q.url.slice(1), uid = q.headers["x-user-id"]
    seenUserIds.push(uid)
    const r = rooms[roomId]
    if (!r) return send(403, { success: false })
    const role = r.owner === uid ? "owner" : r.members[uid]
    if (!role) return send(403, { success: false })
    send(200, { success: true, room: { _id: roomId, type: r.type || "collab" }, role, canWrite: computeCanWrite(r, uid, role) })
  })

  process.env.AUTH_SERVICE_URL = `http://127.0.0.1:${port(authSrv)}`
  process.env.ROOM_SERVICE_URL = `http://127.0.0.1:${port(roomSrv)}`
  process.env.INTERNAL_API_KEY = KEY
  process.env.ROLE_REFRESH_MS = "250"
  process.env.INTERVIEW_REFRESH_MS = "150"
  process.env.NODE_ENV = "test"

  // No Redis needed: stub the network calls, keep the real handlers.
  const { redisClient, redisSub, redisPub } = await import("../src/config/redis.js")
  redisClient.get = async () => null; redisClient.setEx = async () => {}
  redisSub.subscribe = async () => {}; redisSub.unsubscribe = async () => {}
  redisPub.publish = async () => {}

  const { createSocketServer } = await import("../src/config/socket.js")
  httpServer = http.createServer()
  io = createSocketServer(httpServer)
  await new Promise((r) => httpServer.listen(0, "127.0.0.1", r))
  URL = `http://127.0.0.1:${port(httpServer)}`
})

const clients = []
after(async () => {
  clients.forEach((c) => c.close())
  io.close(); httpServer.close(); authSrv.close(); roomSrv.close()
})

const connect = (auth) => new Promise((resolve, reject) => {
  const c = ioc(URL, { auth, transports: ["websocket"], reconnection: false })
  clients.push(c)
  c.once("connect", () => resolve(c))
  c.once("connect_error", (e) => reject(e))
})
const next = (c, ev, ms = 1500) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error(`timeout waiting for ${ev}`)), ms)
  c.once(ev, (d) => { clearTimeout(t); resolve(d) })
})
const silent = (c, ev, ms = 400) => new Promise((resolve, reject) => {
  const h = () => reject(new Error(`unexpected ${ev}`))
  c.once(ev, h); setTimeout(() => { c.off(ev, h); resolve() }, ms)
})
const join = async (c, roomId, extra = {}) => {
  const ok = Promise.race([next(c, "yjs-sync").then(() => "joined"), next(c, "error").then((e) => e)])
  c.emit("join-room", { roomId, ...extra })
  return ok
}
const validUpdate = () => { const d = new Y.Doc(); d.getText("t").insert(0, "hi"); return Array.from(Y.encodeStateAsUpdate(d)) }

// ================= authentication =================
test("no token => connection refused", async () => {
  await assert.rejects(connect({}), /Unauthorized/)
})
test("THE OLD ATTACK: claiming a userId without a token => refused", async () => {
  await assert.rejects(connect({ userId: A, username: "alice" }), /Unauthorized/)
})
test("invalid token => refused", async () => {
  await assert.rejects(connect({ token: "nope" }), /Unauthorized/)
})

// ================= room access =================
test("outsider cannot join; forged userId in payload is ignored", async () => {
  const bob = await connect({ token: "tokB" })
  seenUserIds.length = 0
  const r = await join(bob, R1, { userId: A, username: "alice" })   // bob pretends to be alice
  assert.equal(r.code, "FORBIDDEN")
  assert.deepEqual([...new Set(seenUserIds)], [B])
})
test("malformed room id is refused without calling room-service", async () => {
  const bob = await connect({ token: "tokB" })
  seenUserIds.length = 0
  const r = await join(bob, "../../admin")
  assert.equal(r.code, "FORBIDDEN"); assert.equal(seenUserIds.length, 0)
})
test("owner joins and is told their role", async () => {
  const alice = await connect({ token: "tokA" })
  const role = next(alice, "room-role")
  assert.equal(await join(alice, R1), "joined")
  assert.equal((await role).role, "owner")
})

// ================= write permission =================
test("viewer cannot write; editor can; viewer still receives editor's updates", async () => {
  const eve = await connect({ token: "tokE" }), vic = await connect({ token: "tokV" })
  assert.equal(await join(eve, R1), "joined"); assert.equal(await join(vic, R1), "joined")

  const eveSilent = silent(eve, "yjs-update")
  const err = next(vic, "error")
  vic.emit("yjs-update", validUpdate())
  assert.equal((await err).code, "READ_ONLY"); await eveSilent

  const got = next(vic, "yjs-update")
  eve.emit("yjs-update", validUpdate())
  assert.ok((await got).length > 0)
})
test("oversized and malformed updates are rejected", async () => {
  const eve = await connect({ token: "tokE" })
  await join(eve, R1)
  let e = next(eve, "error"); eve.emit("yjs-update", new Array(600 * 1024).fill(0))
  assert.equal((await e).code, "BAD_UPDATE")
  e = next(eve, "error"); eve.emit("yjs-update", "not-bytes")
  assert.equal((await e).code, "BAD_UPDATE")
  e = next(eve, "error"); eve.emit("yjs-update", [])
  assert.equal((await e).code, "BAD_UPDATE")
})

// ================= presence / awareness =================
test("awareness cannot be injected into a room you did not join", async () => {
  const alice = await connect({ token: "tokA" }), bob = await connect({ token: "tokB" })
  await join(alice, R1); await join(bob, R2)
  const quiet = silent(bob, "awareness-update")
  alice.emit("awareness-update", { roomId: R2, awarenessState: { user: { username: "x", userId: "y" } } })
  await quiet
})
test("awareness identity is overwritten with the verified identity", async () => {
  const alice = await connect({ token: "tokA" }), vic = await connect({ token: "tokV" })
  await join(alice, R1); await join(vic, R1)
  const seen = next(vic, "awareness-update")
  alice.emit("awareness-update", { roomId: R1, awarenessState: { user: { username: "ADMIN", userId: B } } })
  const { awarenessState } = await seen
  assert.equal(awarenessState.user.userId, A); assert.equal(awarenessState.user.username, "alice")
})

// ================= revocation =================
test("demoted editor loses write access within the refresh window", async () => {
  const eve = await connect({ token: "tokE" })
  await join(eve, R1)
  rooms[R1].members[E] = "viewer"
  await new Promise((r) => setTimeout(r, 350))
  const err = next(eve, "error"); eve.emit("yjs-update", validUpdate())
  assert.equal((await err).code, "READ_ONLY")
})
test("removed member is kicked on next write attempt", async () => {
  const vic = await connect({ token: "tokV" })
  await join(vic, R1)
  delete rooms[R1].members[V]
  await new Promise((r) => setTimeout(r, 350))
  const err = next(vic, "error"); vic.emit("yjs-update", validUpdate())
  assert.equal((await err).code, "ACCESS_REVOKED")
})






// ================= interview rooms =================
const settle = (ms = 300) => new Promise((r) => setTimeout(r, ms))

test("interview: candidate is read-only until the interview is live (LOCKED, not READ_ONLY)", async () => {
  const eve = await connect({ token: "tokE" })
  assert.equal(await join(eve, R3), "joined")
  const err = next(eve, "error"); eve.emit("yjs-update", validUpdate())
  assert.equal((await err).code, "LOCKED")
})

test("interview: interviewer can always write; candidate writes once live; lock/unlock takes effect within seconds", async () => {
  const alice = await connect({ token: "tokA" }), eve = await connect({ token: "tokE" })
  await join(alice, R3); await join(eve, R3)

  // owner starts the interview
  rooms[R3].interview.status = "live"
  await settle()
  let got = next(alice, "yjs-update"); eve.emit("yjs-update", validUpdate())
  assert.ok((await got).length > 0)                 // candidate's edit reaches the interviewer

  // owner locks the candidate
  rooms[R3].interview.locked = true
  await settle()
  const roleChange = next(eve, "room-role")
  let err = next(eve, "error"); eve.emit("yjs-update", validUpdate())
  assert.equal((await err).code, "LOCKED")
  assert.equal((await roleChange).canWrite, false)  // UI is told to lock the editor

  // interviewer is unaffected by the lock
  const eveQuiet = silent(eve, "error")
  got = next(eve, "yjs-update"); alice.emit("yjs-update", validUpdate())
  assert.ok((await got).length > 0); await eveQuiet

  // owner unlocks
  rooms[R3].interview.locked = false
  await settle()
  got = next(alice, "yjs-update"); eve.emit("yjs-update", validUpdate())
  assert.ok((await got).length > 0)
})

test("interview: once ended, nobody can write — not even the interviewer", async () => {
  const alice = await connect({ token: "tokA" })
  await join(alice, R3)
  rooms[R3].interview.status = "ended"
  await settle()
  const err = next(alice, "error"); alice.emit("yjs-update", validUpdate())
  assert.equal((await err).code, "LOCKED")
})

test("fetchRoomAccess falls back to role when room-service omits canWrite (older deployments)", async () => {
  const { fetchRoomAccess } = await import("../src/security/socketAuth.js")
  const stub = (body) => async () => ({ ok: true, json: async () => body })
  const base = { roomId: R1, userId: A, roomUrl: "http://x", internalKey: "k" }

  const editor = await fetchRoomAccess({ ...base, fetchImpl: stub({ room: { _id: R1 }, role: "editor" }) })
  assert.equal(editor.canWrite, true); assert.equal(editor.roomType, "collab")

  const viewer = await fetchRoomAccess({ ...base, fetchImpl: stub({ room: { _id: R1 }, role: "viewer" }) })
  assert.equal(viewer.canWrite, false)

  // an explicit server decision always wins over the role
  const locked = await fetchRoomAccess({ ...base, fetchImpl: stub({ room: { _id: R1, type: "interview" }, role: "editor", canWrite: false }) })
  assert.equal(locked.canWrite, false); assert.equal(locked.roomType, "interview")
})