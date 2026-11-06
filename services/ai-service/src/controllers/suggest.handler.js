import { validateSuggestRequest, buildSuggestMessages, parseSuggestion } from "../utils/suggest.js"
import { findSecrets } from "../utils/guard.js"

const OBJECT_ID = /^[a-f0-9]{24}$/i
const AI_TIMEOUT_MS = 30_000

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("AI timeout")), ms))])

// Factory so the permission and parsing flow can be tested with a fake model and fake room-service.
export const createSuggestHandler = ({ fetchAccess, complete, timeoutMs = AI_TIMEOUT_MS }) =>
  async (req, res) => {
    // Identity comes only from the gateway (verified token), never from the body.
    const userId = req.headers["x-user-id"]
    if (typeof userId !== "string" || !OBJECT_ID.test(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized" })
    }

    const { value, error } = validateSuggestRequest(req.body)
    if (error) return res.status(400).json({ success: false, message: error })

    // Permission is checked BEFORE any model tokens are spent.
    const access = await fetchAccess({ roomId: value.roomId, userId })
    if (!access) return res.status(403).json({ success: false, message: "No access to this room" })
    if (!access.canWrite) {
      return res.status(403).json({ success: false, message: "You cannot edit this room right now" })
    }
    if (!access.canUseAI) {
      return res.status(403).json({ success: false, message: "AI assistance is turned off in this room" })
    }

    if (findSecrets(value.baseText) > 0) {
      return res.status(422).json({
        success: false,
        message: "The selection looks like it contains a secret (API key, token or password). Remove it before using AI.",
      })
    }

    let raw
    try {
      raw = await withTimeout(
        complete(buildSuggestMessages(value), { private: access.roomType === "interview" }),
        timeoutMs,
      )
    } catch (e) {
      console.error("AI suggest failed:", e.message)            // never log the code itself
      return res.status(502).json({ success: false, message: "AI suggestion failed. Please try again." })
    }

    const parsed = parseSuggestion(raw, value.baseText)
    if (parsed.error) return res.status(422).json({ success: false, message: parsed.error })

    console.log(`AI suggest ok — room ${value.roomId}, base ${value.baseText.length} chars`)
    res.status(200).json({ success: true, replacement: parsed.value.replacement, summary: parsed.value.summary })
  }