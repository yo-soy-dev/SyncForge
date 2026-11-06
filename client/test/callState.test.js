import test from "node:test"
import assert from "node:assert/strict"
import { callReducer, initialCallState, peerList, parseIceServers, DEFAULT_ICE_SERVERS } from "../src/utils/callState.js"

const P1 = { socketId: "s1", username: "bob", label: "candidate", publish: true, audio: false, video: false }
const P2 = { socketId: "s2", username: "alice", label: "interviewer", publish: true, audio: false, video: false }
const run = (actions, s = initialCallState) => actions.reduce(callReducer, s)

test("joining, then joined: peers are keyed by socket id and start without a stream", () => {
  const s = run([{ type: "joining" }, { type: "joined", you: { socketId: "me", publish: true }, peers: [P1, P2] }])
  assert.equal(s.status, "joined"); assert.equal(s.peers.s1.stream, null); assert.equal(s.peers.s1.connection, "new")
  assert.deepEqual(peerList(s).map((p) => p.username), ["alice", "bob"])
})
test("peers can be added, get streams, connection state and mute state, and be removed", () => {
  const s0 = run([{ type: "joined", you: {}, peers: [] }, { type: "peer-added", peer: P1 }])
  const s1 = run([{ type: "peer-stream", socketId: "s1", stream: "STREAM" }, { type: "peer-connection", socketId: "s1", state: "connected" },
                  { type: "peer-media", socketId: "s1", audio: true, video: false }], s0)
  assert.deepEqual([s1.peers.s1.stream, s1.peers.s1.connection, s1.peers.s1.audio], ["STREAM", "connected", true])
  assert.deepEqual(Object.keys(run([{ type: "peer-removed", socketId: "s1" }], s1).peers), [])
})
test("updates for unknown peers are ignored, not created", () => {
  const s = run([{ type: "peer-stream", socketId: "ghost", stream: "X" }, { type: "peer-media", socketId: "ghost", audio: true, video: true }], initialCallState)
  assert.deepEqual(s.peers, {})
})
test("local stream and mute state", () => {
  const s = run([{ type: "local-stream", stream: "L" }, { type: "local-muted", audio: true, video: false }])
  assert.equal(s.localStream, "L"); assert.deepEqual(s.muted, { audio: true, video: false })
})
test("a join error resets everything and keeps the message; leaving resets; a disconnect says so", () => {
  const joined = run([{ type: "joined", you: {}, peers: [P1] }, { type: "local-stream", stream: "L" }])
  const err = run([{ type: "error", code: "CALL_FULL", message: "full" }], joined)
  assert.equal(err.status, "idle"); assert.deepEqual(err.peers, {}); assert.equal(err.localStream, null); assert.deepEqual(err.error, { code: "CALL_FULL", message: "full" })
  const left = run([{ type: "left" }], joined)
  assert.equal(left.status, "idle"); assert.equal(left.notice, null)
  assert.match(run([{ type: "left", reason: "disconnected" }], joined).notice, /disconnected/)
})
test("unknown actions leave the state untouched", () => {
  assert.equal(callReducer(initialCallState, { type: "???" }), initialCallState)
})
test("ICE servers: free STUN by default; valid overrides accepted; junk falls back safely", () => {
  assert.deepEqual(parseIceServers(undefined), DEFAULT_ICE_SERVERS)
  assert.ok(DEFAULT_ICE_SERVERS.every((s) => s.urls.startsWith("stun:")))
  const custom = '[{"urls":"turn:turn.example.com:3478","username":"u","credential":"c"}]'
  assert.equal(parseIceServers(custom)[0].username, "u")
  for (const bad of ["not json", "{}", "[]", '[{"url":"x"}]', '[{"urls":5}]', '[null]']) assert.deepEqual(parseIceServers(bad), DEFAULT_ICE_SERVERS, bad)
})