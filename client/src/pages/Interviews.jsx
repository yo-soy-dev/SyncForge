import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Search, Mic, ArrowRight, FileText, Film } from "lucide-react"
import { toast } from "sonner"

import { roomApi } from "../services/api"
import { useAuth } from "../context/AuthContext"
import { Navbar } from "../components/Navbar"
import { Loader } from "../components/Loader"
import { isRoomOwner } from "../components/RoomCard"
import { LANGUAGE_COLORS } from "../utils/constants"

const STATUS_TONE = {
  scheduled: "bg-gold/10 text-gold border-gold/30",
  live: "bg-sync/10 text-sync border-sync/30",
  ended: "bg-red-500/10 text-red-400 border-red-500/30",
}

const FILTERS = [
  ["all", "All"],
  ["live", "Live"],
  ["scheduled", "Scheduled"],
  ["ended", "Ended"],
]

const ORDER = { live: 0, scheduled: 1, ended: 2 }

const inputCls =
  "w-full min-w-0 h-11 bg-ink border border-line rounded-lg pl-9 pr-3 text-sm text-fg placeholder:text-muted focus:border-ember focus:outline-none transition-colors"

const fmtDate = (value) =>
  value
    ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
    : null

const minutesBetween = (a, b) =>
  Math.max(1, Math.round((new Date(b) - new Date(a)) / 60000))

export const Interviews = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [rooms, setRooms] = useState([])
  const [details, setDetails] = useState({}) // { [roomId]: { interview, members } }
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [query, setQuery] = useState("")

  useEffect(() => {
    roomApi
      .getMyRooms()
      .then((data) => setRooms(data.rooms || []))
      .catch(() => toast.error("Failed to load interviews"))
      .finally(() => setLoading(false))
  }, [])

  /* If the list doesn't carry interview details, fetch them (max 20 rooms) */
  useEffect(() => {
    const missing = rooms
      .filter((r) => r.type === "interview" && !r.interview)
      .slice(0, 20)
    if (missing.length === 0) return

    let cancelled = false

    Promise.allSettled(missing.map((r) => roomApi.getById(r._id))).then((results) => {
      if (cancelled) return
      setDetails((prev) => {
        const next = { ...prev }
        results.forEach((res, i) => {
          const room = res.status === "fulfilled" ? res.value.room : null
          next[missing[i]._id] = {
            interview: room?.interview || {},
            members: room?.members || [],
          }
        })
        return next
      })
    })

    return () => {
      cancelled = true
    }
  }, [rooms])

  const items = useMemo(() => {
    return rooms
      .filter((r) => r.type === "interview")
      .map((room) => {
        const d = details[room._id]
        const iv = room.interview || d?.interview || null
        const members = room.members || d?.members || []
        const candidate = iv?.candidateId
          ? members.find((m) => String(m.userId) === String(iv.candidateId))
          : null

        return {
          room,
          iv,
          loaded: !!iv,
          status: iv ? iv.status || "scheduled" : null,
          candidateName: candidate?.username || null,
          owner: isRoomOwner(room, user?.id),
          isCandidate:
            !!iv?.candidateId && String(iv.candidateId) === String(user?.id),
          when: iv?.endedAt || iv?.startedAt || room.updatedAt || room.createdAt,
        }
      })
      .sort((a, b) => {
        const byStatus = (ORDER[a.status] ?? 1) - (ORDER[b.status] ?? 1)
        return byStatus || new Date(b.when || 0) - new Date(a.when || 0)
      })
  }, [rooms, details, user?.id])

  const counts = useMemo(
    () => ({
      total: items.length,
      live: items.filter((i) => i.status === "live").length,
      scheduled: items.filter((i) => i.status === "scheduled").length,
      ended: items.filter((i) => i.status === "ended").length,
    }),
    [items],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((i) => {
      const okFilter = filter === "all" || i.status === filter
      const okQuery =
        !q ||
        (i.room.name || "").toLowerCase().includes(q) ||
        (i.candidateName || "").toLowerCase().includes(q)
      return okFilter && okQuery
    })
  }, [items, filter, query])

  if (loading) return <Loader message="Loading interviews..." />

  const newInterview = () =>
    navigate("/dashboard", { state: { create: true, type: "interview" } })

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      <Navbar />

      <main className="flex-1 w-full min-w-0 max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <div>
            <p className="font-mono text-xs text-ai tracking-wide mb-2">● INTERVIEWS</p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-fg">
              Every interview, in one place
            </h1>
            <p className="mt-2 text-sm text-muted max-w-xl">
              Track live and past sessions, then open the scorecards, timeline,
              and replay.
            </p>
          </div>

          <button
            onClick={newInterview}
            className="shrink-0 h-11 px-5 inline-flex items-center justify-center gap-2 rounded-lg bg-ember text-ink text-sm font-semibold hover:brightness-110 transition"
          >
            <Plus size={17} />
            New interview
          </button>
        </header>

        {/* STATS */}
        <section
          aria-label="Overview"
          className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line rounded-2xl overflow-hidden"
        >
          {[
            ["Total", counts.total, "text-fg"],
            ["Live now", counts.live, "text-sync"],
            ["Scheduled", counts.scheduled, "text-gold"],
            ["Ended", counts.ended, "text-muted"],
          ].map(([label, value, color]) => (
            <div key={label} className="bg-surface px-4 py-4 sm:px-5">
              <p className={`font-display text-3xl font-bold ${color}`}>{value}</p>
              <p className="mt-1 text-xs text-muted">{label}</p>
            </div>
          ))}
        </section>

        {/* TOOLBAR */}
        <div className="mt-8 mb-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative md:w-72">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search room or candidate"
              aria-label="Search interviews"
              className={inputCls}
            />
          </div>

          <div role="tablist" className="flex p-1 bg-surface border border-line rounded-lg">
            {FILTERS.map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={filter === id}
                onClick={() => setFilter(id)}
                className={`flex-1 md:flex-none px-3 h-9 rounded-md text-xs font-medium transition-colors ${
                  filter === id ? "bg-ink text-fg" : "text-muted hover:text-fg"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* LIST */}
        {items.length === 0 ? (
          <div className="border border-dashed border-line rounded-2xl py-16 px-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl border border-line bg-surface flex items-center justify-center">
              <Mic size={22} className="text-muted" />
            </div>
            <h2 className="font-display text-lg font-semibold text-fg">
              No interviews yet
            </h2>
            <p className="mt-1 mb-6 text-sm text-muted">
              Create an interview room to invite a candidate.
            </p>
            <button
              onClick={newInterview}
              className="h-11 px-5 inline-flex items-center gap-2 rounded-lg bg-ember text-ink text-sm font-semibold hover:brightness-110 transition"
            >
              <Plus size={17} />
              Create an interview
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="border border-dashed border-line rounded-2xl py-12 text-center text-sm text-muted">
            No interviews match your filters.
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map(({ room, iv, loaded, status, candidateName, owner, isCandidate, when }) => {
              const duration =
                iv?.startedAt && iv?.endedAt
                  ? `${minutesBetween(iv.startedAt, iv.endedAt)} min`
                  : iv?.durationMin
                    ? `${iv.durationMin} min planned`
                    : null

              return (
                <li
                  key={room._id}
                  className="rounded-2xl border border-line bg-surface p-4 sm:p-5 hover:border-ai/40 transition-colors flex flex-col md:flex-row md:items-center gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <h2 className="font-display text-lg font-semibold text-fg truncate">
                        {room.name}
                      </h2>

                      {status ? (
                        <span
                          className={`shrink-0 inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize ${STATUS_TONE[status]}`}
                        >
                          {status === "live" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-sync animate-pulse" />
                          )}
                          {status}
                        </span>
                      ) : (
                        <span className="shrink-0 h-5 w-16 rounded-full bg-line animate-pulse" />
                      )}
                    </div>

                    <p className="mt-1.5 text-sm text-muted truncate">
                      {isCandidate
                        ? "You are the candidate"
                        : candidateName
                          ? `Candidate: ${candidateName}`
                          : loaded
                            ? "No candidate has joined yet"
                            : "Loading details..."}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted">
                      <span className="inline-flex items-center gap-1.5 capitalize">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: LANGUAGE_COLORS[room.language] || "#8b8f9a" }}
                        />
                        {room.language}
                      </span>
                      {fmtDate(when) && <span>{fmtDate(when)}</span>}
                      {duration && <span>{duration}</span>}
                      {owner && (
                        <span className="text-gold border border-gold/30 bg-gold/10 rounded-full px-2 py-0.5 text-[10px]">
                          Owner
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {status === "ended" && !isCandidate && (
                      <button
                        onClick={() => navigate(`/room/${room._id}`, { state: { panel: "interview" } })}
                        className="h-10 px-3 inline-flex items-center gap-1.5 rounded-lg border border-line text-xs font-medium text-fg hover:border-ai/50 hover:text-ai transition-colors"
                      >
                        <FileText size={14} />
                        Report
                      </button>
                    )}

                    {status === "ended" && owner && (
                      <button
                        onClick={() => navigate(`/room/${room._id}/replay`)}
                        aria-label="Replay interview"
                        title="Replay"
                        className="h-10 w-10 flex items-center justify-center rounded-lg border border-line text-muted hover:text-fg hover:border-muted transition-colors"
                      >
                        <Film size={15} />
                      </button>
                    )}

                    <button
                      onClick={() => navigate(`/room/${room._id}`)}
                      className="h-10 px-4 inline-flex items-center gap-2 rounded-lg bg-ember text-ink text-sm font-semibold hover:brightness-110 transition"
                    >
                      {status === "live" ? "Join" : "Open"}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}