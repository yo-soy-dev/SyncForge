import crypto from "crypto"

export const newNonce = () => crypto.randomBytes(6).toString("hex")

// Untrusted text goes inside tags with a random per-request suffix, so it cannot close its own block.
export const wrap = (tag, text, nonce) => `<${tag}-${nonce}>\n${text}\n</${tag}-${nonce}>`

const SECRET_PATTERNS = [
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, to: "[REDACTED PRIVATE KEY]" },
  { re: /\bAKIA[0-9A-Z]{16}\b/g, to: "[REDACTED AWS KEY]" },
  { re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g, to: "[REDACTED GITHUB TOKEN]" },
  { re: /\bsk-[A-Za-z0-9_-]{20,}/g, to: "[REDACTED API KEY]" },
  { re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, to: "[REDACTED JWT]" },
  { re: /\bmongodb(?:\+srv)?:\/\/[^\s:@/]+:[^\s@/]+@[^\s"'`]+/gi, to: "[REDACTED CONNECTION STRING]" },
  { re: /((?:api[_-]?key|secret|token|passw(?:or)?d)["']?\s*[:=]\s*)(["'`])[^"'`\n]{8,}\2/gi, to: "$1$2[REDACTED]$2" },
]

export const findSecrets = (text = "") =>
  SECRET_PATTERNS.reduce((n, { re }) => n + (text.match(re)?.length ?? 0), 0)

export const redactSecrets = (text = "") => {
  let out = text
  let count = 0
  for (const { re, to } of SECRET_PATTERNS) {
    const hits = out.match(re)
    if (hits) {
      count += hits.length
      out = out.replace(re, to)
    }
  }
  return { text: out, count }
}

// A heuristic for LOGGING only. Real protection is structural (nonce blocks + human review).
const INJECTION =
  /(ignore (all )?(the )?(previous|prior|above) (instructions|rules)|disregard (the )?(system|previous)|you are now|system (prompt|override|notice)|reveal your (prompt|instructions)|<\/?(instruction|code|data|question)-)/i

export const looksLikeInjection = (text = "") => INJECTION.test(text)