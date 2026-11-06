import { useEffect, useRef, useState } from "react"
import { DiffEditor } from "@monaco-editor/react"
import { Loader2 } from "lucide-react"
import { Modal } from "./Modal"
import { roomApi } from "../services/api"
import { defineCoduetTheme } from "../utils/monacoTheme"

const msg = (e) => e?.response?.data?.message || e?.message || "Something went wrong"

/* pair = { a: { id | current, label }, b: { id | current, label } }  (a = before, b = after) */
export const SnapshotCompare = ({ open, onClose, roomId, language, pair, getCurrentText }) => {
  const [texts, setTexts] = useState(null)
  const [error, setError] = useState("")
  const [sideBySide, setSideBySide] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches,
  )

  // keep the last pair so the title doesn't go blank during the close animation
  const lastPair = useRef(pair)
  if (pair) lastPair.current = pair
  const p = pair || lastPair.current

  useEffect(() => {
    if (!open || !pair) return
    let cancelled = false
    setTexts(null)
    setError("")

    const fetchText = async (side) =>
      side.current
        ? getCurrentText()
        : ((await roomApi.getSnapshot(roomId, side.id)).snapshot?.text ?? "")

    Promise.all([fetchText(pair.a), fetchText(pair.b)])
      .then(([a, b]) => {
        if (!cancelled) setTexts({ a, b })
      })
      .catch((e) => {
        if (!cancelled) setError(msg(e))
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pair, roomId])

  const identical = texts && texts.a === texts.b
  const delta = texts ? texts.b.length - texts.a.length : 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Compare versions"
      description="Red lines were removed, green lines were added."
    >
      {error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : texts === null ? (
        <div className="flex items-center justify-center h-40 text-muted">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="max-w-full truncate rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-red-300">
              {p?.a.label}
            </span>
            <span className="text-muted">→</span>
            <span className="max-w-full truncate rounded-full border border-sync/30 bg-sync/10 px-2.5 py-1 text-sync">
              {p?.b.label}
            </span>

            <span className="ml-auto font-mono text-[11px] text-muted">
              {delta >= 0 ? "+" : ""}
              {delta} chars
            </span>

            <div role="radiogroup" aria-label="Diff layout" className="flex p-0.5 bg-ink border border-line rounded-lg">
              {[
                [false, "Inline"],
                [true, "Side by side"],
              ].map(([value, label]) => (
                <button
                  key={label}
                  role="radio"
                  aria-checked={sideBySide === value}
                  onClick={() => setSideBySide(value)}
                  className={`px-2.5 h-7 rounded-md text-[11px] transition-colors ${
                    sideBySide === value ? "bg-surface text-ember" : "text-muted hover:text-fg"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {identical && (
            <p className="rounded-lg border border-line bg-ink px-3 py-2.5 text-xs text-muted">
              These two versions are identical.
            </p>
          )}

          <div className="overflow-hidden rounded-lg border border-line">
            <DiffEditor
              original={texts.a}
              modified={texts.b}
              language={language}
              theme="coduet"
              beforeMount={defineCoduetTheme}
              height="55dvh"
              options={{
                readOnly: true,
                renderSideBySide: sideBySide,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                fontSize: 12,
              }}
            />
          </div>
        </div>
      )}
    </Modal>
  )
}