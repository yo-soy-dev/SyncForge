import { createSuggestHandler } from "./suggest.handler.js"
import { fetchRoomAccess } from "../services/roomAccess.js"
import { suggestEdit } from "../services/ai.service.js"

export const suggest = createSuggestHandler({
  fetchAccess: fetchRoomAccess,
  complete: suggestEdit,
})