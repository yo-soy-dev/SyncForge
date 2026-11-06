import { createSummaryHandler } from "./summary.handler.js"
import { fetchSummarySource } from "../services/summarySource.js"
import { draftSummary } from "../services/ai.service.js"

export const interviewSummary = createSummaryHandler({
  fetchSource: fetchSummarySource,
  complete: draftSummary,
})