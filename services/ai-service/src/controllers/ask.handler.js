import { OBJECT_ID, MODEL_OPTIONS, validateAskRequest, buildAskMessages, buildFixInstruction } from "../utils/ask.js"
import { buildSuggestMessages, parseSuggestion } from "../utils/suggest.js"
import { findSecrets, redactSecrets, looksLikeInjection } from "../utils/guard.js"

const AI_TIMEOUT_MS = 30_000
const MAX_REPLY_CHARS = 12_000

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("AI timeout")), ms))])

export const createAskHandler = ({ kind, fetchAccess, complete, timeoutMs = AI_TIMEOUT_MS }) =>
  async (req, res) => {
    const userId = req.headers["x-user-id"] // identity only from the gateway, never from the body
    if (typeof userId !== "string" || !OBJECT_ID.test(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized" })
    }

    const { value, error } = validateAskRequest(kind, req.body)
    if (error) return res.status(400).json({ success: false, message: error })

    // Permission BEFORE any model tokens are spent.
    const access = await fetchAccess({ roomId: value.roomId, userId })
    if (!access) return res.status(403).json({ success: false, message: "No access to this room" })
    if (access.roomType === "interview") {
      return res.status(403).json({ success: false, message: "Free-form AI is not available in interview rooms. Use Suggest instead." })
    }
    if (!access.canAskAI) return res.status(403).json({ success: false, message: "AI assistance is not available to you in this room" })
    if (kind === "fix" && !access.canWrite) {
      return res.status(403).json({ success: false, message: "You cannot edit this room right now" })
    }

    // Secrets: block when the result could be applied to the document, redact when it is only read.
    if (kind === "fix" && findSecrets(value.code) > 0) {
      return res.status(422).json({
        success: false,
        message: "This code looks like it contains a secret (API key, token or password). Remove it before using AI to edit it.",
      })
    }
    const code = kind === "fix" ? value.code : redactSecrets(value.code).text
    const message = redactSecrets(value.message).text
    const errorText = redactSecrets(value.error).text

    if (looksLikeInjection(value.code) || looksLikeInjection(value.message)) {
      console.log(JSON.stringify({ event: "guard", kind, flag: "injection_suspected" })) // never log the content
    }

    const messages =
      kind === "fix"
        ? buildSuggestMessages({ instruction: buildFixInstruction(errorText), baseText: code, language: value.language })
        : buildAskMessages(kind, { code, language: value.language, message })

    let raw
    try {
      raw = await withTimeout(complete(messages, { ...MODEL_OPTIONS[kind], name: kind }), timeoutMs)
    } catch (e) {
      console.error(`AI ${kind} failed:`, e.message)
      return res.status(502).json({ success: false, message: "AI request failed. Please try again." })
    }

    if (typeof raw !== "string" || !raw.trim()) {
      return res.status(502).json({ success: false, message: "The AI returned an empty answer" })
    }

    const now = new Date().toISOString()
    const text = raw.slice(0, MAX_REPLY_CHARS)

    if (kind === "review") return res.status(200).json({ success: true, review: text, language: value.language, reviewedAt: now })
    if (kind === "explain") return res.status(200).json({ success: true, explanation: text, language: value.language, explainedAt: now })
    if (kind === "chat") return res.status(200).json({ success: true, response: text, timestamp: now })

    // fix: same parser as Suggest. The result is clean code, never markdown.
    const parsed = parseSuggestion(raw, code)
    if (parsed.error) return res.status(422).json({ success: false, message: parsed.error })
    return res.status(200).json({
      success: true,
      fixedCode: parsed.value.replacement,
      summary: parsed.value.summary,
      language: value.language,
    })
  }