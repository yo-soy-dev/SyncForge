import test from "node:test"
import assert from "node:assert/strict"
import crypto from "crypto"
import { buildIceServers, TURN_TTL_SECONDS } from "../src/security/iceServers.js"

test("STUN only when TURN is not configured", () => {
  const s = buildIceServers({ userId: "u1", env: {} })
  assert.equal(s.length, 1)
  assert.ok(s[0].urls.every((u) => u.startsWith("stun:")))
  assert.equal(s[0].credential, undefined)
})

test("TURN credentials follow the TURN REST API and expire", () => {
  const now = 1_700_000_000_000
  const env = { TURN_URLS: "turn:t.example.com:3478?transport=udp, turn:t.example.com:3478?transport=tcp", TURN_SECRET: "s3cret" }
  const turn = buildIceServers({ userId: "u1", now, env }).find((s) => s.credential)
  assert.equal(turn.username, `${1_700_000_000 + TURN_TTL_SECONDS}:u1`)
  assert.equal(turn.credential, crypto.createHmac("sha1", "s3cret").update(turn.username).digest("base64"))
  assert.equal(turn.urls.length, 2)
})

test("TURN is skipped when the secret is missing", () => {
  const s = buildIceServers({ userId: "u1", env: { TURN_URLS: "turn:t.example.com:3478" } })
  assert.equal(s.length, 1)
})