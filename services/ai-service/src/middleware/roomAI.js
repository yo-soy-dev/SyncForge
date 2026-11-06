import { createRoomAIGuard } from "./roomAI.guard.js"
import { fetchRoomAccess } from "../services/roomAccess.js"

export const roomAIGuard = createRoomAIGuard({ fetchAccess: fetchRoomAccess })