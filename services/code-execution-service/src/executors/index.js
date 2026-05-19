// // import { execFile } from "child_process"
// import { spawn } from "child_process"
// import { writeFile, unlink, mkdir } from "fs/promises"
// import { tmpdir } from "os"
// import { join } from "path"
// import { randomUUID } from "crypto"

// const TIMEOUT_MS  = 5000  
// const MAX_BUFFER  = 1024 * 512 

// // const execute = (command, args, input = "", options = {}) => {
// //   return new Promise((resolve) => {
// //     const start = Date.now()

// //     execFile(command, args, {
// //       timeout:   TIMEOUT_MS,
// //       maxBuffer: MAX_BUFFER,
// //       ...options,
// //     }, (error, stdout, stderr) => {
// //       resolve({
// //         stdout: stdout || "",
// //         stderr: error?.killed
// //           ? `⏱ Execution timeout: exceeded ${TIMEOUT_MS / 1000}s limit`
// //           : (stderr || ""),
// //         executionTime: Date.now() - start,
// //       })
// //     })
// //   })
// // }

// const execute = (command, args, input = "", options = {}) => {
//   return new Promise((resolve) => {
//     const start = Date.now()

//     const child = spawn(command, args, {
//       timeout: TIMEOUT_MS,
//       ...options,
//     })

//     let stdout = ""
//     let stderr = ""

//     child.stdout.on("data", (d) => stdout += d)
//     child.stderr.on("data", (d) => stderr += d)

//     // stdin pipe karo
//     if (input) {
//       child.stdin.write(input)
//     }
//     child.stdin.end()

//     const timer = setTimeout(() => {
//       child.kill()
//       resolve({
//         stdout,
//         stderr: `⏱ Timeout: exceeded ${TIMEOUT_MS/1000}s`,
//         executionTime: Date.now() - start,
//       })
//     }, TIMEOUT_MS)

//     child.on("close", () => {
//       clearTimeout(timer)
//       resolve({
//         stdout,
//         stderr,
//         executionTime: Date.now() - start,
//       })
//     })
//   })
// }

// const withTempFile = async (ext, code, fn) => {
//   const file = join(tmpdir(), `${randomUUID()}.${ext}`)
//   await writeFile(file, code, "utf8")
//   try {
//     return await fn(file)
//   } finally {
//     await unlink(file).catch(() => {}) 
//   }
// }

// const executors = {

//   javascript: (code, input) =>
//     withTempFile("js", code, (file) =>
//       execute("node", [file], input)
//     ),

//   typescript: (code) =>
//     withTempFile("ts", code, (file) =>
//       execute("npx", ["ts-node", "--transpile-only", file])
//     ),

//   python: (code, input) =>
//     withTempFile("py", code, (file) =>
//       execute("python3", [file], input)
//     ),

//   java: async (code) => {
//     const classMatch = code.match(/public\s+class\s+(\w+)/)
//     const className  = classMatch ? classMatch[1] : "Main"

//     const finalCode = classMatch
//       ? code
//       : `public class Main {\n${code}\n}`

//     const dir  = join(tmpdir(), randomUUID())
//     const file = join(dir, `${className}.java`)

//     await mkdir(dir, { recursive: true })
//     await writeFile(file, finalCode, "utf8")

//     try {
//       const compile = await execute("javac", [file], { cwd: dir })
//       if (compile.stderr) return compile 

//       return await execute("java", ["-cp", dir, className], { cwd: dir })
//     } finally {
//       const { rm } = await import("fs/promises")
//       await rm(dir, { recursive: true, force: true }).catch(() => {})
//     }
//   },

//   cpp: async (code, input) => {
//     const id      = randomUUID()
//     const srcFile = join(tmpdir(), `${id}.cpp`)
//     const outFile = join(tmpdir(), `${id}.out`)

//     await writeFile(srcFile, code, "utf8")

//     try {
//       const compile = await execute("g++", ["-o", outFile, srcFile])
//       if (compile.stderr && !compile.stdout) return compile  

//       return await execute(outFile, [], input)
//     } finally {
//       await unlink(srcFile).catch(() => {})
//       await unlink(outFile).catch(() => {})
//     }
//   },

//   go: (code) =>
//     withTempFile("go", code, (file) =>
//       execute("go", ["run", file])
//     ),
// }

// export const runCode = async (code, language, input = "") => {
//   const executor = executors[language]

//   if (!executor) {
//     return {
//       stdout: "",
//       stderr: `❌ Language "${language}" is not supported\nSupported: ${Object.keys(executors).join(", ")}`,
//       executionTime: 0,
//     }
//   }

//   return executor(code, input)
// }




import { spawn } from "child_process"  
import { writeFile, unlink, mkdir } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"
import { randomUUID } from "crypto"

const TIMEOUT_MS = 10000  
const MAX_OUTPUT = 1024 * 512

const execute = (command, args, input = "", options = {}) => {
  return new Promise((resolve) => {
    const start = Date.now()

    const child = spawn(command, args, {
      cwd: options.cwd || tmpdir(),
      env: process.env,
    })

    let stdout = ""
    let stderr = ""

    child.stdout.on("data", (d) => {
      stdout += d
      if (stdout.length > MAX_OUTPUT) child.kill()
    })

    child.stderr.on("data", (d) => {
      stderr += d
    })

    if (input) {
      child.stdin.write(input)
    }
    child.stdin.end()

    const timer = setTimeout(() => {
      child.kill("SIGKILL")
      resolve({
        stdout,
        stderr: `⏱ Timeout: exceeded ${TIMEOUT_MS / 1000}s limit`,
        executionTime: Date.now() - start,
      })
    }, TIMEOUT_MS)

    child.on("close", (code) => {
      clearTimeout(timer)
      resolve({
        stdout,
        stderr,
        executionTime: Date.now() - start,
      })
    })

    child.on("error", (err) => {
      clearTimeout(timer)
      resolve({
        stdout: "",
        stderr: err.message,
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
    await mkdir(dir, { recursive: true })

    const tsFile = join(dir, "main.ts")
    const tsConfig = join(dir, "tsconfig.json")

    await writeFile(tsFile, code, "utf8")
    await writeFile(tsConfig, JSON.stringify({
      compilerOptions: {
        module: "CommonJS",
        moduleResolution: "node",
        target: "ES2020",
        esModuleInterop: true,
        ignoreDeprecations: "6.0"
      }
    }), "utf8")

    try {
      return await execute("npx", [
        "ts-node",
        "--transpile-only",
        "--project", tsConfig,
        tsFile
      ], input, { cwd: dir })
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

    await mkdir(dir, { recursive: true })
    await writeFile(file, finalCode, "utf8")

    try {
      const compile = await execute("javac", [file], "", { cwd: dir })
      if (compile.stderr) return compile

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
      if (compile.stderr && compile.stdout === "") {
        return compile
      }

      return await execute(outFile, [], input)
    } finally {
      await unlink(srcFile).catch(() => { })
      await unlink(outFile).catch(() => { })
    }
  },

  go: (code, input) =>
    withTempFile("go", code, (file) =>
      execute("go", ["run", file], input)
    ),
}

export const runCode = async (code, language, input = "") => {
  const executor = executors[language]

  if (!executor) {
    return {
      stdout: "",
      stderr: `❌ Language "${language}" not supported\nSupported: ${Object.keys(executors).join(", ")}`,
      executionTime: 0,
    }
  }

  return executor(code, input)
}