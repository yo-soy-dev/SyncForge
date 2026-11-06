import { useParams, useNavigate, useLocation } from "react-router-dom"
import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

import { roomApi } from "../services/api"
import { DEFAULT_FILENAME, codeNeedsInput } from "../utils/constants"
import { Editor } from "../components/Editor"
import { Navbar } from "../components/Navbar"
import { Loader } from "../components/Loader"
import { AIPanel } from "../components/AIPanel"
import { Terminal } from "../components/Terminal"
import { FileList } from "../components/FileList"
import { UserList } from "../components/UserList"
import { InterviewPanel } from "../components/InterviewPanel"
import { HistoryPanel } from "../components/HistoryPanel"
import { SuggestPanel } from "../components/SuggestPanel"
import { VideoPanel } from "../components/VideoPanel"
import { CallDock } from "../components/CallDock"
import { openCommandPalette } from "../components/CommandPalette"

import { useTerminal } from "../hooks/useTerminal"
import { useFiles } from "../hooks/useFiles"
import { useEditor } from "../hooks/useEditor"
import { useRoomAccessEvents } from "../hooks/useRoomAccess"
import { useAutoSnapshot } from "../hooks/useAutoSnapshot"
import { useCall } from "../hooks/useCall"
import { useConnection } from "../hooks/useConnection"
import { useAuth } from "../context/AuthContext"

import { toast } from "sonner"
import { SaveFileModal } from "../components/SaveFileModal"
import { TestPanel } from "../components/TestPanel"
import {
  Users,
  FolderOpen,
  Mic,
  Lightbulb,
  History,
  PanelLeft,
  Terminal as TerminalIcon,
  Copy,
  FileCode2,
  Link2,
  ListChecks,
  Film,
  Video as VideoIcon,
  MoreHorizontal,
} from "lucide-react"

/* One style shared by every right-side panel.
   Mobile  -> bottom sheet (80% height)
   Desktop -> normal right dock */
const dockClass =
  "absolute z-30 min-w-0 overflow-hidden bg-surface border-line " +
  "inset-x-0 bottom-0 h-[80%] rounded-t-2xl border-t " +
  "md:relative md:inset-auto md:h-full md:w-[380px] md:min-w-[380px] md:rounded-none md:border-t-0 md:border-l " +
  "xl:w-[440px] xl:min-w-[440px]"

const TONES = {
  ember: "bg-ember/15 text-ember border-ember/40",
  sync: "bg-sync/15 text-sync border-sync/40",
  ai: "bg-ai/15 text-ai border-ai/40",
}

/* Icon-only on mobile, icon + label on large screens */
const ToolButton = ({ icon: Icon, label, active, onClick, tone = "ember", badge = false, className = "" }) => (
  <button
    onClick={onClick}
    title={label}
    aria-label={label}
    aria-pressed={!!active}
    className={`h-8 px-2.5 shrink-0 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${active
      ? TONES[tone]
      : "border-transparent text-muted hover:text-fg hover:bg-surface"
      } ${className}`}
  >
    <Icon size={15} />
    <span className="hidden lg:inline">{label}</span>
    {badge && <span className="w-1.5 h-1.5 rounded-full bg-sync animate-pulse" />}
  </button>
)

export const Room = () => {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const editorRef = useRef(null)

  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [currentCode, setCurrentCode] = useState("")

  const [showAI, setShowAI] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [followId, setFollowId] = useState(null)
  const [showTerminal, setShowTerminal] = useState(false)
  const [showSidebar, setShowSidebar] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches,
  )

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)")

    const handleViewportChange = (event) => {
      if (event.matches) {
        setShowSidebar(false)
      }
    }

    handleViewportChange(mobileQuery)
    mobileQuery.addEventListener("change", handleViewportChange)

    return () => {
      mobileQuery.removeEventListener("change", handleViewportChange)
    }
  }, [])

  const [sidebarTab, setSidebarTab] = useState("users")

  const [role, setRole] = useState(null)
  const [canUseAI, setCanUseAI] = useState(false)
  const [canWrite, setCanWrite] = useState(true)
  const [sidePanel, setSidePanel] = useState(null)

  const [stdin, setStdin] = useState("")
  const [currentFile, setCurrentFile] = useState("main")

  const { output, running, run, clear } = useTerminal(room?.language || "javascript")
  const { files, saving, loadFiles, saveFile, loadFile } = useFiles(roomId)
  const { users } = useEditor(roomId)
  const call = useCall({ roomId })
  const connection = useConnection()

  // Prevent browser scroll restoration on the Room page.
  useEffect(() => {
    const html = document.documentElement
    const previousRestoration = window.history.scrollRestoration
    const previousScrollBehavior = html.style.scrollBehavior

    // Lock the page BEFORE resetting its scroll position.
    window.history.scrollRestoration = "manual"
    html.classList.add("room-lock")

    // Disable smooth scrolling during the reset.
    html.style.scrollBehavior = "auto"

    window.scrollTo(0, 0)
    html.scrollTop = 0
    document.body.scrollTop = 0

    return () => {
      html.classList.remove("room-lock")
      html.style.scrollBehavior = previousScrollBehavior
      window.history.scrollRestoration = previousRestoration
    }
  }, [])



  useAutoSnapshot({
    roomId,
    language: room?.language,
    enabled: room?.type === "interview" && room?.interview?.status === "live" && role === "owner",
    getText: () => editorRef.current?.getValue() ?? "",
  })

  // Arriving from /problems with { starter } fills an EMPTY editor, once.
  const seeded = useRef(false)
  useEffect(() => {
    const starter = location.state?.starter
    if (!starter || seeded.current || !room) return
    seeded.current = true

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

      ; (async () => {
        // 1. wait for the editor to mount
        for (let i = 0; i < 40 && !editorRef.current; i++) await wait(250)
        // 2. give the first Yjs sync a moment to arrive
        await wait(800)

        const editor = editorRef.current
        if (editor && !editor.getValue().trim()) {
          editor.setValue(starter)
          toast.success("Starter code added")
        }

        // remove it from history so a refresh can't add it again
        if (window.location.pathname === location.pathname) {
          navigate(location.pathname, { replace: true, state: null })
        }
      })()
  }, [room, location.state])

  // Arriving from /interviews with { panel: "interview" } opens that panel once
  const openedFromLink = useRef(false)
  useEffect(() => {
    if (openedFromLink.current || !room) return
    if (location.state?.panel === "interview" && room.type === "interview") {
      openedFromLink.current = true
      setShowAI(false)
      setSidePanel("interview")
    }
  }, [room, location.state])

  useEffect(() => {
    if (followId && !users.some((u) => u.socketId === followId)) {
      setFollowId(null)
      toast.info("The person you were following left")
    }
  }, [users, followId])

  const needsInput = codeNeedsInput(currentCode, room?.language)

  const { user } = useAuth()

  const refreshRoom = useCallback(async () => {
    const data = await roomApi.getById(roomId)
    setRoom(data.room)
    setRole(data.role ?? null)
    if (typeof data.canWrite === "boolean") setCanWrite(data.canWrite)
    setCanUseAI(data.canUseAI === true)
  }, [roomId])

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        await refreshRoom()
      } catch {
        setError("Room not found")
        toast.error("Failed to load room")
      } finally {
        setLoading(false)
      }
    }
    fetchRoom()
  }, [roomId, refreshRoom])

  useEffect(() => {
    if (room?.type !== "interview") return
    const t = setInterval(() => {
      if (document.visibilityState === "visible") refreshRoom().catch(() => { })
    }, 5000)
    return () => clearInterval(t)
  }, [room?.type, refreshRoom])

  useRoomAccessEvents({
    onRole: ({ role: r, canWrite: w }) => {
      if (r) setRole(r)
      if (typeof w === "boolean") setCanWrite(w)
    },
    onRevoked: () => {
      toast.error("Your access to this room was removed")
      navigate("/dashboard")
    },
  })


  useEffect(() => {
    if (!roomId) return

    const init = async () => {
      await loadFiles()
    }

    init()
  }, [roomId, loadFiles])






  const handleRun = useCallback(() => {
    if (room?.type === "interview" && !canUseAI) {
      toast.info("AI assistance is off for this interview. The interviewer can turn it on.")
      return
    }

    const needsInput = codeNeedsInput(currentCode, room?.language)

    if (needsInput && !stdin.trim()) {
      setShowTerminal(true)
      toast.warning("This code takes input. Enter the values in stdin, then run it.")
      return
    }

    setShowTerminal(true)

    run({
      code: currentCode,
      input: stdin,
    })
  }, [currentCode, stdin, run, room, canUseAI])

  const handleSave = useCallback(() => {
    if (!currentCode.trim()) {
      toast.error("Write some code first")
      return
    }
    setSaveOpen(true)
  }, [currentCode])

  const handleSaveConfirm = async (filename) => {
    setSaveOpen(false)
    setCurrentFile(filename)
    await saveFile(filename, currentCode, room?.language)
  }

  const handleLoadFile = useCallback((file) => {
    const content = loadFile(file)
    if (editorRef.current) {
      editorRef.current.setValue(content)
    }
    setCurrentFile(file.filename)
    setSidebarTab("users")
    toast.success(`${file.filename} loaded`)
  }, [loadFile])


  const closeSidebarOnMobile = () => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      setShowSidebar(false)
    }
  }

  /* One function replaces the 3 copy-pasted onClick handlers */
  const togglePanel = (name) => {
    setShowAI(false)
    closeSidebarOnMobile()
    setSidePanel((previous) => (previous === name ? null : name))
  }

  const handleCopyCode = () => {
    if (!room?.code) return
    navigator.clipboard.writeText(room.code)
    toast.success("Room code copied")
  }

  const handleCopyLink = () => {
    if (!room?.code) return
    navigator.clipboard.writeText(`${window.location.origin}/join/${room.code}`)
    toast.success("Invite link copied")
  }

  /* Keyboard shortcuts: Ctrl/Cmd + Enter = Run, Ctrl/Cmd + S = Save */
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        handleRun()
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [handleRun, handleSave])

  /* Commands coming from the global command palette */
  useEffect(() => {
    const onCommand = (e) => {
      switch (e.detail) {
        case "run":
          handleRun()
          break
        case "save":
          handleSave()
          break
        case "terminal":
          setShowTerminal((p) => !p)
          break
        case "sidebar":
          setShowAI(false)
          setSidePanel(null)
          setShowSidebar((p) => !p)
          break
        case "history":
          togglePanel("history")
          break
        case "tests":
          if (room?.type === "interview") {
            toast.info("Code execution is disabled in interview rooms")
            break
          }
          togglePanel("tests")
          break
        case "suggest":
          togglePanel("suggest")
          break
        case "ai":
          if (room?.type === "interview") {
            toast.info("In interview rooms, use Suggest (the interviewer must enable AI)")
            break
          }
          setSidePanel(null)
          closeSidebarOnMobile()
          setShowAI((p) => !p)
          break
        default:
          break
      }
    }

    window.addEventListener("coduet:room-command", onCommand)
    return () => window.removeEventListener("coduet:room-command", onCommand)
  }, [handleRun, handleSave, room, togglePanel])

  if (loading) return <Loader message="Loading room..." />

  if (error) return (
    <div className="min-h-dvh bg-ink flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <h2 className="font-display text-2xl font-semibold text-fg">Something went wrong</h2>
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={() => navigate("/dashboard")}
          className="h-11 px-5 rounded-lg bg-ember text-ink font-semibold hover:brightness-110 transition"
        >
          Back to dashboard
        </button>
      </motion.div>
    </div>
  )

  return (
    // <div className="h-dvh min-h-0 flex flex-col bg-ink overflow-hidden">
    <div className="fixed inset-0 h-dvh w-full min-h-0 flex flex-col bg-ink overflow-hidden">

      <Navbar
        showRoomControls
        onRun={handleRun}
        onSave={handleSave}
        running={running}
        saving={saving}
        showAI={showAI}
        onToggleAI={() => {
          if (room?.type === "interview") {
            toast.info("In interview rooms, use Suggest (the interviewer must enable AI)")
            return
          }

          setSidePanel(null)
          closeSidebarOnMobile()
          setShowAI((previous) => !previous)
        }}
      />

      {/* Room sub-header: identity on the left, tools on the right. Never wraps. */}
      <div className="h-11 shrink-0 border-b border-line bg-ink px-2 sm:px-4 flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h2 className="font-display text-sm font-semibold text-fg truncate min-w-0">
            {room?.name}
          </h2>

          {connection !== "synced" && (
            <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[11px] font-medium text-gold">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
              {connection === "offline" ? "Reconnecting..." : "Joining..."}
            </span>
          )}

          <span className="hidden sm:inline-flex shrink-0 font-mono text-[11px] text-muted border border-line rounded-md px-1.5 py-0.5 capitalize">
            {room?.language}
          </span>

          {room?.type === "interview" && (
            <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-ai/15 text-ai border border-ai/30">
              Interview
            </span>
          )}

          {room?.code && (
            <button
              onClick={handleCopyCode}
              title="Copy room code"
              className="hidden sm:flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-muted hover:text-fg border border-line hover:border-muted rounded-md px-1.5 py-0.5 transition-colors"
            >
              {room.code}
              <Copy size={11} />
            </button>
          )}

          {room?.code && room?.type !== "interview" && (
            <button
              onClick={handleCopyLink}
              title="Copy invite link"
              aria-label="Copy invite link"
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md border border-line text-muted hover:text-fg hover:border-muted transition-colors"
            >
              <Link2 size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {room?.type === "interview" && (
            <ToolButton
              icon={Mic}
              label="Interview"
              tone="ai"
              active={sidePanel === "interview"}
              onClick={() => togglePanel("interview")}
            />
          )}
          <ToolButton
            icon={Lightbulb}
            label="Suggest"
            tone="ai"
            active={sidePanel === "suggest"}
            onClick={() => togglePanel("suggest")}
          />
          <ToolButton
            icon={History}
            label="History"
            tone="ember"
            active={sidePanel === "history"}
            className="max-sm:hidden"
            onClick={() => togglePanel("history")}
          />

          <ToolButton
            icon={VideoIcon}
            label="Video"
            tone="sync"
            active={sidePanel === "call"}
            badge={call.state.status === "joined"}
            onClick={() => togglePanel("call")}
          />

          {(room?.type !== "interview" || role === "owner") && (
            <ToolButton
              icon={Film}
              label="Replay"
              tone="ember"
              active={false}
              className="max-sm:hidden"
              onClick={() => navigate(`/room/${roomId}/replay`)}
            />
          )}

          {room?.type !== "interview" && (
            <ToolButton
              icon={ListChecks}
              label="Tests"
              tone="ember"
              active={sidePanel === "tests"}
              className="max-sm:hidden"
              onClick={() => togglePanel("tests")}
            />
          )}

          <button
            onClick={openCommandPalette}
            aria-label="More"
            title="More: history, tests, replay..."
            className="sm:hidden h-8 px-2.5 shrink-0 rounded-lg flex items-center text-muted hover:text-fg hover:bg-surface"
          >
            <MoreHorizontal size={15} />
          </button>

          <span className="w-px h-5 bg-line mx-1" />

          <ToolButton
            icon={PanelLeft}
            label="Sidebar"
            tone="sync"
            active={showSidebar}
            onClick={() => {
              setShowAI(false)
              setSidePanel(null)
              setShowSidebar((previous) => !previous)
            }}
          />
          <ToolButton
            icon={TerminalIcon}
            label="Terminal"
            tone="sync"
            active={showTerminal}
            onClick={() => setShowTerminal((p) => !p)}
          />
        </div>
      </div>

      <div className="relative flex-1 min-h-0 min-w-0 flex overflow-hidden bg-ink">

        {(showSidebar || sidePanel || showAI) && (
          <button
            type="button"
            aria-label="Close open panel"
            onClick={() => {
              closeSidebarOnMobile()
              setSidePanel(null)
              setShowAI(false)
            }}
            className="absolute inset-0 z-20 bg-black/50 md:hidden"
          />
        )}

        <AnimatePresence initial={false}>
          {showSidebar && (
            <motion.aside
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="absolute inset-y-0 left-0 z-30 w-[min(85vw,280px)] min-w-0 border-r border-line bg-surface overflow-hidden flex flex-col shrink-0 md:relative md:inset-auto md:z-auto md:w-[280px] md:min-w-[280px]"
            >
              <div className="flex border-b border-line shrink-0">
                {["users", "files"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSidebarTab(tab)}
                    className={`flex-1 py-2 text-xs font-medium capitalize transition ${sidebarTab === tab
                      ? "text-ember border-b-2 border-ember"
                      : "text-muted hover:text-fg"
                      }`}
                  >
                    <span className="inline-flex items-center justify-center gap-1.5">
                      {tab === "users" ? (
                        <>
                          <Users size={13} /> Users ({users.length + 1})
                        </>
                      ) : (
                        <>
                          <FolderOpen size={13} /> Files
                        </>
                      )}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex-1 min-h-0 min-w-0 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {sidebarTab === "users" ? (
                    <motion.div
                      key="users"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15 }}
                    >
                      <UserList
                        users={users}
                        followingId={followId}
                        onFollow={(id) => setFollowId((cur) => (cur === id ? null : id))}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="files"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                    >
                      <FileList
                        files={files}
                        currentFile={currentFile}
                        onLoad={handleLoadFile}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <div className="relative z-0 flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">

          {!canWrite && (
            <div className="px-4 py-1.5 text-xs bg-gold/10 text-gold border-b border-gold/20">
              {role === "viewer"
                ? "You are observing: this editor is read-only."
                : room?.interview?.status === "ended"
                  ? "This interview has ended."
                  : room?.interview?.status === "scheduled"
                    ? "Waiting for the interviewer to start the interview."
                    : "Editing is currently locked."}
            </div>
          )}

          <div className="flex-1 min-h-0 min-w-0 overflow-hidden shadow-2xl">
            <Editor
              roomId={roomId}
              language={room?.language}
              onCodeChange={setCurrentCode}
              // onSelectionChange={(sel) => sel && setCurrentCode(sel)}
              onSelectionChange={() => { }}
              editorRef={editorRef}
              overlay={
                sidePanel !== "call" ? (
                  <CallDock
                    state={call.state}
                    onMute={call.setMuted}
                    onLeave={call.leave}
                    onOpen={() => togglePanel("call")}
                    onShareScreen={call.startScreen}
                    onStopShare={call.stopScreen}
                  />
                ) : null
              }
              followSocketId={followId}
              followName={users.find((u) => u.socketId === followId)?.username}
              onStopFollow={() => setFollowId(null)}
              readOnly={!canWrite}
            />
          </div>

          <Terminal
            output={output}
            running={running}
            onClear={clear}
            isOpen={showTerminal}
            stdin={stdin}
            setStdin={setStdin}
            needsInput={needsInput}
          />
        </div>


        {sidePanel && (
          <aside className={dockClass}>
            {sidePanel === "interview" && room?.type === "interview" ? (
              <InterviewPanel
                room={room}
                roomId={roomId}
                role={role}
                currentUserId={user?.id}
                currentUsername={user?.username}
                users={users}
                editorRef={editorRef}
                onChanged={refreshRoom}
              />
            ) : sidePanel === "call" ? (
              <VideoPanel
                state={call.state}
                onJoin={call.join}
                onLeave={call.leave}
                onMute={call.setMuted}
                onRejoin={call.rejoin}
                onSwitchDevice={call.switchDevice}
                onShareScreen={call.startScreen}
                onStopShare={call.stopScreen}
              />
            ) : sidePanel === "tests" ? (
              <TestPanel
                roomId={roomId}
                language={room?.language || "javascript"}
                getCode={() => editorRef.current?.getValue() ?? currentCode}
              />
            ) : sidePanel === "suggest" ? (
              <SuggestPanel
                roomId={roomId}
                language={room?.language || "javascript"}
                editorRef={editorRef}
                canWrite={canWrite}
                canUseAI={canUseAI}
                isInterview={room?.type === "interview"}
              />
            ) : (
              <HistoryPanel
                roomId={roomId}
                roomName={room?.name}
                language={room?.language || "javascript"}
                editorRef={editorRef}
                canWrite={canWrite}
              />
            )}
          </aside>
        )}

        <AnimatePresence initial={false}>
          {showAI && (

            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 220,
              }}
              className={dockClass}
            >
              <AIPanel
                roomId={roomId}
                code={currentCode}
                language={room?.language || "javascript"}
                onApplyFix={async (fixedCode) => {
                  if (!canWrite) {
                    toast.error("You cannot edit right now, so the fix was not applied")
                    return
                  }
                  const editor = editorRef.current
                  const model = editor?.getModel()
                  if (!editor || !model) return
                  try {
                    await roomApi.createSnapshot(roomId, {
                      text: editor.getValue(),
                      language: room?.language,
                      kind: "before-ai",
                    })
                  } catch {
                    toast.warning(
                      "Could not create a restore point. Applying the AI fix anyway."
                    )
                  }
                  editor.executeEdits("ai-fix", [{ range: model.getFullModelRange(), text: fixedCode }])
                  toast.success("AI fix applied. Undo with Ctrl+Z")
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SaveFileModal
        open={saveOpen}
        defaultName={DEFAULT_FILENAME(room?.language)}
        onClose={() => setSaveOpen(false)}
        onSave={handleSaveConfirm}
      />

      <div className="h-7 shrink-0 bg-ink border-t border-line flex items-center px-2 sm:px-4 gap-4 overflow-hidden font-mono text-[11px] text-muted">
        <span className="hidden sm:inline whitespace-nowrap">
          <kbd className="text-fg">Ctrl</kbd>+<kbd className="text-fg">Enter</kbd> run
        </span>
        <span className="hidden sm:inline whitespace-nowrap">
          <kbd className="text-fg">Ctrl</kbd>+<kbd className="text-fg">S</kbd> save
        </span>
        <span className="ml-auto flex items-center gap-1.5 truncate min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-sync shrink-0" />
          {currentFile && (
            <>
              <FileCode2 size={12} className="shrink-0" />
              <span className="truncate">{currentFile}</span>
            </>
          )}
        </span>
      </div>
    </div>
  )
}


