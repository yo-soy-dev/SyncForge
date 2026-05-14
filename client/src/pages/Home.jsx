import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { roomApi } from "../services/api"
import { useAuth } from "../context/AuthContext"
import { Navbar } from "../components/Navbar"
import { RoomCard } from "../components/RoomCard"
import { Loader } from "../components/Loader"
import { LANGUAGES } from "../utils/constants"

export const Home = () => {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [joinCode, setJoinCode] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [newRoom, setNewRoom] = useState({ name: "", language: "javascript" })
  const [error, setError] = useState("")
  const { user } = useAuth()
  const navigate = useNavigate()

  // Rooms fetch karo
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const data = await roomApi.getMyRooms()
        setRooms(data.rooms)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchRooms()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError("")
    try {
      const data = await roomApi.create(newRoom)
      setRooms(prev => [data.room, ...prev])
      setShowCreate(false)
      setNewRoom({ name: "", language: "javascript" })
      navigate(`/room/${data.room._id}`)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    setError("")
    try {
      const data = await roomApi.join(joinCode.toUpperCase())
      navigate(`/room/${data.room._id}`)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (roomId) => {
    if (!confirm("Room delete karna chahte ho?")) return
    try {
      await roomApi.delete(roomId)
      setRooms(prev => prev.filter(r => r._id !== roomId))
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <Loader message="Rooms load ho rahi hain..." />

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Namaste, {user?.username}!
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Apni rooms dekho ya nayi banao
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-amber-400 text-gray-950 font-bold rounded-lg text-sm hover:bg-amber-300 transition"
          >
            + New Room
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Join room */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-6">
          <h2 className="text-white font-semibold mb-3 text-sm">
            Room Code se Join karo
          </h2>
          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC12XYZ"
              maxLength={8}
              className="flex-1 bg-gray-800 text-white font-mono rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-amber-400 focus:outline-none uppercase"
            />
            <button
              type="submit"
              disabled={joinCode.length < 6}
              className="px-4 py-2 bg-gray-800 text-amber-400 font-semibold rounded-lg text-sm hover:bg-gray-700 disabled:opacity-40 transition"
            >
              Join
            </button>
          </form>
        </div>

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-800">
              <h2 className="text-white font-semibold text-lg mb-4">
                Nayi Room Banao
              </h2>
              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1.5 block">
                    Room ka naam
                  </label>
                  <input
                    value={newRoom.name}
                    onChange={e => setNewRoom(p => ({ ...p, name: e.target.value }))}
                    placeholder="My Awesome Room"
                    required
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1.5 block">
                    Language
                  </label>
                  <select
                    value={newRoom.language}
                    onChange={e => setNewRoom(p => ({ ...p, language: e.target.value }))}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-amber-400 focus:outline-none"
                  >
                    {LANGUAGES.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="flex-1 py-2 rounded-lg bg-gray-800 text-gray-400 text-sm hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-lg bg-amber-400 text-gray-950 font-bold text-sm hover:bg-amber-300 transition"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Rooms grid */}
        <h2 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-3">
          Meri Rooms ({rooms.length})
        </h2>

        {rooms.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <p className="text-4xl mb-3">🏠</p>
            <p>Koi room nahi — pehli room banao!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rooms.map(room => (
              <RoomCard
                key={room._id}
                room={room}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}