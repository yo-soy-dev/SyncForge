import { useParams, useNavigate } from "react-router-dom"
import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

import { roomApi } from "../services/api"
import { DEFAULT_FILENAME, codeNeedsInput  } from "../utils/constants"
import { Editor } from "../components/Editor"
import { Navbar } from "../components/Navbar"
import { Loader } from "../components/Loader"
import { AIPanel } from "../components/AIPanel"
import { Terminal } from "../components/Terminal"
import { FileList } from "../components/FileList"
import { UserList } from "../components/UserList"

import { useTerminal } from "../hooks/useTerminal"
import { useFiles } from "../hooks/useFiles"
import { useEditor } from "../hooks/useEditor"

import { toast } from "sonner"

export const Room = () => {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const editorRef = useRef(null)

  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [currentCode, setCurrentCode] = useState("")

  const [showAI, setShowAI] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [sidebarTab, setSidebarTab] = useState("users") // "users" | "files"

  const [stdin, setStdin] = useState("")
  const [currentFile, setCurrentFile] = useState("main")

  // const { output, running, run, clear } = useTerminal(room?.language)
  const { output, running, run, clear } = useTerminal(room?.language || "javascript")
  const { files, saving, loadFiles, saveFile, saveToDevice, loadFile } = useFiles(roomId)
  const { users } = useEditor(roomId)

  const needsInput = codeNeedsInput(currentCode, room?.language)

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const data = await roomApi.getById(roomId)
        setRoom(data.room)
        toast.success("Room loaded!")
      } catch {
        setError("Room not found")
        toast.error("Failed to load room")
      } finally {
        setLoading(false)
      }
    }
    fetchRoom()
  }, [roomId])

  // Files load karo
  // useEffect(() => {
  //   if (roomId) loadFiles()
  // }, [roomId])

  useEffect(() => {
    if (!roomId) return

    const init = async () => {
      await loadFiles()
    }

    init()
  }, [roomId, loadFiles])

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        handleRun()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [currentCode, room])

  // const handleRun = useCallback(() => {
  //   setShowTerminal(true)
  //   run(currentCode)
  // }, [currentCode, run])

  const handleRun = useCallback(() => {
    const needsInput = codeNeedsInput(currentCode, room?.language)

    if (needsInput && !stdin.trim()) {
    setShowTerminal(true)  
    toast.warning("⚠️ This code takes input — enter the values in stdin and then run it!")
    return  
  }

    setShowTerminal(true)

    run({
      code: currentCode,
      input: stdin,
    })
  }, [currentCode, stdin, run, room])

  const handleSave = useCallback(async () => {
  if (!currentCode.trim()) {
    toast.error("Write some code first!")
    return
  }
  const filename = prompt(
    "Enter file name:",
    DEFAULT_FILENAME(room?.language)
  )
  if (!filename) return
  setCurrentFile(filename)
  try {
    saveToDevice(filename, currentCode)
    await saveFile(filename, currentCode, room?.language)

    toast.success(`${filename} saved to device + cloud!`)
  } catch (err) {
    toast.warning(`${filename} downloaded but cloud save failed`)
  }
}, [currentCode, room, saveFile, saveToDevice])

  const handleLoadFile = useCallback((file) => {
    const content = loadFile(file)
    if (editorRef.current) {
      editorRef.current.setValue(content)
    }
    setCurrentFile(file.filename)
    setSidebarTab("users")
    toast.success(`${file.filename} loaded`)
  }, [loadFile])

  if (loading) return <Loader message="Loading room..." />

  if (error) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <h2 className="text-2xl font-semibold text-white">Something went wrong</h2>
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={() => navigate("/")}
          className="px-5 py-2 rounded-xl bg-amber-400 text-black font-medium hover:bg-amber-300 transition"
        >
          Back to Home
        </button>
      </motion.div>
    </div>
  )

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">

      <Navbar
        showRoomControls
        onRun={handleRun}
        onSave={handleSave}
        running={running}
        saving={saving}
        showAI={showAI}
        onToggleAI={() => setShowAI(p => !p)}
      />

      <div className="min-h-[48px] border-b border-gray-800 bg-gray-900 px-4 flex items-center gap-3">
        <span className="text-white font-semibold text-sm truncate max-w-[180px]">
          {room?.name}
        </span>
        <span className="text-gray-600 text-xs">•</span>
        <span className="text-xs font-mono text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
          {room?.code}
        </span>
        <span className="text-gray-600 text-xs">•</span>
        <span className="text-xs text-amber-400 capitalize">{room?.language}</span>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowSidebar(p => !p)}
            className="text-xs text-gray-500 hover:text-gray-300 transition px-2 py-1 rounded bg-gray-800"
          >
            {showSidebar ? "◀ Hide" : "▶ Panel"}
          </button>

          <button
            onClick={() => setShowTerminal(p => !p)}
            className={`text-xs px-2 py-1 rounded transition ${showTerminal
              ? "bg-green-500/20 text-green-400"
              : "bg-gray-800 text-gray-500 hover:text-gray-300"
              }`}
          >
            ⌨ Terminal
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(room?.code)
              toast.success("Room code copied!")
            }}
            className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-500 hover:text-gray-300 transition"
          >
            Copy Code
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-w-0 overflow-hidden bg-[#0b1120]">

        <AnimatePresence initial={false}>
          {showSidebar && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="h-full border-r border-gray-800 bg-gray-900 overflow-hidden flex flex-col shrink-0"
            >
              <div className="flex border-b border-gray-800 shrink-0">
                {["users", "files"].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSidebarTab(tab)}
                    className={`flex-1 py-2 text-xs font-medium capitalize transition ${sidebarTab === tab
                      ? "text-amber-400 border-b-2 border-amber-400"
                      : "text-gray-600 hover:text-gray-400"
                      }`}
                  >
                    {tab === "users" ? `👥 Users (${users.length})` : "📁 Files"}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {sidebarTab === "users" ? (
                    <motion.div
                      key="users"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15 }}
                    >
                      <UserList users={users} />
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

        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

          <div className="flex-1 overflow-hidden shadow-2xl">
            <Editor
              roomId={roomId}
              language={room?.language}
              onCodeChange={setCurrentCode}
              // onSelectionChange={(sel) => sel && setCurrentCode(sel)}
              onSelectionChange={() => { }}
              editorRef={editorRef}
              hideUserList={true}
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

        <AnimatePresence initial={false}>
          {showAI && (
            // <motion.div
            //   initial={{ width: 0, opacity: 0 }}
            //   animate={{ width: 460, opacity: 1 }}
            //   exit={{ width: 0, opacity: 0 }}
            //   transition={{ type: "spring", damping: 28, stiffness: 220 }}
            //   className="h-full border-l border-gray-800 bg-gray-900 overflow-hidden shrink-0"
            // >
            <motion.div
              initial={{ x: 120, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 120, opacity: 0 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 220,
              }}
              className="
    h-full
    w-[460px]
    min-w-[460px]
    border-l
    border-gray-800
    bg-gray-900
    overflow-hidden
    shrink-0
  "
            >
              <AIPanel
                code={currentCode}
                language={room?.language || "javascript"}
                onApplyFix={(fixedCode) => {
                  if (editorRef.current) {
                    editorRef.current.setValue(fixedCode)
                  }
                  toast.success("AI fix applied!")
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="h-6 bg-gray-900 border-t border-gray-800 flex items-center px-4 gap-4">
        <span className="text-xs text-gray-700">
          Ctrl+Enter → Run
        </span>
        <span className="text-xs text-gray-700">
          Ctrl+S → Save
        </span>
        <span className="text-xs text-gray-700 ml-auto">
          {currentFile && `📄 ${currentFile}`}
        </span>
      </div>
    </div>
  )
}


