import test from "node:test"
import assert from "node:assert/strict"
import { runCode, guestEnv } from "../src/executors/index.js"

test("guest code cannot see the service's secrets", async () => {
  process.env.JWT_SECRET = "super-secret-jwt"
  process.env.INTERNAL_API_KEY = "super-secret-internal"
  const r = await runCode(
    "console.log(JSON.stringify({j:process.env.JWT_SECRET,i:process.env.INTERNAL_API_KEY}))",
    "javascript"
  )
  assert.equal(r.stdout.trim(), "{}")
})

test("python guest code cannot see secrets either", async () => {
  process.env.JWT_SECRET = "super-secret-jwt"
  const r = await runCode("import os\nprint(os.environ.get('JWT_SECRET'))", "python")
  assert.equal(r.stdout.trim(), "None")
})

test("guest environment is a tiny allowlist", () => {
  assert.deepEqual(Object.keys(guestEnv()).sort(), ["GOCACHE", "HOME", "LANG", "PATH"])
})

test("compiled languages are disabled by default", async () => {
  for (const lang of ["java", "cpp", "go"]) {
    const r = await runCode("anything", lang)
    assert.match(r.stderr, /not supported/)
  }
})

test("infinite loop is killed by the timeout", async () => {
  const r = await runCode("while(true){}", "javascript")
  assert.match(r.stderr, /Timeout/)
}, { timeout: 20000 })