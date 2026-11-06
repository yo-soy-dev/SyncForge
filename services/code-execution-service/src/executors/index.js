



import { spawn } from "child_process"
import { writeFile, unlink, mkdir, chmod } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"
import { randomUUID } from "crypto"

const TIMEOUT_MS = 10000
const MAX_OUTPUT = 1024 * 512


// ---------------------------------------------------------------------------
// HARDENING STOPGAP — this is NOT a sandbox.
//  * Guest code no longer inherits this service's environment (secrets).
//  * If SANDBOX_UID/SANDBOX_GID are set (the Dockerfile does), guest code runs as
//    that unprivileged user, so it cannot read this process's /proc/<pid>/environ.
//  * Only interpreted languages are enabled by default.
// Still missing: network off, CPU/memory/pid limits, read-only filesystem.
// ---------------------------------------------------------------------------
const ENABLED = (process.env.ENABLED_LANGUAGES || "javascript,python,typescript,java,cpp,go")
  .split(",").map((l) => l.trim()).filter(Boolean)

export const guestEnv = () => ({
  PATH: process.env.PATH,
  HOME: tmpdir(),
  LANG: "C.UTF-8",
  GOCACHE: join(tmpdir(), "go-cache"),
  GOPATH: join(tmpdir(), "go-path"),
  GOTMPDIR: join(tmpdir(), "go-tmp"),
})

const guestIdentity = () =>
  process.env.SANDBOX_UID
    ? { uid: Number(process.env.SANDBOX_UID), gid: Number(process.env.SANDBOX_GID || process.env.SANDBOX_UID) }
    : {}

const execute = (command, args, input = "", options = {}) => {
  return new Promise((resolve) => {
    const start = Date.now()

    const child = spawn(command, args, {
      cwd: options.cwd || tmpdir(),
      env: guestEnv(),
      ...guestIdentity(),
    })

    let stdout = ""
    let stderr = ""
    let timer
    let timedOut = false
    let outputLimitReached = false
    let settled = false


    const finish = (result) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(result)
    }

    child.stdout.on("data", (d) => {
      const remaining = MAX_OUTPUT - stdout.length
      stdout += d.toString().slice(0, Math.max(0, remaining))

      if (d.length > remaining && !outputLimitReached) {
        outputLimitReached = true
        child.kill("SIGKILL")
      }
    })

    child.stderr.on("data", (d) => {
      const remaining = MAX_OUTPUT - stderr.length
      if (stderr.length < MAX_OUTPUT) stderr += d.toString().slice(0, Math.max(0, remaining))

      if (d.length > remaining && !outputLimitReached) {
        outputLimitReached = true
        child.kill("SIGKILL")
      }
    })

    child.stdin.on("error", () => { })
    child.stdin.end(input)

    timer = setTimeout(() => {
      if (outputLimitReached) return
      timedOut = true
      child.kill("SIGKILL")
    }, TIMEOUT_MS)

    child.on("close", (code) => {
      if (timedOut) {
        stderr += `\n⏱ Timeout: exceeded ${TIMEOUT_MS / 1000}s limit`
      }

      if (outputLimitReached) {
        stderr += "\nOutput limit exceeded (512 KB)."
      }

      finish({
        stdout,
        stderr,
        exitCode: code,
        executionTime: Date.now() - start,
      })
    })
    child.on("error", (err) => {
      finish({
        stdout,
        stderr: err.message,
        exitCode: null,
        executionTime: Date.now() - start,
      })
    })
  })
}

const withTempFile = async (ext, code, fn) => {
  const file = join(tmpdir(), `${randomUUID()}.${ext}`)
  await writeFile(file, code, "utf8")
  try {
    return await fn(file)
  } finally {
    await unlink(file).catch(() => { })
  }
}

const executors = {

  javascript: (code, input) =>
    withTempFile("js", code, (file) =>
      execute("node", [file], input)
    ),

  // typescript: (code, input) =>
  //   withTempFile("ts", code, (file) =>
  //     execute("npx", ["ts-node", "--transpile-only", "--compiler-options", '{"module":"CommonJS","moduleResolution":"node"}', file], input)
  //   ),

  typescript: async (code, input) => {
    const dir = join(tmpdir(), randomUUID())
    const distDir = join(dir, "dist")

    await mkdir(dir, { recursive: true, mode: 0o777 })
    await chmod(dir, 0o777)

    await mkdir(distDir, { recursive: true, mode: 0o777 })
    await chmod(distDir, 0o777)

    const tsFile = join(dir, "main.ts")
    const jsFile = join(distDir, "main.js")

    await writeFile(tsFile, code, "utf8")

    try {
      const compile = await execute("tsc", [
        "--target", "ES2020",
        "--module", "Node16",
        "--moduleResolution", "Node16",
        "--esModuleInterop",
        "--skipLibCheck",
        "--types", "node",
        "--typeRoots", "/usr/local/lib/node_modules/@types",
        "--noEmitOnError",
        "--pretty", "false",
        "--outDir", distDir,
        tsFile
      ], "", { cwd: dir })

      if (compile.exitCode !== 0) return compile

      return await execute("node", [jsFile], input, { cwd: dir })
    } finally {
      const { rm } = await import("fs/promises")
      await rm(dir, { recursive: true, force: true }).catch(() => { })
    }
  },

  python: (code, input) =>
    withTempFile("py", code, (file) =>
      execute("python3", [file], input)
    ),

  java: async (code, input) => {
    const classMatch = code.match(/public\s+class\s+(\w+)/)
    const className = classMatch ? classMatch[1] : "Main"

    const finalCode = classMatch
      ? code
      : `public class Main {\n${code}\n}`

    const dir = join(tmpdir(), randomUUID())
    const file = join(dir, `${className}.java`)

    await mkdir(dir, { recursive: true, mode: 0o777 })
    await chmod(dir, 0o777)
    await writeFile(file, finalCode, "utf8")

    try {
      const compile = await execute("javac", [file], "", { cwd: dir })
      if (compile.exitCode !== 0) return compile

      return await execute("java", ["-cp", dir, className], input, { cwd: dir })
    } finally {
      const { rm } = await import("fs/promises")
      await rm(dir, { recursive: true, force: true }).catch(() => { })
    }
  },

  cpp: async (code, input) => {
    const id = randomUUID()
    const srcFile = join(tmpdir(), `${id}.cpp`)
    const outFile = join(tmpdir(), `${id}.out`)

    await writeFile(srcFile, code, "utf8")

    try {
      const compile = await execute("g++", ["-o", outFile, srcFile], "")
      if (compile.exitCode !== 0) {
        return compile
      }

      return await execute(outFile, [], input)
    } finally {
      await unlink(srcFile).catch(() => { })
      await unlink(outFile).catch(() => { })
    }
  },

  go: async (code, input) => {
    const cacheDir = join(tmpdir(), "go-cache")
    const goPath = join(tmpdir(), "go-path")
    const goTmp = join(tmpdir(), "go-tmp")

    await mkdir(cacheDir, { recursive: true, mode: 0o777 })
    await mkdir(goPath, { recursive: true, mode: 0o777 })
    await mkdir(goTmp, { recursive: true, mode: 0o777 })

    await chmod(cacheDir, 0o777)
    await chmod(goPath, 0o777)
    await chmod(goTmp, 0o777)

    return withTempFile("go", code, (file) =>
      execute("go", ["run", file], input)
    )
  },
}

export const runCode = async (code, language, input = "") => {
  const executor = ENABLED.includes(language) ? executors[language] : undefined

  if (!executor) {
    return {
      stdout: "",
      stderr: `❌ Language "${language}" not supported\nSupported: ${ENABLED.join(", ")}`,
      executionTime: 0,
    }
  }

  return executor(code, input)
}