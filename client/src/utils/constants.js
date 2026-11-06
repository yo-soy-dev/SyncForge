// "" = same origin (nginx). Sirf undefined hone par local-dev fallback.
export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001"
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.DEV ? "http://localhost:4003" : window.location.origin)

export const LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "java",
  "cpp",
  "go",
]

export const LANGUAGE_EXTENSIONS = {
  javascript: "js",
  typescript: "ts",
  python: "py",
  java: "java",
  cpp: "cpp",
  go: "go",
}

export const DEFAULT_FILENAME = (language) =>
  `main.${LANGUAGE_EXTENSIONS[language] || language}`


export const SOCKET_EVENTS = {
  JOIN_ROOM: "join-room",
  YJS_UPDATE: "yjs-update",
  YJS_SYNC: "yjs-sync",
  AWARENESS_UPDATE: "awareness-update",
  USER_LEFT: "user-left",
  ERROR: "error",
}


export const TERMINAL_OUTPUT_TYPES = {
  OUTPUT: "output",
  ERROR: "error",
  INFO: "info",
}


export const EXECUTION_LIMITS = {
  TIMEOUT_MS: 5000,
  MAX_CODE_SIZE: 50000,
}



export const INPUT_PATTERNS = {
  cpp: /cin\s*>>|getline\s*\(\s*cin|scanf\s*\(/,
  c: /scanf\s*\(/,
  java: /Scanner|BufferedReader|nextInt|nextLine|next\(\)/,
  python: /input\s*\(|sys\.stdin/,
  javascript: /readline|prompt\s*\(|readFileSync\(\s*0|process\.stdin/,
  typescript: /readline|prompt\s*\(|readFileSync\(\s*0|process\.stdin/,
  go: /fmt\.Scan|os\.Stdin/,
}

export const codeNeedsInput = (code, language) => {
  const pattern = INPUT_PATTERNS[language]
  return pattern ? pattern.test(code) : false
}




export const LANGUAGE_COLORS = {
  javascript: "#F7DF1E",
  typescript: "#3B82F6",
  python: "#4B8BBE",
  java: "#ED8B00",
  cpp: "#5C9BD6",
  go: "#00ADD8",
}



// Languages the execution service can actually run. Keep in sync with its
// ENABLED_LANGUAGES setting (or override with VITE_RUNNABLE_LANGUAGES).
export const RUNNABLE_LANGUAGES = (
  import.meta.env.VITE_RUNNABLE_LANGUAGES || "javascript,typescript,python,java,cpp,go"
)
  .split(",")
  .map((l) => l.trim())
  .filter(Boolean)