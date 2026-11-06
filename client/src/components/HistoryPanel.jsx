import { useEffect, useState } from "react"
import { toast } from "sonner"
import { roomApi } from "../services/api"
import { buildMarkdown, extensionFor } from "../utils/exportMarkdown"
import { History, Camera, Download, FileText, RotateCcw, GitCompare, X } from "lucide-react"
import { ConfirmDialog } from "./ConfirmDialog"
import { SnapshotCompare } from "./SnapshotCompare"

const KIND_TONE = {
  manual: "text-ember border-ember/30 bg-ember/10",
  auto: "text-muted border-line bg-ink",
  "before-ai": "text-ai border-ai/30 bg-ai/10",
  "before-restore": "text-gold border-gold/30 bg-gold/10",
  "interview-end": "text-sync border-sync/30 bg-sync/10",
}

const msg = (e) => e?.response?.data?.message || e?.message || "Something went wrong"
const KIND = {
  manual: "Saved", auto: "Auto", "before-ai": "Before AI change",
  "before-restore": "Before restore", "interview-end": "Interview end",
}

// Version history: save a snapshot, list snapshots, restore one into the editor.
// Restoring replaces the editor text through Yjs, so it goes through the same
// permission checks as any other edit (viewers and locked candidates cannot do it).
export const HistoryPanel = ({ roomId, roomName, language, editorRef, canWrite }) => {
  const [snapshots, setSnapshots] = useState([])
  const [busy, setBusy] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState(null)
  const [picked, setPicked] = useState([]) // up to 2 snapshot ids
  const [pair, setPair] = useState(null)

  // selecting a third one drops the oldest selection
  const togglePick = (id) =>
    setPicked((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : p.length >= 2 ? [p[1], id] : [...p, id],
    )

  const startCompare = () => {
    const label = (s) => `${KIND[s.kind] || s.kind} · ${new Date(s.createdAt).toLocaleString()}`
    const chosen = picked
      .map((id) => snapshots.find((s) => s._id === id))
      .filter(Boolean)
      .sort((x, y) => new Date(x.createdAt) - new Date(y.createdAt)) // older first

    if (chosen.length === 2) {
      setPair({
        a: { id: chosen[0]._id, label: label(chosen[0]) },
        b: { id: chosen[1]._id, label: label(chosen[1]) },
      })
    } else if (chosen.length === 1) {
      setPair({
        a: { id: chosen[0]._id, label: label(chosen[0]) },
        b: { current: true, label: "Current editor" },
      })
    }
  }

  const [reloadKey, setReloadKey] = useState(0)
  const load = () => setReloadKey((k) => k + 1)

  useEffect(() => {
    let cancelled = false
    roomApi.listSnapshots(roomId)
      .then((data) => { if (!cancelled) setSnapshots(data.snapshots || []) })
      .catch((e) => toast.error(msg(e)))
    return () => { cancelled = true }
  }, [roomId, reloadKey])

  const save = async (kind = "manual") => {
    const text = editorRef.current?.getValue() ?? ""
    await roomApi.createSnapshot(roomId, { text, language, kind })
  }

  const download = (filename, text, type) => {
    const url = URL.createObjectURL(new Blob([text], { type }))
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const safeName = (roomName || "room").replace(/[^a-z0-9_-]+/gi, "_").slice(0, 60)

  const handleDownloadFile = () => {
    download(`${safeName}.${extensionFor(language)}`, editorRef.current?.getValue() ?? "", "text/plain")
  }

  // Current code plus the 20 newest snapshots, as one Markdown document.
  const handleExportHistory = async () => {
    setBusy(true)
    try {
      const recent = snapshots.slice(0, 20)
      const full = await Promise.all(recent.map((s) => roomApi.getSnapshot(roomId, s._id).then((d) => d.snapshot)))
      const md = buildMarkdown({ roomName, language, current: editorRef.current?.getValue() ?? "", snapshots: full })
      download(`${safeName}-history.md`, md, "text/markdown")
    } catch (e) { toast.error(msg(e)) }
    finally { setBusy(false) }
  }

  const handleSave = async () => {
    setBusy(true)
    try { await save("manual"); toast.success("Snapshot saved"); load() }
    catch (e) { toast.error(msg(e)) }
    finally { setBusy(false) }
  }

  const handleRestore = async (id) => {
    setBusy(true)
    try {
      await save("before-restore")
      const data = await roomApi.getSnapshot(roomId, id)
      editorRef.current?.setValue(data.snapshot.text)
      toast.success("Snapshot restored")
      load()
    } catch (e) { toast.error(msg(e)) }
    finally { setBusy(false) }
  }

  return (
    <>
      <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-line flex items-center gap-2.5">
          <div className="w-8 h-8 shrink-0 rounded-lg border border-ember/30 bg-ember/10 flex items-center justify-center">
            <History size={16} className="text-ember" />
          </div>
          <h3 className="font-display text-sm font-semibold text-fg">History</h3>

          <button
            onClick={handleSave}
            disabled={busy || !canWrite}
            title={canWrite ? "" : "You cannot save snapshots while editing is locked"}
            className="ml-auto h-8 px-3 inline-flex items-center gap-1.5 rounded-lg bg-ember text-ink text-xs font-semibold hover:brightness-110 disabled:opacity-40 transition"
          >
            <Camera size={14} />
            Save snapshot
          </button>
        </div>

        <div className="px-4 py-3 border-b border-line flex flex-wrap gap-2">
          <button
            onClick={handleDownloadFile}
            className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg border border-line text-xs text-muted hover:text-fg hover:border-muted transition-colors"
          >
            <Download size={13} />
            Download file
          </button>
          <button
            onClick={handleExportHistory}
            disabled={busy}
            className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg border border-line text-xs text-muted hover:text-fg hover:border-muted disabled:opacity-40 transition-colors"
          >
            <FileText size={13} />
            Export history (.md)
          </button>
        </div>

        {picked.length > 0 ? (
          <div className="px-4 py-2.5 border-b border-line bg-ai/5 flex items-center gap-2">
            <span className="text-xs text-fg min-w-0">
              {picked.length === 1 ? "1 selected: compare with current editor" : "2 selected"}
            </span>
            <button
              onClick={startCompare}
              className="ml-auto shrink-0 h-8 px-3 inline-flex items-center gap-1.5 rounded-lg bg-ai text-ink text-xs font-semibold hover:brightness-110 transition"
            >
              <GitCompare size={13} />
              Compare
            </button>
            <button
              onClick={() => setPicked([])}
              aria-label="Clear selection"
              className="shrink-0 h-8 w-8 flex items-center justify-center rounded-lg border border-line text-muted hover:text-fg hover:border-muted transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          snapshots.length > 0 && (
            <p className="px-4 pt-3 text-[11px] text-muted">
              Tap the compare icon on a snapshot to see what changed.
            </p>
          )
        )}

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
          {snapshots.length === 0 && (
            <div className="flex flex-col items-center py-10 text-center text-muted">
              <History size={28} />
              <p className="mt-3 text-sm">No snapshots yet</p>
              <p className="mt-1 text-xs">Save one to create a restore point.</p>
            </div>
          )}

          {snapshots.map((s) => (
            <div
              key={s._id}
              className="rounded-xl border border-line bg-ink p-3 flex items-start gap-3"
            >
              <div className="min-w-0 flex-1">
                <span
                  className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border ${KIND_TONE[s.kind] || KIND_TONE.auto
                    }`}
                >
                  {KIND[s.kind] || s.kind}
                </span>
                <p className="mt-2 font-mono text-[11px] text-muted leading-relaxed break-words">
                  {s.createdByName} · {new Date(s.createdAt).toLocaleString()} · {s.size} chars
                </p>
              </div>

              <button
                onClick={() => togglePick(s._id)}
                aria-pressed={picked.includes(s._id)}
                aria-label="Select to compare"
                title="Select to compare"
                className={`shrink-0 h-8 w-8 flex items-center justify-center rounded-lg border transition-colors ${picked.includes(s._id)
                    ? "border-ai bg-ai/15 text-ai"
                    : "border-line text-muted hover:text-fg hover:border-muted"
                  }`}
              >
                <GitCompare size={13} />
              </button>

              <button
                onClick={() => setRestoreTarget(s)}
                disabled={busy || !canWrite}
                className="shrink-0 h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg border border-line text-xs text-fg hover:border-ember/50 hover:text-ember disabled:opacity-40 transition-colors"
              >
                <RotateCcw size={13} />
                Restore
              </button>
            </div>
          ))}
        </div>
      </div>

      <SnapshotCompare
        open={!!pair}
        pair={pair}
        roomId={roomId}
        language={language}
        getCurrentText={() => editorRef.current?.getValue() ?? ""}
        onClose={() => setPair(null)}
      />

      <ConfirmDialog
        open={!!restoreTarget}
        title="Restore this snapshot?"
        description="The editor content will be replaced. Your current text is saved first as a restore point."
        confirmLabel="Restore"
        onCancel={() => setRestoreTarget(null)}
        onConfirm={async () => {
          const id = restoreTarget?._id
          setRestoreTarget(null)
          if (id) await handleRestore(id)
        }}
      />
    </>
  )
}
