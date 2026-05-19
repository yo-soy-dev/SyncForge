import { useState, useCallback } from "react"
import { executeApi } from "../services/api"
import { EXECUTION_LIMITS } from "../utils/constants"

export const useTerminal = (language) => {
  const [output, setOutput] = useState([])
  const [running, setRunning] = useState(false)

  const run = useCallback(
    async (codeOrObj, inputFallback = "") => {
      const code  = typeof codeOrObj === "object" ? codeOrObj.code  : codeOrObj
      const input = typeof codeOrObj === "object" ? (codeOrObj.input ?? "") : inputFallback

      if (!code?.trim()) {
        setOutput([{ type: "error", text: "Write some code first!" }])
        return
      }

      if (code.length > EXECUTION_LIMITS.MAX_CODE_SIZE) {
        setOutput([{
          type: "error",
          text: `Code too long! Max ${EXECUTION_LIMITS.MAX_CODE_SIZE / 1000}KB allowed.`,
        }])
        return
      }

      setRunning(true)
      setOutput([{ type: "info", text: `▶ Running ${language}...` }])

      try {
        const data = await executeApi.run({ code, language, input })

        if (data.stdout) {
          setOutput(prev => [...prev, { type: "output", text: data.stdout }])
        }
        if (data.stderr) {
          setOutput(prev => [...prev, { type: "error", text: data.stderr }])
        }
        if (!data.stdout && !data.stderr) {
          setOutput(prev => [...prev, { type: "info", text: "✓ No output" }])
        }

        setOutput(prev => [...prev, {
          type: "info",
          text: `─── Exited in ${data.executionTime || "?"}ms ───`,
        }])
      } catch (err) {
        setOutput(prev => [...prev, {
          type: "error",
          text: `Error: ${err.response?.data?.stderr || err.response?.data?.error || err.message}`,
        }])
      } finally {
        setRunning(false)
      }
    },
    [language]
  )

  // ← YEH MISSING THA
  const clear = useCallback(() => setOutput([]), [])

  return { output, running, run, clear }  // ← YEH BHI MISSING THA
}