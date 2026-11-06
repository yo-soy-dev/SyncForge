import { buildSummaryMessages, checkSummaryText } from "../utils/summary.js"

const OBJECT_ID = /^[a-f0-9]{24}$/i
const AI_TIMEOUT_MS = 40_000

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("AI timeout")), ms))])

// Factory so the permission flow can be tested with a fake model and fake room-service.
export const createSummaryHandler = ({ fetchSource, complete, timeoutMs = AI_TIMEOUT_MS }) =>
  async (req, res) => {
    const userId = req.headers["x-user-id"]          // identity only from the gateway, never from the body
    if (typeof userId !== "string" || !OBJECT_ID.test(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized" })
    }
    const roomId = req.body?.roomId
    if (typeof roomId !== "string" || !OBJECT_ID.test(roomId)) {
      return res.status(400).json({ success: false, message: "Invalid room id" })
    }

    // Permission and data come from room-service BEFORE any model tokens are spent.
    const { source, error } = await fetchSource({ roomId, userId })
    if (error) return res.status(error.status).json({ success: false, message: error.message })

    let raw
    try {
      raw = await withTimeout(complete(buildSummaryMessages(source), { private: true }), timeoutMs)
    } catch (e) {
      console.error("AI summary failed:", e.message)          // never log the code or names
      return res.status(502).json({ success: false, message: "Could not draft a summary. Please try again." })
    }

    const checked = checkSummaryText(raw)
    if (checked.error) return res.status(422).json({ success: false, message: checked.error })

    console.log(`AI summary ok — room ${roomId}, ${checked.value.length} chars`)
    res.status(200).json({ success: true, text: checked.value })
  }