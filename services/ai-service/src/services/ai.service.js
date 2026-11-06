import { callModel } from "./llm.js"

// review / chat / explain / fix
export const askModel = (messages, opts = {}) =>
  callModel({
    messages,
    maxTokens: opts.maxTokens ?? 1000,
    temperature: opts.temperature ?? 0.3,
    name: opts.name ?? "ask",
    private: !!opts.private,
  })

export const suggestEdit = (messages, opts = {}) =>
  callModel({ messages, maxTokens: 2000, temperature: 0.2, name: "suggest", private: !!opts.private })

// Interview summaries are always private (never traced).
export const draftSummary = (messages, opts = {}) =>
  callModel({ messages, maxTokens: 1200, temperature: 0.3, name: "interview-summary", private: opts.private !== false })