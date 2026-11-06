// Pure helpers for exporting a room. No browser APIs here so they can be tested with plain Node.

const EXT = { javascript: "js", typescript: "ts", python: "py", java: "java", cpp: "cpp", go: "go" }
export const extensionFor = (language) => EXT[language] || "txt"

// A code fence longer than any run of backticks inside the code, so the code can never close it early.
export const fenceFor = (text) => {
  const longest = (text.match(/`+/g) || []).reduce((m, r) => Math.max(m, r.length), 0)
  return "`".repeat(Math.max(3, longest + 1))
}

const block = (text, language) => {
  const f = fenceFor(text)
  return `${f}${language}\n${text}\n${f}`
}

const KIND = {
  manual: "Saved", auto: "Auto", "before-ai": "Before AI change",
  "before-restore": "Before restore", "interview-end": "Interview end",
}

export const buildMarkdown = ({ roomName, language, current, snapshots = [], exportedAt = new Date() }) => {
  const title = String(roomName || "Untitled room").replace(/[\r\n]+/g, " ")
  const out = [
    `# ${title}`,
    `Exported ${exportedAt.toISOString()} · ${language}`,
    "",
    "## Current code",
    block(current, language),
    "",
    `## History (${snapshots.length} snapshot${snapshots.length === 1 ? "" : "s"}, newest first)`,
  ]
  for (const s of snapshots) {
    const who = String(s.createdByName || "Unknown").replace(/[\r\n]+/g, " ")
    out.push("", `### ${KIND[s.kind] || s.kind} — ${who} — ${new Date(s.createdAt).toISOString()}`, block(s.text ?? "", s.language || language))
  }
  return out.join("\n") + "\n"
}