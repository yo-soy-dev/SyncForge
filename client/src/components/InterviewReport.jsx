import { useEffect, useState } from "react"
import { toast } from "sonner"
import { aiApi, roomApi } from "../services/api"
import { buildReportMarkdown, describeEvent, formatOffset } from "../utils/reportMarkdown"
import { Clock, RefreshCw, Sparkles, FileDown } from "lucide-react"
import { ConfirmDialog } from "./ConfirmDialog"

const msg = (e) => e?.response?.data?.message || e?.message || "Something went wrong"

const download = (filename, text) => {
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }))
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const offset = (iso, startIso) =>
  startIso ? formatOffset(Math.round(((new Date(iso) - new Date(startIso)) / 60000) * 10) / 10) : ""

// Interviewers only: event timeline, the interviewer's own written summary (optionally started from an
// AI draft that only describes what happened), and a Markdown report export.
export const InterviewReport = ({ room, roomId, role, currentUsername, editorRef }) => {
  const iv = room.interview || {}
  const isOwner = role === "owner"
  const ended = iv.status === "ended"

  const [events, setEvents] = useState([])
  const [text, setText] = useState("")
  const [aiAssisted, setAiAssisted] = useState(false)
  const [savedBy, setSavedBy] = useState("")
  const [busy, setBusy] = useState(false)
  const [confirmDraft, setConfirmDraft] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const refresh = () => setReloadKey((k) => k + 1)

  useEffect(() => {
    let cancelled = false
    Promise.all([roomApi.getTimeline(roomId), roomApi.getSummary(roomId)])
      .then(([t, s]) => {
        if (cancelled) return
        setEvents(t.events || [])
        if (s.summary) {
          setText(s.summary.text || "")
          setAiAssisted(!!s.summary.aiAssisted)
          setSavedBy(s.summary.updatedByName || "")
        }
      })
      .catch((e) => toast.error(msg(e)))
    return () => { cancelled = true }
  }, [roomId, iv.status, reloadKey])

  const requestDraft = () => (text.trim() ? setConfirmDraft(true) : draft())

  const draft = async () => {
    setBusy(true)
    try {
      const data = await aiApi.draftSummary(roomId)
      setText(data.text)
      setAiAssisted(true)
      toast.success("Draft ready. Read it and edit it before saving.")
    } catch (e) { toast.error(msg(e)) }
    finally { setBusy(false) }
  }

  const save = async () => {
    setBusy(true)
    try {
      await roomApi.saveSummary(roomId, { text, aiAssisted })
      toast.success("Summary saved")
      refresh()
    } catch (e) { toast.error(msg(e)) }
    finally { setBusy(false) }
  }

  const exportReport = async () => {
    setBusy(true)
    try {
      const [t, s, sc, snaps] = await Promise.all([
        roomApi.getTimeline(roomId), roomApi.getSummary(roomId), roomApi.getScorecards(roomId), roomApi.listSnapshots(roomId),
      ])
      const list = snaps.snapshots || []
      const finalMeta = list.find((x) => x.kind === "interview-end") || list[0]
      let finalCode = editorRef.current?.getValue() ?? ""
      if (finalMeta) finalCode = (await roomApi.getSnapshot(roomId, finalMeta._id)).snapshot.text
      const md = buildReportMarkdown({
        room, events: t.events || [], summary: s.summary, scorecards: sc.scorecards || [], finalCode, exportedBy: currentUsername,
      })
      download(`${(room.name || "interview").replace(/[^a-z0-9_-]+/gi, "_").slice(0, 60)}-report.md`, md)
    } catch (e) { toast.error(msg(e)) }
    finally { setBusy(false) }
  }

  return (
    <section className="min-w-0 space-y-4 rounded-xl border border-line p-4">
      <div className="flex items-center gap-2.5">
        <Clock size={15} className="text-muted shrink-0" />
        <h4 className="font-display text-sm font-semibold text-fg">Timeline &amp; report</h4>
        <button
          onClick={refresh}
          aria-label="Refresh timeline"
          title="Refresh"
          className="ml-auto w-7 h-7 flex items-center justify-center rounded-md border border-line text-muted hover:text-fg hover:border-muted transition-colors"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* TIMELINE */}
      <div className="max-h-48 overflow-y-auto pr-1">
        {events.length === 0 ? (
          <p className="text-xs text-muted">No events yet.</p>
        ) : (
          <ol className="relative border-l border-line ml-1.5 space-y-2.5">
            {events.map((e) => (
              <li key={e._id} className="pl-4 relative">
                <span className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full bg-line" />
                <p className="font-mono text-[11px] text-muted">
                  {new Date(e.at).toLocaleTimeString()}
                  {offset(e.at, iv.startedAt) && ` (${offset(e.at, iv.startedAt)})`}
                </p>
                <p className="text-xs text-fg leading-relaxed">{describeEvent(e)}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
      <p className="text-[10px] text-muted">
        Joins through the live editor, disconnects and reconnects are not recorded.
      </p>

      {/* SUMMARY */}
      <div className="space-y-2">
        <p className="text-xs text-fg">
          Summary{" "}
          {aiAssisted && (
            <span className="text-[10px] text-ai">(started from an AI draft)</span>
          )}
          {savedBy && (
            <span className="text-[10px] text-muted"> · last saved by {savedBy}</span>
          )}
        </p>

        <textarea
          value={text}
          maxLength={8000}
          rows={7}
          readOnly={!isOwner}
          placeholder={isOwner ? "Your summary of what happened in this interview" : "Only the interview owner writes the summary"}
          onChange={(e) => { setText(e.target.value); if (!e.target.value) setAiAssisted(false) }}
          className="w-full min-w-0 max-w-full resize-y bg-ink border border-line rounded-lg p-3 text-xs text-fg placeholder:text-muted focus:outline-none focus:border-ember transition-colors"
        />

        {isOwner && (
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy || !ended}
              onClick={requestDraft}
              title={ended ? "" : "Available after the interview ends"}
              className="h-9 px-4 inline-flex items-center gap-2 rounded-lg border border-ai/40 text-ai text-xs font-semibold hover:bg-ai/10 disabled:opacity-40 transition-colors"
            >
              <Sparkles size={14} />
              Draft with AI
            </button>
            <button
              disabled={busy}
              onClick={save}
              className="h-9 px-4 rounded-lg bg-ember text-ink text-xs font-semibold hover:brightness-110 disabled:opacity-40 transition"
            >
              Save summary
            </button>
          </div>
        )}

        <p className="text-[10px] text-muted leading-relaxed">
          An AI draft only describes events and the final code. It never rates anyone or recommends a decision, and it can be wrong.
          You are responsible for what you save.
        </p>
      </div>

      <button
        disabled={busy}
        onClick={exportReport}
        className="h-9 px-4 inline-flex items-center gap-2 rounded-lg border border-line text-fg text-xs font-medium hover:border-muted disabled:opacity-40 transition-colors"
      >
        <FileDown size={14} />
        Export report (.md)
      </button>

      <ConfirmDialog
        open={confirmDraft}
        title="Replace your summary?"
        description="Your current summary text will be replaced with a new AI draft. You can still edit it before saving."
        confirmLabel="Replace with draft"
        onCancel={() => setConfirmDraft(false)}
        onConfirm={() => {
          setConfirmDraft(false)
          draft()
        }}
      />
    </section>
  )
}
