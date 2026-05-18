import { Router } from "express"
import * as aiController from "../controllers/ai.controller.js"

const router = Router()

router.post("/review", aiController.reviewCode)
router.post("/chat",   aiController.chatWithAI)
router.post("/fix",    aiController.fixCode)
router.post("/explain", aiController.explainCode)

export default router