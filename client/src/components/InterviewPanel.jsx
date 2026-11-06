import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  Mic,
  Copy,
  Check,
  Lock,
  Unlock,
  Play,
  Square,
  X,
  Info,
  Eye,
  Link2,
} from "lucide-react"
import { roomApi } from "../services/api"
import { InterviewReport } from "./InterviewReport"
import { ConfirmDialog } from "./ConfirmDialog"

const RATINGS = [
  ["problemSolving", "Problem solving"],
  ["codeQuality", "Code quality"],
  ["communication", "Communication"],
  ["testing", "Testing"],
]
const RECS = [["strong_no", "Strong no"], ["no", "No"], ["yes", "Yes"], ["strong_yes", "Strong yes"]]
const msg = (e) => e?.response?.data?.message || e?.message || "Something went wrong"
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

const STATUS_TONE = {
  scheduled: "bg-gold/10 text-gold border-gold/30",
  live: "bg-sync/10 text-sync border-sync/30",
  ended: "bg-red-500/10 text-red-400 border-red-500/30",
}

const REC_TONE = {
  strong_no: "border-red-500 bg-red-500/15 text-red-300",
  no: "border-red-500/60 bg-red-500/10 text-red-300",
  yes: "border-sync/60 bg-sync/10 text-sync",
  strong_yes: "border-sync bg-sync/20 text-sync",
}

// Advisory countdown only: it never ends the interview by itself.
const useRemaining = (iv) => {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (iv?.status !== "live") return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [iv?.status])
  if (iv?.status !== "live" || !iv.startedAt) return null
  const end = new Date(iv.startedAt).getTime() + (iv.durationMin || 45) * 60000
  return Math.max(0, Math.floor((end - now) / 1000))
}

const Note = ({ icon: Icon = Info, tone = "muted", children }) => {
  const tones = {
    muted: "border-line text-muted",
    gold: "border-gold/30 bg-gold/10 text-gold",
  }
  return (
    <div className={`flex gap-2.5 rounded-xl border p-3 text-xs leading-relaxed ${tones[tone]}`}>
      <Icon size={14} className="shrink-0 mt-0.5" />
      <p>{children}</p>
    </div>
  )
}

const CodeRow = ({ label, value, hint, asLink = false }) => {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(value)
    toast.success(`${label} copied`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div>
      <p className="text-[11px] text-muted mb-1.5">{label}</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 h-9 flex items-center px-3 rounded-lg border border-line bg-ink font-mono text-xs tracking-[0.15em] text-fg truncate">
          {value || "—"}
        </div>
        <button
          disabled={!value}
          onClick={copy}
          aria-label={`Copy ${label}`}
          className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border border-line text-muted hover:text-fg hover:border-muted disabled:opacity-40 transition-colors"
        >
          {copied ? <Check size={14} className="text-sync" /> : <Copy size={14} />}
        </button>
        {asLink && value && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/join/${value}`)
              toast.success(`${label} link copied`)
            }}
            aria-label={`Copy ${label} link`}
            title="Copy invite link"
            className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border border-line text-muted hover:text-fg hover:border-muted transition-colors"
          >
            <Link2 size={14} />
          </button>
        )}
      </div>
      {hint && <p className="mt-1 text-[10px] text-muted">{hint}</p>}
    </div>
  )
}

const RatingPicker = ({ value, onChange }) => (
  <div className="flex gap-1" role="radiogroup">
    {[1, 2, 3, 4].map((n) => (
      <button
        key={n}
        type="button"
        role="radio"
        aria-checked={value === n}
        onClick={() => onChange(value === n ? null : n)}
        className={`w-9 h-8 rounded-md border font-mono text-xs transition-colors ${value === n
            ? "bg-ai/15 border-ai text-ai"
            : "border-line text-muted hover:border-muted"
          }`}
      >
        {n}
      </button>
    ))}
  </div>
)

export const InterviewPanel = ({ room, roomId, role, currentUserId, currentUsername, users = [], editorRef, onChanged }) => {
  const iv = room.interview || {}
  const isOwner = role === "owner"
  const isCandidate = !!iv.candidateId && String(iv.candidateId) === String(currentUserId)
  const isInterviewer = (role === "owner" || role === "editor") && !isCandidate
  const remaining = useRemaining(iv)
  const candidate = room.members?.find((m) => String(m.userId) === String(iv.candidateId))
  const candidateAvatar = users.find((u) => String(u.userId) === String(iv.candidateId))?.avatarUrl

  const [busy, setBusy] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [card, setCard] = useState({ ratings: {}, notes: "", recommendation: null })
  const [others, setOthers] = useState([])

  const control = async (patch, okMessage) => {
    setBusy(true)
    try {
      await roomApi.updateInterview(roomId, patch)
      if (okMessage) toast.success(okMessage)
      await onChanged?.()
    } catch (e) { toast.error(msg(e)) }
    finally { setBusy(false) }
  }

  const handleEnd = () => {
    // The live document lives in the collaboration service, so the owner's editor supplies the final text.
    control({ status: "ended", finalText: editorRef.current?.getValue() ?? "" }, "Interview ended")
  }

  useEffect(() => {
    if (!isInterviewer) return
    let cancelled = false
    roomApi.getScorecards(roomId)
      .then((data) => {
        if (cancelled) return
        const mine = data.scorecards.find((s) => String(s.interviewerId) === String(currentUserId))
        if (mine) setCard({ ratings: mine.ratings || {}, notes: mine.notes || "", recommendation: mine.recommendation ?? null })
        setOthers(data.scorecards.filter((s) => String(s.interviewerId) !== String(currentUserId)))
      })
      .catch((e) => toast.error(msg(e)))
    return () => { cancelled = true }
  }, [roomId, currentUserId, isInterviewer])

  const saveCard = async () => {
    setBusy(true)
    try {
      await roomApi.saveScorecard(roomId, card)
      toast.success("Scorecard saved")
    } catch (e) { toast.error(msg(e)) }
    finally { setBusy(false) }
  }

  const timerColor =
    remaining === 0 ? "text-red-400" : remaining !== null && remaining <= 300 ? "text-gold" : "text-fg"

  return (
    <div className="h-full min-w-0 overflow-y-auto p-4 space-y-4">
      {/* HEADER */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 shrink-0 rounded-lg border border-ai/30 bg-ai/10 flex items-center justify-center">
          <Mic size={16} className="text-ai" />
        </div>
        <h3 className="font-display text-sm font-semibold text-fg">Interview</h3>

        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize ${STATUS_TONE[iv.status] || STATUS_TONE.scheduled
            }`}
        >
          {iv.status === "live" && (
            <span className="w-1.5 h-1.5 rounded-full bg-sync animate-pulse" />
          )}
          {iv.status}
        </span>

        {remaining !== null && (
          <span className={`ml-auto font-mono text-lg font-semibold tabular-nums ${timerColor}`}>
            {remaining === 0 ? "Time's up" : fmt(remaining)}
          </span>
        )}
      </div>

      {iv.locked && iv.status === "live" && (
        <Note icon={Lock} tone="gold">The candidate's editor is locked.</Note>
      )}

      {/* OWNER CONTROLS */}
      {isOwner && (
        <section className="space-y-4 rounded-xl border border-line p-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 shrink-0 rounded-lg border overflow-hidden flex items-center justify-center text-sm font-bold ${candidate
                  ? "border-sync/30 bg-sync/10 text-sync"
                  : "border-dashed border-line text-muted"
                }`}
            >
              {candidateAvatar ? (
                <img src={candidateAvatar} alt="" className="w-full h-full object-cover" />
              ) : candidate ? (
                candidate.username?.charAt(0)?.toUpperCase()
              ) : (
                "?"
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted">Candidate</p>
              <p className="text-sm text-fg truncate">
                {candidate ? candidate.username : "Waiting for them to join"}
              </p>
            </div>
          </div>

          <CodeRow asLink label="Candidate link code" value={iv.candidateCode} hint="Single use: the first person to enter it becomes the candidate." />
          <CodeRow asLink label="Observer code" value={iv.observerCode} hint="Read-only." />
          <CodeRow label="Interviewer code" value={room.code} hint="Full editing access. Share only with co-interviewers." />

          {iv.status !== "ended" && (
            <div className="flex items-start justify-between gap-4 pt-1">
              <div className="min-w-0">
                <p className="text-sm text-fg">Allow AI suggestions</p>
                <p className="text-[11px] text-muted">
                  Off by default. Applies to everyone who can edit.
                </p>
              </div>
              <button
                role="switch"
                aria-checked={!!iv.aiAssist}
                aria-label="Allow AI suggestions"
                disabled={busy}
                onClick={() =>
                  control(
                    { aiAssist: !iv.aiAssist },
                    iv.aiAssist ? "AI suggestions turned off" : "AI suggestions turned on",
                  )
                }
                className={`relative shrink-0 w-11 h-6 rounded-full border transition-colors disabled:opacity-50 ${iv.aiAssist ? "bg-ai border-ai" : "bg-ink border-line"
                  }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-fg transition-transform ${iv.aiAssist ? "translate-x-5" : ""
                    }`}
                />
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {iv.status === "scheduled" && (
              <button
                disabled={busy || !iv.candidateId}
                onClick={() => control({ status: "live" }, "Interview started")}
                title={iv.candidateId ? "" : "Wait for the candidate to join"}
                className="h-9 px-4 inline-flex items-center gap-2 rounded-lg bg-sync text-ink text-xs font-semibold hover:brightness-110 disabled:opacity-40 transition"
              >
                <Play size={14} fill="currentColor" />
                Start interview
              </button>
            )}

            {iv.status === "live" && (
              <>
                <button
                  disabled={busy}
                  onClick={() =>
                    control({ locked: !iv.locked }, iv.locked ? "Candidate unlocked" : "Candidate locked")
                  }
                  className="h-9 px-4 inline-flex items-center gap-2 rounded-lg border border-gold/40 text-gold text-xs font-semibold hover:bg-gold/10 disabled:opacity-40 transition-colors"
                >
                  {iv.locked ? <Unlock size={14} /> : <Lock size={14} />}
                  {iv.locked ? "Unlock candidate" : "Lock candidate"}
                </button>
                <button
                  disabled={busy}
                  onClick={() => setConfirmEnd(true)}
                  className="h-9 px-4 inline-flex items-center gap-2 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-400 disabled:opacity-40 transition"
                >
                  <Square size={13} fill="currentColor" />
                  End interview
                </button>
              </>
            )}

            {iv.status === "scheduled" && (
              <button
                disabled={busy}
                onClick={() => setConfirmEnd(true)}
                className="h-9 px-4 inline-flex items-center gap-2 rounded-lg border border-line text-muted text-xs font-medium hover:text-fg hover:border-muted disabled:opacity-40 transition-colors"
              >
                <X size={14} />
                Cancel interview
              </button>
            )}
          </div>

          <p className="text-[11px] text-muted">Code execution is disabled in interview rooms.</p>
        </section>
      )}

      {/* CANDIDATE VIEW */}
      {isCandidate && (
        <>
          <Note>
            {iv.status === "scheduled" && "Waiting for the interviewer to start. You can edit once the interview is live."}
            {iv.status === "live" && (iv.locked ? "The interviewer has paused your editing." : "The interview is live. You can edit the code.")}
            {iv.status === "ended" && "The interview has ended. Thank you."}
          </Note>
          <Note icon={Eye}>
            For transparency: this session keeps a timeline of events (including when people join or leave the video call) and a history of your code, which the interviewers can see. Video and audio are not recorded.
          </Note>
        </>
      )}

      {/* OBSERVER VIEW */}
      {!isOwner && !isCandidate && !isInterviewer && (
        <Note icon={Eye}>You are observing. The editor is read-only.</Note>
      )}

      {/* SCORECARD */}
      {isInterviewer && (
        <section className="space-y-4 rounded-xl border border-line p-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-display text-sm font-semibold text-fg">Your scorecard</h4>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted border border-line rounded-full px-2 py-0.5">
              <Lock size={10} />
              Private to interviewers
            </span>
          </div>

          <div className="space-y-3">
            {RATINGS.map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted">{label}</span>
                <RatingPicker
                  value={card.ratings[key] ?? null}
                  onChange={(n) =>
                    setCard((c) => ({ ...c, ratings: { ...c.ratings, [key]: n } }))
                  }
                />
              </div>
            ))}
          </div>

          <textarea
            value={card.notes}
            maxLength={5000}
            rows={5}
            placeholder="Notes: what you observed, and the evidence for your ratings"
            onChange={(e) => setCard((c) => ({ ...c, notes: e.target.value }))}
            className="w-full min-w-0 max-w-full bg-ink border border-line rounded-lg p-3 text-xs text-fg placeholder:text-muted focus:outline-none focus:border-ai transition-colors"
          />

          <div>
            <p className="text-xs text-muted mb-2">Recommendation</p>
            <div className="grid grid-cols-2 gap-2" role="radiogroup">
              {RECS.map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={card.recommendation === v}
                  onClick={() =>
                    setCard((c) => ({ ...c, recommendation: c.recommendation === v ? null : v }))
                  }
                  className={`h-9 rounded-lg border text-xs font-medium transition-colors ${card.recommendation === v
                      ? REC_TONE[v]
                      : "border-line text-muted hover:border-muted"
                    }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-muted">
            You decide. Nothing here is scored or recommended by AI.
          </p>

          <button
            disabled={busy}
            onClick={saveCard}
            className="h-9 px-4 rounded-lg bg-ember text-ink text-xs font-semibold hover:brightness-110 disabled:opacity-40 transition"
          >
            Save scorecard
          </button>
        </section>
      )}

      {isInterviewer && (
        <InterviewReport
          room={room}
          roomId={roomId}
          role={role}
          currentUsername={currentUsername}
          editorRef={editorRef}
        />
      )}

      {/* OTHER INTERVIEWERS */}
      {isOwner && others.length > 0 && (
        <section className="space-y-2 rounded-xl border border-line p-4">
          <h4 className="font-display text-sm font-semibold text-fg">Other interviewers</h4>
          {others.map((s) => (
            <div key={s._id} className="rounded-lg border border-line bg-ink p-3 text-xs">
              <p className="font-medium text-fg">
                {s.interviewerName}
                {s.recommendation && (
                  <span className="ml-2 text-muted font-normal">
                    {s.recommendation.replace("_", " ")}
                  </span>
                )}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted leading-relaxed">
                {RATINGS.map(([k, l]) => `${l}: ${s.ratings?.[k] ?? "—"}`).join(" · ")}
              </p>
              {s.notes && <p className="mt-2 text-fg whitespace-pre-wrap">{s.notes}</p>}
            </div>
          ))}
        </section>
      )}

      <ConfirmDialog
        open={confirmEnd}
        danger
        title={iv.status === "scheduled" ? "Cancel this interview?" : "End the interview?"}
        description="Nobody will be able to edit afterwards."
        confirmLabel={iv.status === "scheduled" ? "Cancel interview" : "End interview"}
        onCancel={() => setConfirmEnd(false)}
        onConfirm={() => {
          setConfirmEnd(false)
          handleEnd()
        }}
      />
    </div>
  )
}