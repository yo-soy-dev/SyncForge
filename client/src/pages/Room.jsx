import { useParams, useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { roomApi } from "../services/api"
import { Editor } from "../components/Editor"
import { Navbar } from "../components/Navbar"
import { Loader } from "../components/Loader"
import { AIPanel } from "../components/AIPanel"


export const Room = () => {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [currentCode, setCurrentCode] = useState("")
  const [showAI, setShowAI] = useState(true)

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const data = await roomApi.getById(roomId)
        setRoom(data.room)
      } catch (err) {
        setError("Room nahi mila")
      } finally {
        setLoading(false)
      }
    }
    fetchRoom()
  }, [roomId])

  if (loading) return <Loader message="Room load ho rahi hai..." />

  if (error) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
      <p className="text-red-400">{error}</p>
      <button
        onClick={() => navigate("/")}
        className="text-amber-400 hover:underline text-sm"
      >
        Wapas jao
      </button>
    </div>
  )

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      <Navbar />

      {/* Room info bar */}
      <div className="h-10 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-3">
        <span className="text-white font-medium text-sm">{room?.name}</span>
        <span className="text-gray-600 text-xs">•</span>
        <span className="text-gray-500 text-xs font-mono">{room?.code}</span>
        <span className="text-gray-600 text-xs">•</span>
        <span className="text-gray-500 text-xs">{room?.language}</span>

        <button
          onClick={() => setShowAI(p => !p)}
          className={`ml-auto text-xs px-3 py-1 rounded-lg transition ${showAI
              ? "bg-amber-400/20 text-amber-400 border border-amber-400/30"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
        >
          🤖 {showAI ? "AI Hide" : "AI Show"}
        </button>

      </div>

      {/* Editor — full height */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <Editor roomId={roomId} language={room?.language} onCodeChange={setCurrentCode} />
        </div>
        {showAI && (
          <AIPanel
            code={currentCode}
            language={room?.language || "javascript"}
            onApplyFix={(fixedCode) => {
              // Editor mein fix apply karo
              console.log("Fix apply:", fixedCode)
            }}
          />
        )}
      </div>
    </div>
  )
}