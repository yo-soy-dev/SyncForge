// import { Mistral } from "@mistralai/mistralai"
// import { traceable } from "langsmith/traceable"
// import { redactSecrets } from "../utils/guard.js"

// // Pin a dated model version in MISTRAL_MODEL once your evals pass. "latest" can change behaviour silently.
// const MODEL = process.env.MISTRAL_MODEL || "mistral-small-latest"
// const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY })

// const RETRYABLE = new Set([408, 429, 500, 502, 503, 504])
// const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// const statusOf = (e) => e?.statusCode ?? e?.status ?? e?.response?.status
// const log = (entry) => console.log(JSON.stringify({ ts: new Date().toISOString(), ...entry }))

// const withTimeout = (promise, ms) =>
//   Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("AI timeout")), ms))])

// const textOf = (content) =>
//   typeof content === "string"
//     ? content
//     : Array.isArray(content)
//       ? content.map((c) => (typeof c === "string" ? c : (c?.text ?? ""))).join("")
//       : ""

// const rawCall = async ({ messages, maxTokens, temperature, name = "call", timeoutMs = 20_000, retries = 1 }) => {
//   const started = Date.now()
//   let attempt = 0

//   for (;;) {
//     try {
//       const response = await withTimeout(
//         mistral.chat.complete({
//           model: MODEL,
//           messages,
//           maxTokens,
//           ...(temperature !== undefined ? { temperature } : {}),
//         }),
//         timeoutMs,
//       )
//       log({
//         event: "llm_call", name, ok: true, model: MODEL, attempt, ms: Date.now() - started,
//         promptTokens: response.usage?.promptTokens,
//         completionTokens: response.usage?.completionTokens,
//       })
//       return textOf(response.choices?.[0]?.message?.content)
//     } catch (err) {
//       const status = statusOf(err)
//       if (RETRYABLE.has(status) && attempt < retries) {
//         attempt += 1
//         await sleep(400 * 2 ** attempt + Math.random() * 200)
//         continue
//       }
//       log({ event: "llm_call", name, ok: false, model: MODEL, attempt, ms: Date.now() - started, status, error: err.message })
//       throw err
//     }
//   }
// }

// // No-op unless LANGSMITH_TRACING=true and LANGSMITH_API_KEY are set.
// // Secrets are redacted from what is sent; interview content never takes this path (see callModel).
// const traced = traceable(rawCall, {
//   name: "mistral.chat",
//   run_type: "llm",
//   metadata: { service: "ai-service", model: MODEL },
//   processInputs: (inputs) => {
//     const arg = inputs?.args?.[0] ?? inputs
//     return {
//       name: arg?.name,
//       maxTokens: arg?.maxTokens,
//       temperature: arg?.temperature,
//       messages: (arg?.messages ?? []).map((m) => ({ role: m.role, content: redactSecrets(m.content).text })),
//     }
//   },
// })

// // private:true (interview rooms) bypasses tracing entirely.
// export const callModel = (opts) => (opts.private ? rawCall(opts) : traced(opts))










import { GoogleGenAI } from "@google/genai"
import OpenAI from "openai"
import { traceable } from "langsmith/traceable"
import { redactSecrets } from "../utils/guard.js"

// --------------------------------------------------
// Provider configuration
// --------------------------------------------------

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.8-flash"

const GROQ_MODEL =
  process.env.GROQ_MODEL || "openai/gpt-oss-120b"

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing")
}

const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
})

// Groq is optional. Gemini remains primary.
const groq =
  process.env.GROQ_API_KEY
    ? new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
        timeout: 25_000,
        maxRetries: 0,
      })
    : null

const RETRYABLE = new Set([408, 429, 500, 502, 503, 504])

const log = (entry) =>
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    ...entry,
  }))

const statusOf = (err) =>
  Number(err?.status ?? err?.statusCode ?? err?.response?.status) || undefined

const withTimeout = async (promise, ms) => {
  let timer

  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("AI timeout")),
          ms
        )
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

const textOf = (content) =>
  typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((part) =>
          typeof part === "string"
            ? part
            : part?.text ?? ""
        ).join("")
      : ""

// --------------------------------------------------
// Message conversion
// --------------------------------------------------

const toGeminiContents = (messages) => {
  const systemParts = []
  const contents = []

  for (const message of messages) {
    const role = String(message.role || "").toLowerCase()
    const content = textOf(message.content)

    if (role === "system" || role === "developer") {
      systemParts.push(content)
      continue
    }

    contents.push({
      role: role === "assistant" ? "model" : "user",
      parts: [{ text: content }],
    })
  }

  return {
    systemInstruction: systemParts.join("\n\n") || undefined,
    contents,
  }
}

const toGroqMessages = (messages) =>
  messages.map((message) => {
    const role = String(message.role || "").toLowerCase()

    return {
      role:
        role === "assistant"
          ? "assistant"
          : role === "system" || role === "developer"
            ? "system"
            : "user",
      content: textOf(message.content),
    }
  })

// --------------------------------------------------
// Fallback eligibility
// --------------------------------------------------

const shouldFallback = (err) => {
  const status = statusOf(err)

  if (status !== undefined) {
    return RETRYABLE.has(status)
  }

  return /AI timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|fetch failed|network error/i
    .test(err?.message || "")
}

// --------------------------------------------------
// Gemini: Primary provider
// --------------------------------------------------

const callGemini = async ({
  messages,
  maxTokens,
  temperature,
  timeoutMs,
}) => {
  const { systemInstruction, contents } =
    toGeminiContents(messages)

  const response = await withTimeout(
    gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        ...(systemInstruction
          ? { systemInstruction }
          : {}),
        ...(maxTokens !== undefined
          ? { maxOutputTokens: maxTokens }
          : {}),
        ...(temperature !== undefined
          ? { temperature }
          : {}),
      },
    }),
    timeoutMs
  )

  const output = response.text || ""

  if (!output.trim()) {
    throw new Error("Gemini returned an empty response")
  }

  return {
    output,
    usage: response.usageMetadata,
  }
}

// --------------------------------------------------
// Groq: Fallback provider
// --------------------------------------------------

const callGroq = async ({
  messages,
  maxTokens,
  temperature,
  timeoutMs,
}) => {
  if (!groq) {
    throw new Error(
      "Groq fallback is not configured. Check GROQ_API_KEY."
    )
  }

  const response = await groq.chat.completions.create(
    {
      model: GROQ_MODEL,
      messages: toGroqMessages(messages),
      ...(maxTokens !== undefined
        ? { max_tokens: maxTokens }
        : {}),
      ...(temperature !== undefined
        ? { temperature }
        : {}),
    },
    {
      timeout: timeoutMs,
    }
  )

  const output = textOf(
    response.choices?.[0]?.message?.content
  )

  if (!output.trim()) {
    throw new Error("Groq returned an empty response")
  }

  return {
    output,
    usage: response.usage,
  }
}

// --------------------------------------------------
// Provider router
// Gemini first -> Groq on temporary failures
// --------------------------------------------------

const rawCall = async ({
  messages,
  maxTokens,
  temperature,
  name = "call",
  timeoutMs = 15_000,
}) => {
  const started = Date.now()

  try {
    const result = await callGemini({
      messages,
      maxTokens,
      temperature,
      timeoutMs,
    })

    log({
      event: "llm_call",
      provider: "gemini",
      name,
      ok: true,
      model: GEMINI_MODEL,
      fallback: false,
      ms: Date.now() - started,
      promptTokens: result.usage?.promptTokenCount,
      completionTokens: result.usage?.candidatesTokenCount,
    })

    return result.output
  } catch (geminiError) {
    if (!shouldFallback(geminiError)) {
      log({
        event: "llm_call",
        provider: "gemini",
        name,
        ok: false,
        model: GEMINI_MODEL,
        fallback: false,
        status: statusOf(geminiError),
        ms: Date.now() - started,
        error: geminiError.message,
      })

      throw geminiError
    }

    log({
      event: "llm_fallback",
      from: "gemini",
      to: "groq",
      name,
      reason: geminiError.message,
      status: statusOf(geminiError),
    })

    if (!groq) {
      log({
        event: "llm_fallback",
        provider: "groq",
        name,
        ok: false,
        error: "Groq is not configured",
      })

      throw geminiError
    }

    try {
      const result = await callGroq({
        messages,
        maxTokens,
        temperature,
        timeoutMs,
      })

      log({
        event: "llm_call",
        provider: "groq",
        name,
        ok: true,
        model: GROQ_MODEL,
        fallback: true,
        ms: Date.now() - started,
        promptTokens: result.usage?.prompt_tokens,
        completionTokens: result.usage?.completion_tokens,
      })

      return result.output
    } catch (groqError) {
      log({
        event: "llm_call",
        provider: "groq",
        name,
        ok: false,
        model: GROQ_MODEL,
        fallback: true,
        status: statusOf(groqError),
        ms: Date.now() - started,
        error: groqError.message,
        primaryError: geminiError.message,
      })

      throw groqError
    }
  }
}

// --------------------------------------------------
// LangSmith tracing
// --------------------------------------------------

const traced = traceable(rawCall, {
  name: "ai.provider-router",
  run_type: "llm",
  metadata: {
    service: "ai-service",
    primary: "gemini",
    fallback: "groq",
  },
  processInputs: (inputs) => {
    const arg = inputs?.args?.[0] ?? inputs

    return {
      name: arg?.name,
      maxTokens: arg?.maxTokens,
      temperature: arg?.temperature,
      messages: (arg?.messages ?? []).map((message) => ({
        role: message.role,
        content: redactSecrets(message.content).text,
      })),
    }
  },
})

// Private interview requests bypass LangSmith tracing.
export const callModel = (opts) =>
  opts.private ? rawCall(opts) : traced(opts)
