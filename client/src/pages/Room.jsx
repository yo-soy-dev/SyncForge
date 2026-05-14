import { useParams, useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { roomApi } from "../services/api"
import { Editor } from "../components/Editor" 
import { Navbar } from "../components/Navbar"
import { Loader } from "../components/Loader"

export const Room = () => {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

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
      </div>

      {/* Editor — full height */}
      <div className="flex-1 overflow-hidden">
        <Editor roomId={roomId} language={room?.language} />
      </div>
    </div>
  )
}