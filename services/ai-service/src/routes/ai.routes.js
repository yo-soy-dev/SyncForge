import { Router } from "express"
import * as aiController from "../controllers/ai.controller.js"
import * as suggestController from "../controllers/suggest.controller.js"
import { interviewSummary } from "../controllers/summary.controller.js"
import { roomAIGuard } from "../middleware/roomAI.js"

const router = Router()

router.post("/review", roomAIGuard, aiController.reviewCode)
router.post("/chat", roomAIGuard, aiController.chatWithAI)
router.post("/fix", roomAIGuard, aiController.fixCode)
router.post("/explain", roomAIGuard, aiController.explainCode)
router.post("/suggest", suggestController.suggest)
router.post("/interview-summary", interviewSummary)

export default router