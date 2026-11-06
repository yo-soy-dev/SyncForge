import { createAskHandler } from "./ask.handler.js"
import { fetchRoomAccess } from "../services/roomAccess.js"
import { askModel } from "../services/ai.service.js"

const make = (kind) => createAskHandler({ kind, fetchAccess: fetchRoomAccess, complete: askModel })

export const reviewCode = make("review")
export const chatWithAI = make("chat")
export const fixCode = make("fix")
export const explainCode = make("explain")