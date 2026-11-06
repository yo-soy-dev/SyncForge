import test from "node:test"
import assert from "node:assert/strict"
import { roleFor, canWrite, getIdentity, isObjectId, canWriteNow, isCandidate } from "../src/utils/access.js"


const A = "a".repeat(24), B = "b".repeat(24), C = "c".repeat(24), V = "d".repeat(24)
const room = {
  isActive: true, owner: A,
  members: [
    { userId: A, username: "alice" },
    { userId: B, username: "bob" },                   // legacy member, no role field
    { userId: V, username: "vic", role: "viewer" },
  ],
}

test("owner / legacy-member(editor) / viewer / outsider", () => {
  assert.equal(roleFor(room, A), "owner")
  assert.equal(roleFor(room, B), "editor")
  assert.equal(roleFor(room, V), "viewer")
  assert.equal(roleFor(room, C), null)
})
test("deleted (inactive) room grants nothing, even to owner", () => {
  assert.equal(roleFor({ ...room, isActive: false }, A), null)
})
test("only owner and editor may write", () => {
  assert.equal(canWrite("owner"), true)
  assert.equal(canWrite("editor"), true)
  assert.equal(canWrite("viewer"), false)
  assert.equal(canWrite(null), false)
})
test("getIdentity accepts only well-formed object ids and decodes username", () => {
  const ok = getIdentity({ headers: { "x-user-id": A, "x-user-data": encodeURIComponent(JSON.stringify({ username: "ünï" })) } })
  assert.equal(ok.userId, A); assert.equal(ok.username, "ünï")
  assert.equal(getIdentity({ headers: { "x-user-id": "../../etc" } }).userId, null)
  assert.equal(getIdentity({ headers: { "x-user-id": { $ne: 1 } } }).userId, null)
  assert.equal(getIdentity({ headers: { "x-user-id": A, "x-user-data": "%%%bad" } }).username, "Anonymous")
  assert.equal(isObjectId(A), true); assert.equal(isObjectId("123"), false)
})


// ---------- interview-aware write permission ----------
const iv = (over = {}) => ({
  isActive: true, type: "interview", owner: A,
  members: [{ userId: A }, { userId: B }, { userId: V, role: "viewer" }],
  interview: { candidateId: B, status: "live", locked: false, ...over },
})

test("collab rooms: canWriteNow equals role-based write", () => {
  assert.equal(canWriteNow(room, A), true)
  assert.equal(canWriteNow(room, B), true)
  assert.equal(canWriteNow(room, V), false)
  assert.equal(canWriteNow(room, C), false)
})
test("interview: candidate can write only while live and unlocked", () => {
  assert.equal(canWriteNow(iv(), B), true)
  assert.equal(canWriteNow(iv({ locked: true }), B), false)
  assert.equal(canWriteNow(iv({ status: "scheduled" }), B), false)
  assert.equal(canWriteNow(iv({ status: "ended" }), B), false)
})
test("interview: the lock never affects the interviewer", () => {
  assert.equal(canWriteNow(iv({ locked: true }), A), true)
  assert.equal(canWriteNow(iv({ status: "scheduled" }), A), true)
})
test("interview: ended means read-only for everyone, including the owner", () => {
  assert.equal(canWriteNow(iv({ status: "ended" }), A), false)
})
test("interview: viewers/observers and outsiders never write", () => {
  assert.equal(canWriteNow(iv(), V), false)
  assert.equal(canWriteNow(iv(), C), false)
})
test("interview state can only remove write access, never add it", () => {
  assert.equal(canWriteNow(iv({ candidateId: V }), V), false)
  assert.equal(isCandidate(iv(), B), true); assert.equal(isCandidate(room, B), false)
})