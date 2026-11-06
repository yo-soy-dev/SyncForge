import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import MonacoEditor, { DiffEditor } from "@monaco-editor/react"
import { toast } from "sonner"
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Film,
  GitCompare,
  Loader2,
} from "lucide-react"
import { roomApi } from "../services/api"
import { Navbar } from "../components/Navbar"
import { Loader } from "../components/Loader"
import { describeEvent } from "../utils/reportMarkdown"
import { defineCoduetTheme } from "../utils/monacoTheme"
import { getPreferences } from "../utils/preferences"

const msg = (e) => e?.response?.data?.message || e?.message || "Something went wrong"

const KIND = {
  manual: "Saved",
  auto: "Auto",
  "before-ai": "Before AI change",
  "before-restore": "Before restore",
  "interview-end": "Interview end",
}

const KIND_DOT = {
  manual: "bg-ember",
  auto: "bg-muted",
  "before-ai": "bg-ai",
  "before-restore": "bg-gold",
  "interview-end": "bg-sync",
}

const SPEEDS = [1, 2, 4]

const clock = (totalSeconds) => {
  const s = Math.max(0, Math.round(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

export const Replay = () => {
  const { roomId } = useParams()
  const prefs = useMemo(getPreferences, [])

  const [room, setRoom] = useState(null)
  const [snaps, setSnaps] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [showDiff, setShowDiff] = useState(false)

  const [texts, setTexts] = useState({})
  const requested = useRef(new Set())

  /* ---------- load room, snapshot list, timeline ---------- */
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const [roomData, snapData] = await Promise.all([
          roomApi.getById(roomId),
          roomApi.listSnapshots(roomId),
        ])

        const list = [...(snapData.snapshots || [])].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
        )

        let timeline = []
        try {
          timeline = (await roomApi.getTimeline(roomId)).events || []
        } catch {
          /* the timeline is optional: collab rooms may not have one */
        }

        if (cancelled) return
        setRoom(roomData.room || roomData)
        setSnaps(list)
        setEvents([...timeline].sort((a, b) => new Date(a.at) - new Date(b.at)))
      } catch (e) {
        if (!cancelled) setError(msg(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [roomId])

  /* ---------- fetch snapshot text lazily, with a little prefetch ---------- */
  const ensure = useCallback(
    (snap) => {
      if (!snap || requested.current.has(snap._id)) return
      requested.current.add(snap._id)
      roomApi
        .getSnapshot(roomId, snap._id)
        .then((d) =>
          setTexts((t) => ({ ...t, [snap._id]: d.snapshot?.text ?? "" })),
        )
        .catch((e) => {
          requested.current.delete(snap._id)
          toast.error(msg(e))
        })
    },
    [roomId],
  )

  useEffect(() => {
    ;[index - 1, index, index + 1, index + 2].forEach((i) => ensure(snaps[i]))
  }, [index, snaps, ensure])

  /* ---------- playback ---------- */
  useEffect(() => {
    if (!playing) return
    if (index >= snaps.length - 1) {
      setPlaying(false)
      return
    }
    const t = setTimeout(
      () => setIndex((i) => Math.min(i + 1, snaps.length - 1)),
      1600 / speed,
    )
    return () => clearTimeout(t)
  }, [playing, index, speed, snaps.length])

  const step = useCallback(
    (delta) => {
      setPlaying(false)
      setIndex((i) => Math.min(Math.max(i + delta, 0), snaps.length - 1))
    },
    [snaps.length],
  )

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      if (!p && index >= snaps.length - 1) setIndex(0) // replay from the start
      return !p
    })
  }, [index, snaps.length])

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON") return
      if (e.code === "Space") {
        e.preventDefault()
        togglePlay()
      }
      if (e.key === "ArrowLeft") step(-1)
      if (e.key === "ArrowRight") step(1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [togglePlay, step])

  /* ---------- derived values ---------- */
  const cur = snaps[index]
  const prev = snaps[index - 1]
  const curText = cur ? texts[cur._id] : undefined
  const prevText = prev ? texts[prev._id] : ""
  const startMs = new Date(
    room?.interview?.startedAt || snaps[0]?.createdAt || 0,
  ).getTime()
  const nowMs = cur ? new Date(cur.createdAt).getTime() : 0
  const delta = cur ? cur.size - (prev?.size ?? 0) : 0

  /* ---------- states ---------- */
  if (loading) return <Loader message="Loading replay..." />

  const Shell = ({ children }) => (
    <div className="min-h-screen bg-ink flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-sm text-center">{children}</div>
      </main>
    </div>
  )

  if (error)
    return (
      <Shell>
        <h1 className="font-display text-2xl font-bold text-fg">
          Couldn't load the replay
        </h1>
        <p className="mt-2 text-sm text-muted">{error}</p>
        <Link
          to={`/room/${roomId}`}
          className="mt-6 h-11 px-5 inline-flex items-center rounded-lg bg-ember text-ink text-sm font-semibold hover:brightness-110 transition"
        >
          Back to room
        </Link>
      </Shell>
    )

  if (snaps.length < 2)
    return (
      <Shell>
        <div className="w-12 h-12 mx-auto mb-5 rounded-xl border border-line bg-surface flex items-center justify-center">
          <Film size={22} className="text-muted" />
        </div>
        <h1 className="font-display text-2xl font-bold text-fg">
          Not enough history yet
        </h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          A replay needs at least two snapshots. Save snapshots from the History
          panel while you work, or finish an interview to capture the final code.
        </p>
        <Link
          to={`/room/${roomId}`}
          className="mt-6 h-11 px-5 inline-flex items-center rounded-lg bg-ember text-ink text-sm font-semibold hover:brightness-110 transition"
        >
          Back to room
        </Link>
      </Shell>
    )

  const editorOptions = {
    readOnly: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    fontSize: prefs.fontSize,
    wordWrap: prefs.wordWrap ? "on" : "off",
    padding: { top: 12 },
  }

  return (
    <div className="h-dvh min-h-0 flex flex-col bg-ink overflow-hidden">
      <Navbar />

      {/* SUB-HEADER */}
      <div className="h-11 shrink-0 border-b border-line px-2 sm:px-4 flex items-center gap-3 min-w-0">
        <Link
          to={`/room/${roomId}`}
          className="shrink-0 inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg transition-colors"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Back to room</span>
        </Link>

        <span className="w-px h-5 bg-line shrink-0" />

        <Film size={14} className="text-ember shrink-0" />
        <h1 className="font-display text-sm font-semibold text-fg truncate min-w-0">
          Replay <span className="text-muted font-normal">· {room?.name}</span>
        </h1>

        <button
          onClick={() => setShowDiff((d) => !d)}
          aria-pressed={showDiff}
          className={`ml-auto shrink-0 h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg border text-xs font-medium transition-colors ${
            showDiff
              ? "bg-ai/15 text-ai border-ai/40"
              : "border-transparent text-muted hover:text-fg hover:bg-surface"
          }`}
        >
          <GitCompare size={14} />
          <span className="hidden sm:inline">Show changes</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* LEFT: editor + controls */}
        <section className="flex-1 min-h-0 min-w-0 flex flex-col">
          <div className="relative flex-1 min-h-[220px]">
            {curText === undefined ? (
              <div className="absolute inset-0 flex items-center justify-center text-muted">
                <Loader2 size={22} className="animate-spin" />
              </div>
            ) : showDiff ? (
              <DiffEditor
                original={prevText ?? ""}
                modified={curText}
                language={room?.language}
                theme="coduet"
                beforeMount={defineCoduetTheme}
                options={{ ...editorOptions, renderSideBySide: false }}
              />
            ) : (
              <MonacoEditor
                value={curText}
                language={room?.language}
                theme="coduet"
                beforeMount={defineCoduetTheme}
                options={editorOptions}
              />
            )}
          </div>

          {/* CONTROLS */}
          <div className="shrink-0 border-t border-line bg-surface p-3 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-medium text-fg`}
              >
                <span className={`w-2 h-2 rounded-full ${KIND_DOT[cur.kind] || "bg-muted"}`} />
                {KIND[cur.kind] || cur.kind}
              </span>
              <span className="font-mono text-[11px] text-muted">
                {cur.createdByName} · +{clock((nowMs - startMs) / 1000)} ·{" "}
                {delta >= 0 ? "+" : ""}
                {delta} chars
              </span>
              <span className="ml-auto font-mono text-[11px] text-muted">
                {index + 1} / {snaps.length}
              </span>
            </div>

            <div>
              <input
                type="range"
                min={0}
                max={snaps.length - 1}
                value={index}
                onChange={(e) => {
                  setPlaying(false)
                  setIndex(Number(e.target.value))
                }}
                aria-label="Replay position"
                className="w-full accent-ember"
              />
              {snaps.length <= 40 && (
                <div className="flex justify-between px-[7px] mt-1">
                  {snaps.map((s, i) => (
                    <button
                      key={s._id}
                      onClick={() => {
                        setPlaying(false)
                        setIndex(i)
                      }}
                      aria-label={`Go to snapshot ${i + 1}`}
                      className={`w-2 h-2 rounded-full transition ${
                        KIND_DOT[s.kind] || "bg-muted"
                      } ${i === index ? "ring-2 ring-fg" : "opacity-60 hover:opacity-100"}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => step(-1)}
                disabled={index === 0}
                aria-label="Previous snapshot"
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-line text-fg hover:border-muted disabled:opacity-40 transition-colors"
              >
                <SkipBack size={15} />
              </button>

              <button
                onClick={togglePlay}
                aria-label={playing ? "Pause" : "Play"}
                className="h-9 px-5 inline-flex items-center gap-2 rounded-lg bg-ember text-ink text-sm font-semibold hover:brightness-110 transition"
              >
                {playing ? (
                  <Pause size={15} fill="currentColor" />
                ) : (
                  <Play size={15} fill="currentColor" />
                )}
                {playing ? "Pause" : "Play"}
              </button>

              <button
                onClick={() => step(1)}
                disabled={index === snaps.length - 1}
                aria-label="Next snapshot"
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-line text-fg hover:border-muted disabled:opacity-40 transition-colors"
              >
                <SkipForward size={15} />
              </button>

              <div
                role="radiogroup"
                aria-label="Playback speed"
                className="ml-auto flex p-0.5 bg-ink border border-line rounded-lg"
              >
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    role="radio"
                    aria-checked={speed === s}
                    onClick={() => setSpeed(s)}
                    className={`w-9 h-8 rounded-md font-mono text-xs transition-colors ${
                      speed === s ? "bg-surface text-ember" : "text-muted hover:text-fg"
                    }`}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT: timeline */}
        <aside className="shrink-0 max-h-[34dvh] lg:max-h-none lg:w-[320px] overflow-y-auto border-t lg:border-t-0 lg:border-l border-line bg-surface">
          <div className="p-4">
            <p className="font-mono text-[11px] uppercase tracking-wide text-muted mb-3">
              Timeline
            </p>

            {events.length === 0 ? (
              <p className="text-xs text-muted">No events recorded for this room.</p>
            ) : (
              <ol className="relative border-l border-line ml-1.5 space-y-3">
                {events.map((e) => {
                  const t = new Date(e.at).getTime()
                  const passed = t <= nowMs
                  return (
                    <li
                      key={e._id}
                      className={`pl-4 relative transition-opacity ${passed ? "" : "opacity-35"}`}
                    >
                      <span
                        className={`absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full ${
                          passed ? "bg-sync" : "bg-line"
                        }`}
                      />
                      <p className="font-mono text-[11px] text-muted">
                        +{clock((t - startMs) / 1000)}
                      </p>
                      <p className="text-xs text-fg leading-relaxed">
                        {describeEvent(e)}
                      </p>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}