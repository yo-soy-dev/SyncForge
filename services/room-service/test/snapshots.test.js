import test from "node:test"
import assert from "node:assert/strict"
import { validateSnapshotInput, MAX_SNAPSHOT_CHARS } from "../src/utils/snapshots.js"

test("accepts a normal snapshot and records its size", () => {
  const { value } = validateSnapshotInput({ text: "console.log(1)", language: "javascript", kind: "manual" })
  assert.equal(value.size, 14); assert.equal(value.kind, "manual")
})
test("defaults kind to manual and language to javascript", () => {
  const { value } = validateSnapshotInput({ text: "x" })
  assert.equal(value.kind, "manual"); assert.equal(value.language, "javascript")
})
test("rejects non-string and oversized text", () => {
  assert.match(validateSnapshotInput({ text: 5 }).error, /string/)
  assert.match(validateSnapshotInput({ text: "a".repeat(MAX_SNAPSHOT_CHARS + 1) }).error, /exceeds/)
  assert.ok(validateSnapshotInput({ text: "a".repeat(MAX_SNAPSHOT_CHARS) }).value)
})
test("clients cannot forge the server-only interview-end kind", () => {
  assert.match(validateSnapshotInput({ text: "x", kind: "interview-end" }).error, /Invalid kind/)
})
test("rejects unknown kind and language", () => {
  assert.match(validateSnapshotInput({ text: "x", kind: "hack" }).error, /Invalid kind/)
  assert.match(validateSnapshotInput({ text: "x", language: "cobol" }).error, /Invalid language/)
})
test("no body at all is an error, not a crash", () => {
  assert.ok(validateSnapshotInput(undefined).error)
})