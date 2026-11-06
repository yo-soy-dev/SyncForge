import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useLocation, useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import {
  Search,
  LayoutDashboard,
  Settings as SettingsIcon,
  Plus,
  LogOut,
  Code2,
  Mic,
  Film,
  ArrowLeft,
  Play,
  Save,
  Terminal as TerminalIcon,
  PanelLeft,
  History,
  Lightbulb,
  ListChecks,
  Sparkles,
  Home,
  BookOpen,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { roomApi } from "../services/api"

const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform)

export const shortcutLabel = isMac ? "⌘K" : "Ctrl K"

export const openCommandPalette = () =>
  window.dispatchEvent(new Event("coduet:palette"))

// Room.jsx listens for these
export const sendRoomCommand = (name) =>
  window.dispatchEvent(new CustomEvent("coduet:room-command", { detail: name }))

export const CommandPalette = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const [rooms, setRooms] = useState([])
  const listRef = useRef(null)

  const close = useCallback(() => setOpen(false), [])

  /* open / close triggers */
  useEffect(() => {
    if (!user) return

    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        e.stopPropagation() // keep Monaco's own Ctrl+K chord from firing
        setOpen((o) => !o)
      }
    }
    const onOpen = () => setOpen(true)

    window.addEventListener("keydown", onKey, true)
    window.addEventListener("coduet:palette", onOpen)
    return () => {
      window.removeEventListener("keydown", onKey, true)
      window.removeEventListener("coduet:palette", onOpen)
    }
  }, [user])

  /* reset and load rooms each time it opens */
  useEffect(() => {
    if (!open) return
    setQuery("")
    setActive(0)
    roomApi
      .getMyRooms()
      .then((d) => setRooms(d.rooms || []))
      .catch(() => setRooms([]))
  }, [open])

  useEffect(() => setActive(0), [query])

  /* build the command list for the current page */
  const commands = useMemo(() => {
    const go = (path, state) => () =>
      navigate(path, state ? { state } : undefined)

    const match = location.pathname.match(/^\/room\/([^/]+?)(\/replay)?\/?$/)
    const roomId = match?.[1]
    const inReplay = !!match?.[2]

    const list = []

    if (roomId && !inReplay) {
      list.push(
        { id: "run", group: "This room", label: "Run code", hint: isMac ? "⌘ Enter" : "Ctrl Enter", icon: Play, keywords: "execute", run: () => sendRoomCommand("run") },
        { id: "save", group: "This room", label: "Save file", hint: isMac ? "⌘ S" : "Ctrl S", icon: Save, keywords: "file", run: () => sendRoomCommand("save") },
        { id: "terminal", group: "This room", label: "Toggle terminal", icon: TerminalIcon, keywords: "output console", run: () => sendRoomCommand("terminal") },
        { id: "sidebar", group: "This room", label: "Toggle sidebar", icon: PanelLeft, keywords: "files users", run: () => sendRoomCommand("sidebar") },
        { id: "ai", group: "This room", label: "Toggle AI assistant", icon: Sparkles, keywords: "review chat explain fix", run: () => sendRoomCommand("ai") },
        { id: "suggest", group: "This room", label: "Open AI suggestions", icon: Lightbulb, run: () => sendRoomCommand("suggest") },
        { id: "history", group: "This room", label: "Open history", icon: History, keywords: "snapshots restore", run: () => sendRoomCommand("history") },
        { id: "tests", group: "This room", label: "Open test cases", icon: ListChecks, keywords: "run tests expected input", run: () => sendRoomCommand("tests") },
        { id: "replay", group: "This room", label: "Replay this session", icon: Film, keywords: "playback timeline", run: go(`/room/${roomId}/replay`) },
      )
    }

    if (roomId && inReplay) {
      list.push({ id: "back", group: "This room", label: "Back to room", icon: ArrowLeft, run: go(`/room/${roomId}`) })
    }

    list.push(
      { id: "new", group: "Actions", label: "Create a new room", icon: Plus, keywords: "add start", run: go("/dashboard", { create: true }) },
      { id: "logout", group: "Actions", label: "Log out", icon: LogOut, keywords: "sign out", run: async () => { await logout(); navigate("/login") } },

      { id: "nav-dash", group: "Go to", label: "Dashboard", icon: LayoutDashboard, keywords: "rooms home", run: go("/dashboard") },
      { id: "nav-interviews", group: "Go to", label: "Interviews", icon: Mic, keywords: "candidates reports scorecards", run: go("/interviews") },
      { id: "nav-problems", group: "Go to", label: "Problems", icon: BookOpen, keywords: "practice leetcode two sum starter", run: go("/problems") },
      { id: "nav-settings", group: "Go to", label: "Settings", icon: SettingsIcon, keywords: "preferences editor font", run: go("/settings") },
      { id: "nav-home", group: "Go to", label: "Landing page", icon: Home, keywords: "website", run: go("/") },
    )

    rooms.forEach((r) =>
      list.push({
        id: `room-${r._id}`,
        group: "Your rooms",
        label: r.name,
        hint: `${r.language} · ${r.type === "interview" ? "interview" : "collab"}`,
        icon: r.type === "interview" ? Mic : Code2,
        keywords: `${r.language} ${r.type}`,
        run: go(`/room/${r._id}`),
      }),
    )

    return list
  }, [location.pathname, rooms, navigate, logout])

  /* filter */
  const results = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)

    if (words.length === 0) {
      // keep the empty state short: only the 5 newest rooms
      let roomCount = 0
      return commands.filter((c) => c.group !== "Your rooms" || ++roomCount <= 5)
    }

    return commands.filter((c) => {
      const haystack = `${c.label} ${c.keywords || ""} ${c.group}`.toLowerCase()
      return words.every((w) => haystack.includes(w))
    })
  }, [commands, query])

  const current = Math.min(active, Math.max(results.length - 1, 0))

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" })
  }, [current, results])

  const execute = (command) => {
    if (!command) return
    close()
    command.run()
  }

  const onInputKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((i) => (results.length ? (i + 1) % results.length : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      execute(results[current])
    } else if (e.key === "Escape") {
      e.preventDefault()
      close()
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && user && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center px-3 pt-[10vh] sm:pt-[14vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          <div className="absolute inset-0 bg-black/70" onClick={close} aria-hidden="true" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ y: -12, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -12, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="relative w-full max-w-xl bg-surface border border-line rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="flex items-center gap-3 px-4 h-14 border-b border-line">
              <Search size={16} className="text-muted shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Type a command or search your rooms..."
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-list"
                aria-activedescendant={results[current] ? `cmd-${results[current].id}` : undefined}
                className="flex-1 min-w-0 bg-transparent text-sm text-fg placeholder:text-muted outline-none"
              />
              <kbd className="hidden sm:block font-mono text-[10px] text-muted border border-line rounded px-1.5 py-0.5">
                Esc
              </kbd>
            </div>

            <ul
              id="palette-list"
              role="listbox"
              ref={listRef}
              className="max-h-[50dvh] overflow-y-auto p-2"
            >
              {results.length === 0 && (
                <li className="px-3 py-10 text-center text-sm text-muted">
                  No matches for <span className="text-fg">{query}</span>
                </li>
              )}

              {results.map((c, i) => {
                const Icon = c.icon
                const isActive = i === current

                return (
                  <Fragment key={c.id}>
                    {(i === 0 || results[i - 1].group !== c.group) && (
                      <li
                        role="presentation"
                        className="px-3 pt-3 pb-1 font-mono text-[10px] uppercase tracking-wide text-muted"
                      >
                        {c.group}
                      </li>
                    )}

                    <li
                      id={`cmd-${c.id}`}
                      role="option"
                      aria-selected={isActive}
                      data-active={isActive}
                      onMouseMove={() => setActive(i)}
                      onClick={() => execute(c)}
                      className={`flex items-center gap-3 px-3 h-11 rounded-lg cursor-pointer transition-colors ${
                        isActive ? "bg-ember/10 text-fg" : "text-muted"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 shrink-0 rounded-md border flex items-center justify-center ${
                          isActive ? "border-ember/40 text-ember" : "border-line"
                        }`}
                      >
                        <Icon size={14} />
                      </span>
                      <span className="flex-1 min-w-0 truncate text-sm">{c.label}</span>
                      {c.hint && (
                        <span className="shrink-0 font-mono text-[11px] text-muted">
                          {c.hint}
                        </span>
                      )}
                    </li>
                  </Fragment>
                )
              })}
            </ul>

            <div className="hidden sm:flex items-center gap-4 px-4 h-9 border-t border-line font-mono text-[10px] text-muted">
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span className="ml-auto">{shortcutLabel} toggle</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}