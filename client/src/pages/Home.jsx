import { useState, useEffect, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
// import coduetPoster from "../assets/coduet.webp"
import { Plus, Search, ArrowRight, Hash, Code2, Users, Mic } from "lucide-react"
import { toast } from "sonner"

import { roomApi } from "../services/api"
import { useAuth } from "../context/AuthContext"
import { Navbar } from "../components/Navbar"
import { RoomCard, isRoomOwner } from "../components/RoomCard"
import { Loader } from "../components/Loader"
import { Modal } from "../components/Modal"
import { ConfirmDialog } from "../components/ConfirmDialog"
import { LANGUAGES, LANGUAGE_COLORS } from "../utils/constants"
import { getPreferences } from "../utils/preferences"

const inputCls =
  "w-full min-w-0 h-11 bg-ink border border-line rounded-lg px-3 text-sm text-fg placeholder:text-muted focus:border-ember focus:outline-none transition-colors"

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "collab", label: "Collab" },
  { id: "interview", label: "Interview" },
]

export const Home = () => {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [joinCode, setJoinCode] = useState("")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")

  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newRoom, setNewRoom] = useState(() => ({
    name: "",
    language: getPreferences().defaultLanguage,
    type: "collab",
  }))

  const [confirm, setConfirm] = useState({ open: false, action: null, room: null })
  const [busy, setBusy] = useState(false)

  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // The command palette sends us here with { create: true } to open the New room dialog
  useEffect(() => {
    if (location.state?.create) {
      if (location.state.type) {
        setNewRoom((p) => ({ ...p, type: location.state.type }))
      }
      setShowCreate(true)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.state, location.pathname, navigate])

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const data = await roomApi.getMyRooms()
        setRooms(data.rooms)
      } catch (err) {
        setError(err.response?.data?.message || err.message)
        toast.error("Failed to load rooms")
      } finally {
        setLoading(false)
      }
    }
    fetchRooms()
  }, [])

  const stats = useMemo(
    () => ({
      total: rooms.length,
      collab: rooms.filter((r) => r.type !== "interview").length,
      interview: rooms.filter((r) => r.type === "interview").length,
      owned: rooms.filter((r) => isRoomOwner(r, user?.id)).length,
    }),
    [rooms, user?.id],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rooms.filter((r) => {
      const isInterview = r.type === "interview"
      const matchesFilter =
        filter === "all" || (filter === "interview" ? isInterview : !isInterview)
      return matchesFilter && (r.name || "").toLowerCase().includes(q)
    })
  }, [rooms, query, filter])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError("")
    setCreating(true)
    try {
      const data = await roomApi.create(newRoom)
      setRooms((prev) => [data.room, ...prev])
      setShowCreate(false)
      setNewRoom({ name: "", language: getPreferences().defaultLanguage, type: "collab" })
      toast.success("Room created")
      navigate(`/room/${data.room._id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    setError("")
    try {
      const data = await roomApi.join(joinCode.toUpperCase())
      toast.success("Joined room")
      navigate(`/room/${data.room._id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    }
  }

  const runConfirm = async () => {
    const { action, room } = confirm
    if (!room) return
    setBusy(true)
    try {
      if (action === "delete") {
        await roomApi.delete(room._id)
        toast.success("Room deleted")
      } else {
        await roomApi.leave(room._id)
        toast.success("You left the room")
      }
      setRooms((prev) => prev.filter((r) => r._id !== room._id))
      setConfirm((c) => ({ ...c, open: false }))
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loader message="Loading your rooms..." />

  const isDelete = confirm.action === "delete"

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      <Navbar />

      <main className="flex-1 w-full min-w-0 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <div className="min-w-0">
            <p className="font-mono text-xs text-sync tracking-wide mb-2">
              ● WORKSPACE
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-fg leading-tight">
              {greeting()},{" "}
              <span className="text-ember break-words">{user?.username}</span>
            </h1>
            <p className="mt-2 text-sm text-muted max-w-xl">
              Code together in real time, review with AI, and run technical
              interviews from one place.
            </p>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="shrink-0 h-11 px-5 inline-flex items-center justify-center gap-2 rounded-lg bg-ember text-ink text-sm font-semibold hover:brightness-110 transition"
          >
            <Plus size={17} />
            New room
          </button>
        </header>

        {/* <section className="mt-7 overflow-hidden rounded-2xl border border-line bg-surface">
          <img
            src={coduetPoster}
            alt="Coduet — Two Minds. One Codebase."
            className="block w-full h-auto"
            loading="eager"
          />
        </section> */}

        {error && (
          <div className="mt-6 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* STAT STRIP: one connected block instead of 4 separate cards */}
        <section
          aria-label="Overview"
          className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line rounded-2xl overflow-hidden"
        >
          {[
            { label: "Total rooms", value: stats.total, color: "text-fg" },
            { label: "Collab", value: stats.collab, color: "text-sync" },
            { label: "Interviews", value: stats.interview, color: "text-ai" },
            { label: "Owned by you", value: stats.owned, color: "text-gold" },
          ].map((s) => (
            <div key={s.label} className="bg-surface px-4 py-4 sm:px-5">
              <p className={`font-display text-3xl font-bold ${s.color}`}>
                {s.value}
              </p>
              <p className="mt-1 text-xs text-muted">{s.label}</p>
            </div>
          ))}
        </section>

        {/* JOIN BAR */}
        <form
          onSubmit={handleJoin}
          className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 bg-surface border border-line rounded-2xl p-3 sm:p-4"
        >
          <div className="flex items-center gap-2 text-sm text-muted sm:w-40 shrink-0">
            <Hash size={16} className="text-ember" />
            Have a room code?
          </div>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ENTER CODE"
            maxLength={10}
            aria-label="Room code"
            className={`${inputCls} flex-1 font-mono uppercase tracking-[0.2em]`}
          />
          <button
            type="submit"
            disabled={joinCode.length < 6}
            className="h-11 px-5 inline-flex items-center justify-center gap-2 rounded-lg border border-ember/40 text-ember text-sm font-semibold hover:bg-ember/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Join
            <ArrowRight size={16} />
          </button>
        </form>

        {/* ROOMS TOOLBAR */}
        <div className="mt-10 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-fg">
            Your rooms
          </h2>

          <div className="flex flex-col sm:flex-row gap-3 min-w-0">
            <div className="relative sm:w-64">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search rooms"
                aria-label="Search rooms"
                className={`${inputCls} pl-9`}
              />
            </div>

            <div
              role="tablist"
              className="flex p-1 bg-surface border border-line rounded-lg"
            >
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  role="tab"
                  aria-selected={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={`flex-1 sm:flex-none px-3 h-9 rounded-md text-xs font-medium transition-colors ${filter === f.id
                    ? "bg-ink text-fg"
                    : "text-muted hover:text-fg"
                    }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ROOM GRID / EMPTY STATES */}
        {rooms.length === 0 ? (
          <div className="border border-dashed border-line rounded-2xl py-16 px-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl border border-line bg-surface flex items-center justify-center">
              <Code2 size={22} className="text-muted" />
            </div>
            <h3 className="font-display text-lg font-semibold text-fg">
              No rooms yet
            </h3>
            <p className="mt-1 mb-6 text-sm text-muted">
              Create your first room, or join one with a code.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="h-11 px-5 inline-flex items-center gap-2 rounded-lg bg-ember text-ink text-sm font-semibold hover:brightness-110 transition"
            >
              <Plus size={17} />
              Create first room
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="border border-dashed border-line rounded-2xl py-12 text-center text-sm text-muted">
            No rooms match your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visible.map((room) => (
              <RoomCard
                key={room._id}
                room={room}
                currentUserId={user?.id}
                onDelete={(r) => setConfirm({ open: true, action: "delete", room: r })}
                onLeave={(r) => setConfirm({ open: true, action: "leave", room: r })}
              />
            ))}
          </div>
        )}
      </main>

      {/* CREATE ROOM */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New room"
        description="Pick a language and how you want to work."
      >
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label htmlFor="room-name" className="block text-xs text-muted mb-2">
              Room name
            </label>
            <input
              id="room-name"
              value={newRoom.name}
              onChange={(e) => setNewRoom((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Two Sum pairing"
              required
              autoFocus
              className={inputCls}
            />
          </div>

          <div>
            <p className="text-xs text-muted mb-2">Language</p>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setNewRoom((p) => ({ ...p, language: lang }))}
                  className={`flex items-center gap-2 px-2.5 h-10 rounded-lg border font-mono text-xs capitalize transition-colors ${newRoom.language === lang
                    ? "border-ember bg-ember/10 text-fg"
                    : "border-line text-muted hover:border-muted"
                    }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: LANGUAGE_COLORS[lang] || "#8b8f9a" }}
                  />
                  <span className="truncate">{lang}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted mb-2">Room type</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewRoom((p) => ({ ...p, type: "collab" }))}
                className={`text-left p-3 rounded-lg border transition-colors ${newRoom.type === "collab"
                  ? "border-sync bg-sync/10"
                  : "border-line hover:border-muted"
                  }`}
              >
                <Users size={16} className="text-sync mb-2" />
                <p className="text-sm font-medium text-fg">Collaboration</p>
                <p className="text-xs text-muted mt-0.5">Code together live</p>
              </button>

              <button
                type="button"
                onClick={() => setNewRoom((p) => ({ ...p, type: "interview" }))}
                className={`text-left p-3 rounded-lg border transition-colors ${newRoom.type === "interview"
                  ? "border-ai bg-ai/10"
                  : "border-line hover:border-muted"
                  }`}
              >
                <Mic size={16} className="text-ai mb-2" />
                <p className="text-sm font-medium text-fg">Interview</p>
                <p className="text-xs text-muted mt-0.5">Scorecards and AI</p>
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="flex-1 h-11 rounded-lg border border-line text-fg text-sm font-medium hover:border-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex-1 h-11 rounded-lg bg-ember text-ink text-sm font-semibold hover:brightness-110 disabled:opacity-60 transition"
            >
              {creating ? "Creating..." : "Create room"}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE / LEAVE CONFIRM (replaces window.confirm) */}
      <ConfirmDialog
        open={confirm.open}
        danger
        loading={busy}
        title={isDelete ? "Delete this room?" : "Leave this room?"}
        description={
          isDelete
            ? `"${confirm.room?.name}" will be permanently deleted for everyone. This can't be undone.`
            : `You'll need the room code to rejoin "${confirm.room?.name}".`
        }
        confirmLabel={isDelete ? "Delete room" : "Leave room"}
        onConfirm={runConfirm}
        onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
      />
    </div>
  )
}