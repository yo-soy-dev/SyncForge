import test, { before, after, afterEach } from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import { io as ioc } from "socket.io-client"
import { validateSignal, evaluateCallJoin, callLabelFor, createRateLimiter, MAX_CALL_PEERS, MAX_SDP_CHARS } from "../src/security/callAccess.js"

const A = "a".repeat(24), B = "b".repeat(24), E = "e".repeat(24), V = "d".repeat(24), C = "c".repeat(24)
const R1 = "1".repeat(24), R2 = "2".repeat(24), R3 = "3".repeat(24), RF = "f".repeat(24)
const KEY = "internal-test-key"

const TOKENS = { tokA: [A, "alice"], tokB: [B, "bob"], tokE: [E, "eve"], tokV: [V, "vic"], tokC: [C, "carol"] }
const extra = Array.from({ length: 8 }, (_, i) => [`${i}`.repeat(1).padStart(24, "9"), `u${i}`])
extra.forEach(([id, name], i) => { TOKENS[`tokU${i}`] = [id, name] })

const rooms = {
  [R1]: { type: "interview", owner: A, members: { [B]: "editor", [E]: "editor", [V]: "viewer" }, interview: { candidateId: B, status: "live" } },
  [R2]: { type: "collab", owner: C, members: {} },
  [R3]: { type: "interview", owner: A, members: { [B]: "editor" }, interview: { candidateId: B, status: "ended" } },
  [RF]: { type: "collab", owner: A, members: Object.fromEntries(extra.map(([id]) => [id, "editor"])) },
}

let authSrv, roomSrv, httpServer, io, URL
const listen = (handler) => new Promise((resolve) => { const s = http.createServer(handler); s.listen(0, "127.0.0.1", () => resolve(s)) })
const port = (s) => s.address().port

before(async () => {
  authSrv = await listen((q, s) => {
    const u = TOKENS[(q.headers.authorization || "").split(" ")[1]]
    s.writeHead(u ? 200 : 401, { "content-type": "application/json" })
    s.end(JSON.stringify(u ? { success: true, user: { userId: u[0], username: u[1] } } : { success: false }))
  })
  roomSrv = await listen((q, s) => {
    const send = (c, b) => { s.writeHead(c, { "content-type": "application/json" }); s.end(JSON.stringify(b)) }
    if (q.headers["x-internal-key"] !== KEY) return send(401, { success: false })
    const roomId = q.url.slice(1), uid = q.headers["x-user-id"], r = rooms[roomId]
    if (!r) return send(403, { success: false })
    const role = r.owner === uid ? "owner" : r.members[uid]
    if (!role) return send(403, { success: false })
    send(200, { success: true, room: { _id: roomId, type: r.type, interview: r.interview }, role, canWrite: role !== "viewer" })
  })
  process.env.AUTH_SERVICE_URL = `http://127.0.0.1:${port(authSrv)}`
  process.env.ROOM_SERVICE_URL = `http://127.0.0.1:${port(roomSrv)}`
  process.env.INTERNAL_API_KEY = KEY
  process.env.ROLE_REFRESH_MS = "250"
  process.env.INTERVIEW_REFRESH_MS = "150"   // R1 is an interview room: it re-checks access on this faster clock
  process.env.NODE_ENV = "test"

  const { redisClient, redisSub, redisPub } = await import("../src/config/redis.js")
  redisClient.get = async () => null; redisClient.setEx = async () => { }
  redisSub.subscribe = async () => { }; redisSub.unsubscribe = async () => { }; redisPub.publish = async () => { }

  const { createSocketServer } = await import("../src/config/socket.js")
  httpServer = http.createServer(); io = createSocketServer(httpServer)
  await new Promise((r) => httpServer.listen(0, "127.0.0.1", r))
  URL = `http://127.0.0.1:${port(httpServer)}`
})
const clients = []
// Every test starts with an empty call: close its sockets and let the server process the disconnects.
afterEach(async () => {
  clients.splice(0).forEach((c) => c.close())
  await new Promise((r) => setTimeout(r, 120))
})
after(() => { clients.forEach((c) => c.close()); io.close(); httpServer.close(); authSrv.close(); roomSrv.close() })

const connect = (token) => new Promise((resolve, reject) => {
  const c = ioc(URL, { auth: { token }, transports: ["websocket"], reconnection: false })
  clients.push(c); c.once("connect", () => resolve(c)); c.once("connect_error", reject)
})
const next = (c, ev, ms = 1500) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error(`timeout waiting for ${ev}`)), ms)
  c.once(ev, (d) => { clearTimeout(t); resolve(d) })
})
const silent = (c, ev, ms = 350) => new Promise((resolve, reject) => {
  const h = () => reject(new Error(`unexpected ${ev}`)); c.once(ev, h); setTimeout(() => { c.off(ev, h); resolve() }, ms)
})
const enterRoom = async (c, roomId) => {
  const ok = next(c, "yjs-sync"); c.emit("join-room", { roomId }); await ok
}
const joinCall = (c) => new Promise((resolve) => c.emit("call-join", {}, resolve))
const user = async (tok, roomId) => { const c = await connect(tok); await enterRoom(c, roomId); return c }
const OFFER = { type: "offer", sdp: "v=0\r\n..." }

test("labels: interviewer / candidate / observer in interviews, participant in collab rooms", () => {
  const room = { type: "interview", interview: { candidateId: B } }
  assert.equal(callLabelFor({ room, userId: A, role: "owner" }), "interviewer")
  assert.equal(callLabelFor({ room, userId: E, role: "editor" }), "interviewer")
  assert.equal(callLabelFor({ room, userId: B, role: "editor" }), "candidate")
  assert.equal(callLabelFor({ room, userId: V, role: "viewer" }), "observer")
  assert.equal(callLabelFor({ room: { type: "collab" }, userId: A, role: "editor" }), "participant")
})
test("join rules: refuses no access, ended interviews and full calls; observers do not publish", () => {
  const live = { room: { type: "interview", interview: { status: "live" } }, role: "editor" }
  assert.equal(evaluateCallJoin({ access: null, peerCount: 0 }).error.code, "FORBIDDEN")
  assert.equal(evaluateCallJoin({ access: { ...live, room: { type: "interview", interview: { status: "ended" } } }, peerCount: 0 }).error.code, "CALL_CLOSED")
  assert.equal(evaluateCallJoin({ access: live, peerCount: MAX_CALL_PEERS }).error.code, "CALL_FULL")
  assert.equal(evaluateCallJoin({ access: live, peerCount: MAX_CALL_PEERS, alreadyInCall: true }).ok, true)
  assert.equal(evaluateCallJoin({ access: live, peerCount: 0 }).publish, true)
  assert.equal(evaluateCallJoin({ access: { ...live, role: "viewer" }, peerCount: 0 }).publish, false)
})
test("signal validation keeps only whitelisted fields and rejects junk", () => {
  assert.deepEqual(validateSignal({ type: "offer", sdp: "x", evil: 1 }), { type: "offer", sdp: "x" })
  assert.equal(validateSignal({ type: "offer", sdp: "x".repeat(MAX_SDP_CHARS + 1) }), null)
  assert.equal(validateSignal({ type: "answer", sdp: "" }), null)
  assert.equal(validateSignal({ type: "hack", sdp: "x" }), null)
  assert.equal(validateSignal(null), null); assert.equal(validateSignal("x"), null)
  assert.deepEqual(validateSignal({ type: "candidate", candidate: { candidate: "c", sdpMid: "0", sdpMLineIndex: 0, usernameFragment: "x", evil: 1 } }),
    { type: "candidate", candidate: { candidate: "c", sdpMid: "0", sdpMLineIndex: 0 } })
  assert.equal(validateSignal({ type: "candidate", candidate: { candidate: 5 } }), null)
  assert.equal(validateSignal({ type: "candidate", candidate: { candidate: "c", sdpMLineIndex: -1 } }), null)
})
test("rate limiter allows up to max per window, then recovers", () => {
  let t = 0; const allow = createRateLimiter({ max: 3, windowMs: 1000, now: () => t })
  assert.deepEqual([allow(), allow(), allow(), allow()], [true, true, true, false])
  t = 1500; assert.equal(allow(), true)
})

test("cannot join a call before joining the room", async () => {
  const c = await connect("tokA")
  const r = await joinCall(c)
  assert.equal(r.ok, false); assert.equal(r.code, "NOT_IN_ROOM")
})
test("labels, publish flags and the peer list are decided by the server", async () => {
  const alice = await user("tokA", R1), bob = await user("tokB", R1), vic = await user("tokV", R1)
  const a = await joinCall(alice)
  assert.equal(a.ok, true); assert.equal(a.you.label, "interviewer"); assert.equal(a.you.publish, true); assert.deepEqual(a.peers, [])

  const joined = next(alice, "call-peer-joined")
  const b = await joinCall(bob)
  assert.equal(b.you.label, "candidate"); assert.equal(b.peers.length, 1); assert.equal(b.peers[0].username, "alice")
  const ev = await joined
  assert.equal(ev.label, "candidate"); assert.equal(ev.username, "bob")
  assert.deepEqual(Object.keys(ev).sort(), ["audio", "label", "publish", "socketId", "userId", "username", "video"])

  const v = await joinCall(vic)
  assert.equal(v.you.label, "observer"); assert.equal(v.you.publish, false); assert.equal(v.peers.length, 2)
})
test("joining twice from the same socket does not create a duplicate peer", async () => {
  const eve = await user("tokE", R1)
  await joinCall(eve); const again = await joinCall(eve)
  assert.equal(again.ok, true); assert.equal(again.peers.filter((p) => p.username === "eve").length, 0)
})

test("signals are relayed to one person in the same call, and `from` cannot be forged", async () => {
  const alice = await user("tokA", R1), bob = await user("tokB", R1)
  const a = await joinCall(alice); const b = await joinCall(bob)
  const got = next(alice, "call-signal")
  bob.emit("call-signal", { to: a.you.socketId, from: "FORGED", data: OFFER })
  const m = await got
  assert.equal(m.from, b.you.socketId); assert.equal(m.data.type, "offer")
})
test("signals never cross rooms, and never reach someone who is in the room but not in the call", async () => {
  const alice = await user("tokA", R1), bob = await user("tokB", R1), eve = await user("tokE", R1), carol = await user("tokC", R2)
  await joinCall(alice); await joinCall(bob)
  const c = await joinCall(carol)
  const aliceQuiet = silent(alice, "call-signal"), carolQuiet = silent(carol, "call-signal"), eveQuiet = silent(eve, "call-signal")
  carol.emit("call-signal", { to: alice.id, data: OFFER })
  alice.emit("call-signal", { to: c.you.socketId, data: OFFER })
  alice.emit("call-signal", { to: eve.id, data: OFFER })
  await aliceQuiet; await carolQuiet; await eveQuiet
})
test("malformed signals are refused with an error and never relayed; valid candidates are cleaned", async () => {
  const alice = await user("tokA", R1), bob = await user("tokB", R1)
  const a = await joinCall(alice); await joinCall(bob)
  const quiet = silent(alice, "call-signal")
  const err = next(bob, "call-error")
  bob.emit("call-signal", { to: a.you.socketId, data: { type: "offer", sdp: "x".repeat(MAX_SDP_CHARS + 1) } })
  assert.equal((await err).code, "BAD_SIGNAL"); await quiet

  const got = next(alice, "call-signal")
  bob.emit("call-signal", { to: a.you.socketId, data: { type: "candidate", candidate: { candidate: "c", sdpMid: "0", sdpMLineIndex: 0, evil: "<script>" } } })
  assert.deepEqual((await got).data.candidate, { candidate: "c", sdpMid: "0", sdpMLineIndex: 0 })
})
test("flooding is rate limited and the sender is told", async () => {
  const alice = await user("tokA", R1), bob = await user("tokB", R1)
  const a = await joinCall(alice); await joinCall(bob)
  let relayed = 0; alice.on("call-signal", () => relayed++)
  const err = next(bob, "call-error")
  for (let i = 0; i < 650; i++) bob.emit("call-signal", { to: a.you.socketId, data: { type: "candidate", candidate: { candidate: `c${i}`, sdpMid: "0", sdpMLineIndex: 0 } } })
  assert.equal((await err).code, "RATE_LIMITED")
  await new Promise((r) => setTimeout(r, 400))
  assert.ok(relayed <= 600, `relayed ${relayed}`); assert.ok(relayed > 0)
})

test("mute indicators are broadcast for publishers; an observer's are ignored", async () => {
  const alice = await user("tokA", R1), vic = await user("tokV", R1)
  const a = await joinCall(alice); await joinCall(vic)
  const seen = next(vic, "call-media-state")
  alice.emit("call-media-state", { audio: true, video: false })
  assert.deepEqual(await seen, { socketId: a.you.socketId, audio: true, video: false })
  const quiet = silent(alice, "call-media-state")
  vic.emit("call-media-state", { audio: true, video: true })
  await quiet
})

test("leaving or disconnecting tells the others and stops relaying to that person", async () => {
  const alice = await user("tokA", R1), bob = await user("tokB", R1), eve = await user("tokE", R1)
  await joinCall(alice); const b = await joinCall(bob); await joinCall(eve)
  let left = next(alice, "call-peer-left"); bob.emit("call-leave")
  assert.equal((await left).socketId, b.you.socketId)
  const quiet = silent(bob, "call-signal")
  alice.emit("call-signal", { to: b.you.socketId, data: OFFER }); await quiet
  left = next(alice, "call-peer-left"); eve.close()
  assert.ok((await left).socketId)
})

test("the call is capped at the maximum size; a seventh person is refused", async () => {
  const socks = []
  for (let i = 0; i < MAX_CALL_PEERS; i++) { const c = await user(`tokU${i}`, RF); socks.push(c); assert.equal((await joinCall(c)).ok, true) }
  const seventh = await user("tokU6", RF)
  const r = await joinCall(seventh)
  assert.equal(r.ok, false); assert.equal(r.code, "CALL_FULL")
})
test("an ended interview refuses new call joins", async () => {
  const bob = await user("tokB", R3)
  const r = await joinCall(bob)
  assert.equal(r.ok, false); assert.equal(r.code, "CALL_CLOSED")
})
test("losing room access also removes you from the call", async () => {
  const alice = await user("tokA", R1), eve = await user("tokE", R1)
  await joinCall(alice); const e = await joinCall(eve)
  const left = next(alice, "call-peer-left")
  delete rooms[R1].members[E]
  await new Promise((r) => setTimeout(r, 350))
  eve.emit("yjs-update", [1, 2, 3])
  assert.equal((await left).socketId, e.you.socketId)
  rooms[R1].members[E] = "editor"
})
const startShare = (c) => new Promise((resolve) => c.emit("call-screen-start", {}, resolve))

test("screen share: one at a time, everyone is told, the slot frees when stopped", async () => {
  const alice = await user("tokA", R1), bob = await user("tokB", R1)
  await joinCall(alice); await joinCall(bob)

  const told = next(bob, "call-screen-state")
  assert.equal((await startShare(alice)).ok, true)
  assert.deepEqual(await told, { socketId: alice.id, sharing: true })

  const busy = await startShare(bob)
  assert.equal(busy.ok, false); assert.equal(busy.code, "SCREEN_BUSY")

  const stopped = next(bob, "call-screen-state")
  alice.emit("call-screen-stop")
  assert.deepEqual(await stopped, { socketId: alice.id, sharing: false })
  assert.equal((await startShare(bob)).ok, true)
})

test("screen share: observers and people outside the call cannot share", async () => {
  const vic = await user("tokV", R1)
  assert.equal((await startShare(vic)).code, "NOT_IN_CALL")
  await joinCall(vic)
  assert.equal((await startShare(vic)).code, "NOT_ALLOWED")
})

test("screen share: a sharer who leaves frees the slot, and a late joiner is told who is sharing", async () => {
  const alice = await user("tokA", R1), bob = await user("tokB", R1)
  await joinCall(alice)
  assert.equal((await startShare(alice)).ok, true)

  const late = next(bob, "call-screen-state")
  await joinCall(bob)
  assert.deepEqual(await late, { socketId: alice.id, sharing: true })

  const freed = next(bob, "call-screen-state")
  alice.emit("call-leave")
  assert.deepEqual(await freed, { socketId: alice.id, sharing: false })
  assert.equal((await startShare(bob)).ok, true)
})