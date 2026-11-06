import { useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Terminal as TerminalIcon, Trash2, AlertCircle } from "lucide-react"

const LINE_STYLES = {
  error: "text-red-400 border-l-2 border-red-500/60 pl-2",
  info: "text-muted",
  output: "text-fg",
}

export const Terminal = ({
  output = [],
  running,
  onClear,
  isOpen,
  stdin = "",
  setStdin,
  needsInput = false,
}) => {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [output])

  const stdinMissing = !stdin.trim()

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "35vh", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="border-t border-line bg-ink flex flex-col overflow-hidden w-full min-h-0 max-h-[45vh] sm:max-h-[60vh]"
        >
          {/* HEADER */}
          <div className="h-9 px-3 sm:px-4 flex items-center justify-between gap-2 border-b border-line bg-surface shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <TerminalIcon size={13} className="text-muted shrink-0" />
              <span className="font-mono text-[11px] text-muted">Output</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {running && (
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ember">
                  <span className="w-1.5 h-1.5 rounded-full bg-ember animate-pulse" />
                  Running
                </span>
              )}

              <button
                onClick={onClear}
                className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md font-mono text-[11px] text-muted hover:text-fg hover:bg-ink transition-colors"
              >
                <Trash2 size={12} />
                Clear
              </button>
            </div>
          </div>

          {/* OUTPUT */}
          <div
            role="log"
            className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed break-words"
          >
            {output.length === 0 ? (
              <p className="text-muted">
                Press <kbd className="text-fg">Ctrl</kbd>+
                <kbd className="text-fg">Enter</kbd> to run. Output appears here.
              </p>
            ) : (
              output.map((line, i) => (
                <div
                  key={i}
                  className={`whitespace-pre-wrap ${LINE_STYLES[line.type] || "text-fg"}`}
                >
                  {line.text}
                </div>
              ))
            )}

            <div ref={bottomRef} />
          </div>

          {/* STDIN */}
          {needsInput && (
            <div
              className={`border-t bg-surface p-2 ${
                stdinMissing ? "border-t-ember/60" : "border-t-line"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 font-mono text-[11px] ${
                    stdinMissing ? "text-ember" : "text-muted"
                  }`}
                >
                  {stdinMissing && <AlertCircle size={12} />}
                  {stdinMissing
                    ? "stdin required. Enter input below"
                    : "stdin / custom input"}
                </span>

                {stdin.length > 0 && (
                  <button
                    onClick={() => setStdin("")}
                    className="font-mono text-[11px] text-muted hover:text-fg transition-colors"
                  >
                    clear input
                  </button>
                )}
              </div>

              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder={`Example:\n5\n10 20\nhello`}
                spellCheck={false}
                className={`w-full min-h-[70px] max-h-[120px] resize-y rounded-lg border bg-ink px-3 py-2 font-mono text-xs text-fg placeholder:text-muted outline-none transition-colors ${
                  stdinMissing
                    ? "border-ember/40 focus:border-ember"
                    : "border-line focus:border-sync"
                }`}
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}