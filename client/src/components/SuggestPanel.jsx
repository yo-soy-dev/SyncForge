import { useEffect, useRef, useState } from "react"
import { DiffEditor } from "@monaco-editor/react"
import { toast } from "sonner"
import { aiApi, roomApi } from "../services/api"
import { Lightbulb, Sparkles, Loader2, Check, X, Info, RefreshCw } from "lucide-react"
import { defineCoduetTheme } from "../utils/monacoTheme"

const msg = (e) => e?.response?.data?.message || e?.message || "Something went wrong"

// The range this suggestion applies to, or null when the code has changed since it was requested.
//  - "file" scope: the whole document must be exactly what the AI saw.
//  - "selection" scope: a tracked range follows the text even if collaborators type above it,
//    and the text inside must still be exactly what the AI saw.
const resolveRange = (model, p) => {
  if (p.scope === "file") return model.getValue() === p.baseText ? model.getFullModelRange() : null
  const r = model.getDecorationRange(p.decorationId)
  return r && model.getValueInRange(r) === p.baseText ? r : null
}

// AI proposes, a human decides: nothing changes in the document until Accept, and a
// restore point is saved first. Accepting goes through the normal editor, so it is subject to
// the same permission checks as typing.
export const SuggestPanel = ({ roomId, language, editorRef, canWrite, canUseAI, isInterview }) => {
  const [instruction, setInstruction] = useState("")
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [proposal, setProposal] = useState(null)   // { baseText, replacement, summary, scope, decorationId }
  const [stale, setStale] = useState(false)
  const decoRef = useRef(null)

  const dropDecoration = () => {
    const model = editorRef.current?.getModel?.()
    if (model && decoRef.current) model.deltaDecorations([decoRef.current], [])
    decoRef.current = null
  }

  const discard = () => {
    dropDecoration()
    setProposal(null)
    setStale(false)
  }

  // Remove the tracked range if the panel is closed while a proposal is open.
  useEffect(() => () => {
    const model = editorRef.current?.getModel?.()
    if (model && decoRef.current) model.deltaDecorations([decoRef.current], [])
  }, [editorRef])

  // While a proposal is on screen, keep checking whether the code underneath it has changed.
  useEffect(() => {
    if (!proposal) return
    const t = setInterval(() => {
      const model = editorRef.current?.getModel?.()
      if (model) setStale(!resolveRange(model, proposal))
    }, 700)
    return () => clearInterval(t)
  }, [proposal, editorRef])

  const requestSuggestion = async () => {
    const editor = editorRef.current
    const model = editor?.getModel?.()
    if (!editor || !model) return toast.error("The editor is not ready yet")
    if (!instruction.trim()) return toast.error("Tell the AI what to change")

    discard()
    const selection = editor.getSelection()
    const useSelection = !!selection && !selection.isEmpty()
    const range = useSelection ? selection : model.getFullModelRange()
    const baseText = model.getValueInRange(range)

    let decorationId = null
    if (useSelection) {
      // stickiness 1 = NeverGrowsWhenTypingAtEdges
      ;[decorationId] = model.deltaDecorations([], [{ range, options: { stickiness: 1 } }])
      decoRef.current = decorationId
    }

    setLoading(true)
    try {
      const data = await aiApi.suggest({ roomId, instruction, baseText, language })
      setProposal({
        baseText,
        replacement: data.replacement,
        summary: data.summary,
        scope: useSelection ? "selection" : "file",
        decorationId,
      })
      setStale(false)
    } catch (e) {
      dropDecoration()
      toast.error(msg(e))
    } finally {
      setLoading(false)
    }
  }

  const accept = async () => {
    const editor = editorRef.current
    const model = editor?.getModel?.()
    if (!proposal || !editor || !model) return

    if (!resolveRange(model, proposal)) {
      setStale(true)
      return toast.warning("The code changed since this suggestion was made. Regenerate it.")
    }

    setApplying(true)
    try {
      // Restore point first. If it cannot be saved, nothing is applied.
      await roomApi.createSnapshot(roomId, { text: model.getValue(), language, kind: "before-ai" })

      // Someone may have typed while the snapshot was saving: check again.
      const range = resolveRange(model, proposal)
      if (!range) {
        setStale(true)
        return toast.warning("The code changed while saving the restore point. Regenerate the suggestion.")
      }

      editor.pushUndoStop()
      const ok = editor.executeEdits("ai-suggest", [{ range, text: proposal.replacement, forceMoveMarkers: true }])
      editor.pushUndoStop()
      if (!ok) return toast.error("The editor is read-only right now, so the suggestion was not applied")

      toast.success("Suggestion applied. A restore point was saved in History.")
      discard()
    } catch (e) {
      toast.error(`Not applied: ${msg(e)}`)
    } finally {
      setApplying(false)
    }
  }

  const blockedReason = !canWrite
    ? "You can only request suggestions while you are able to edit."
    : !canUseAI
      ? isInterview
        ? "AI assistance is off for this interview. The interviewer can turn it on."
        : "AI assistance is not available right now."
      : null

   return (
    <div className="h-full min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 shrink-0 rounded-lg border border-ai/30 bg-ai/10 flex items-center justify-center">
          <Lightbulb size={16} className="text-ai" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-fg">AI suggestions</h3>
          <p className="text-[11px] text-muted">You review every change before it applies</p>
        </div>
      </div>

      {blockedReason ? (
        <div className="flex gap-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2.5 text-xs text-gold">
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>{blockedReason}</span>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted leading-relaxed">
            Applies to your selection, or to the whole file if nothing is selected.
          </p>

          <textarea
            value={instruction}
            maxLength={1000}
            rows={3}
            placeholder="e.g. Fix the off-by-one error, or add input validation"
            onChange={(e) => setInstruction(e.target.value)}
            className="w-full resize-none bg-ink border border-line rounded-lg p-3 text-xs text-fg placeholder:text-muted focus:outline-none focus:border-ai transition-colors"
          />

          <button
            onClick={requestSuggestion}
            disabled={loading || applying}
            className="h-9 px-4 inline-flex items-center gap-2 rounded-lg bg-ai text-ink text-xs font-semibold hover:brightness-110 disabled:opacity-40 transition"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            {loading ? "Thinking..." : proposal ? "Ask again" : "Suggest"}
          </button>
        </>
      )}

      {proposal && (
        <section className="space-y-3 rounded-xl border border-line bg-surface p-3">
          <p className="text-xs text-fg leading-relaxed">
            {proposal.summary || "Suggested change"}{" "}
            <span className="font-mono text-[11px] text-muted">
              ({proposal.scope === "file" ? "whole file" : "selection"})
            </span>
          </p>

          <div className="rounded-lg overflow-hidden border border-line">
            <DiffEditor
              original={proposal.baseText}
              modified={proposal.replacement}
              language={language}
              theme="coduet"
              beforeMount={defineCoduetTheme}
              height="300px"
              options={{
                readOnly: true,
                renderSideBySide: false,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                fontSize: 12,
              }}
            />
          </div>

          {stale && (
            <div className="flex gap-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2.5 text-xs text-gold">
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>
                The code changed since this suggestion was made, so it can no longer be applied safely.
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={accept}
              disabled={stale || applying || !canWrite}
              className="h-9 px-4 inline-flex items-center gap-2 rounded-lg bg-ember text-ink text-xs font-semibold hover:brightness-110 disabled:opacity-40 transition"
            >
              {applying ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              {applying ? "Applying..." : "Accept"}
            </button>

            {stale && (
              <button
                onClick={requestSuggestion}
                disabled={loading}
                className="h-9 px-4 inline-flex items-center gap-2 rounded-lg border border-ai/40 text-ai text-xs font-semibold hover:bg-ai/10 disabled:opacity-40 transition-colors"
              >
                <RefreshCw size={14} />
                Regenerate
              </button>
            )}

            <button
              onClick={discard}
              className="h-9 px-4 inline-flex items-center gap-2 rounded-lg border border-line text-muted text-xs font-medium hover:text-fg hover:border-muted transition-colors"
            >
              <X size={14} />
              Discard
            </button>
          </div>
        </section>
      )}

      <p className="text-[11px] text-muted leading-relaxed">
        Suggestions can be wrong. Read the diff before accepting. A restore point is saved first.
      </p>
    </div>
  )
}