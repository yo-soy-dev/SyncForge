import { useState, useEffect } from "react"

import { useNavigate } from "react-router-dom"

import {
  Plus,
  Search,
  Code2,
  Sparkles,
} from "lucide-react"

import { toast } from "sonner"

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

  const [newRoom, setNewRoom] = useState({
    name: "",
    language: "javascript",
  })

  const [error, setError] = useState("")

  const { user } = useAuth()

  const navigate = useNavigate()

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const data = await roomApi.getMyRooms()

        setRooms(data.rooms)
      } catch (err) {
        setError(err.message)

        toast.error("Failed to load rooms")
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

      setRooms((prev) => [data.room, ...prev])

      setShowCreate(false)

      setNewRoom({
        name: "",
        language: "javascript",
      })

      toast.success("Room created successfully")

      navigate(`/room/${data.room._id}`)
    } catch (err) {
      setError(err.message)

      toast.error(err.message)
    }
  }

  const handleJoin = async (e) => {
    e.preventDefault()

    setError("")

    try {
      const data = await roomApi.join(
        joinCode.toUpperCase()
      )

      toast.success("Joined room successfully")

      navigate(`/room/${data.room._id}`)
    } catch (err) {
      setError(err.message)

      toast.error(err.message)
    }
  }

  const handleDelete = async (roomId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this room?"
    )

    if (!confirmed) return

    try {
      await roomApi.delete(roomId)

      setRooms((prev) =>
        prev.filter((r) => r._id !== roomId)
      )

      toast.success("Room deleted")
    } catch (err) {
      setError(err.message)

      toast.error(err.message)
    }
  }

  if (loading) {
    return (
      <Loader message="Loading your rooms..." />
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">

      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-6">

        <div
          className="
            relative
            overflow-hidden
            rounded-3xl
            border border-gray-800
            bg-gradient-to-br from-gray-900 to-gray-950
            p-4 sm:p-6
            mb-8
          "
        >

          <div
            className="
              absolute
              top-0 right-0
              w-56 h-56
              bg-amber-400/10
              blur-3xl
              rounded-full
            "
          />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

            <div>

              <div
                className="
                  inline-flex
                  items-center
                  gap-2
                  px-3 py-1
                  rounded-full
                  border border-amber-400/20
                  bg-amber-400/10
                  text-amber-400
                  text-xs
                  font-medium
                  mb-4
                "
              >
                <Sparkles size={14} />
                Real-time Collaboration Workspace
              </div>

              <h1
                className="
                  text-xl
                  sm:text-2xl
                  md:text-3xl
                  lg:text-4xl
                  font-bold
                  text-white
                  leading-tight
                "
              >
                Welcome back,
                <br />

                <span className="text-amber-400">
                  {user?.username}
                </span>
              </h1>

              <p
                className="
                  mt-4
                  text-gray-400
                  text-sm sm:text-base
                  max-w-xl
                  leading-relaxed
                "
              >
                Create collaborative coding rooms,
                invite teammates, review code with AI,
                and build together in real time.
              </p>
            </div>

            <button
              onClick={() => setShowCreate(true)}
              className="
                shrink-0
                h-fit
                flex items-center justify-center gap-2
                px-5 py-3.5 sm:py-3
                rounded-2xl
                bg-amber-400
                hover:bg-amber-300
                text-gray-950
                font-semibold
                transition-all
              "
            >
              <Plus size={18} />
              Create Room
            </button>
          </div>
        </div>

        {error && (
          <div
            className="
              mb-6
              p-4
              rounded-2xl
              bg-red-900/20
              border border-red-800
              text-red-400
              text-sm
              sm:text-base
            "
          >
            {error}
          </div>
        )}

        <div
          className="
            bg-gray-900
            border border-gray-800
            rounded-3xl
            p-5
            mb-8
          "
        >

          <div className="flex items-center gap-2 mb-4">

            <div
              className="
                w-10 h-10
                rounded-xl
                bg-blue-500/10
                border border-blue-500/20
                flex items-center justify-center
              "
            >
              <Search
                size={18}
                className="text-blue-400"
              />
            </div>

            <div>
              <h2 className="text-white font-semibold">
                Join Existing Room
              </h2>

              <p className="text-xs text-gray-500">
                Enter a room code to collaborate
              </p>
            </div>
          </div>

          <form
            onSubmit={handleJoin}
            className="
              flex flex-col sm:flex-row
              gap-3 sm:gap-4
            "
          >

            <input
              value={joinCode}
              onChange={(e) =>
                setJoinCode(
                  e.target.value.toUpperCase()
                )
              }
              placeholder="ENTER ROOM CODE"
              maxLength={8}
              className="
                w-full 
                min-w-0
                flex-1
                bg-gray-800
                text-white
                font-mono
                rounded-2xl
                px-4 py-3
                text-sm
                sm:text-base
                border border-gray-700
                focus:border-amber-400
                focus:outline-none
                uppercase
                tracking-wider
              "
            />

            <button
              type="submit"
              disabled={joinCode.length < 6}
              className="
                py-3 sm:py-3.5
                px-6
                rounded-2xl
                bg-gray-800
                text-amber-400
                font-semibold
                text-sm
                sm:text-base
                hover:bg-gray-700
                disabled:opacity-40
                disabled:cursor-not-allowed
                transition-all
              "
            >
              Join Room
            </button>
          </form>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 mb-5">

          <div
            className="
              w-10 h-10
              rounded-xl
              bg-amber-400/10
              border border-amber-400/20
              flex items-center justify-center
            "
          >
            <Code2
              size={18}
              className="text-amber-400"
            />
          </div>

          <div>
            <h2 className="text-white font-semibold">
              Your Rooms
            </h2>

            <p className="text-xs text-gray-500">
              {rooms.length} total rooms
            </p>
          </div>
        </div>

        {rooms.length === 0 ? (
          <div
            className="
              border border-dashed border-gray-800
              rounded-3xl
              py-20 px-6
              text-center
              bg-gray-900/40
            "
          >

            <div
              className="
                w-20 h-20
                mx-auto mb-5
                rounded-3xl
                bg-gray-800
                flex items-center justify-center
              "
            >
              <Code2
                size={34}
                className="text-gray-500"
              />
            </div>

            <h3 className="text-white text-lg font-semibold mb-2">
              No rooms yet
            </h3>

            <p className="text-gray-500 text-sm sm:text-base mb-6">
              Create your first collaborative coding
              room to get started.
            </p>

            <button
              onClick={() => setShowCreate(true)}
              className="
    w-full sm:w-auto
    flex items-center justify-center gap-2
    px-5 py-3
    rounded-2xl
    bg-amber-400
    hover:bg-amber-300
    text-gray-950
    font-semibold
    transition-all
  "
            >
              <Plus size={18} />
              Create First Room
            </button>
          </div>
        ) : (
          <div
            className="
              grid
              grid-cols-1
              md:grid-cols-2
              xl:grid-cols-3
              gap-3 sm:gap-4
            "
          >
            {rooms.map((room) => (
              <RoomCard
                key={room._id}
                room={room}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <div
          className="
            fixed inset-0
            z-50
            bg-black/70
            backdrop-blur-sm
            flex items-center justify-center
            p-4
          "
        >

          <div
            className="
              w-full max-w-md
              bg-gray-900
              border border-gray-800
              rounded-3xl
              p-4 sm:p-6
            "
          >

            <div className="mb-6">

              <h2 className="text-xl font-semibold text-white">
                Create New Room
              </h2>

              <p className="text-sm sm:text-base text-gray-500 mt-1">
                Start collaborating instantly
              </p>
            </div>

            <form
              onSubmit={handleCreate}
              className="space-y-5"
            >

              <div>

                <label className="block text-sm sm:text-base text-gray-400 mb-2">
                  Room Name
                </label>

                <input
                  value={newRoom.name}
                  onChange={(e) =>
                    setNewRoom((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="My Awesome Workspace"
                  required
                  className="
                    w-full
                    min-w-0
                    bg-gray-800
                    text-white
                    rounded-2xl
                    px-4 py-3
                    text-sm
                    sm:text-base
                    border border-gray-700
                    focus:border-amber-400
                    focus:outline-none
                  "
                />
              </div>

              <div>

                <label className="block text-sm sm:text-base text-gray-400 mb-2">
                  Programming Language
                </label>

                <select
                  value={newRoom.language}
                  onChange={(e) =>
                    setNewRoom((prev) => ({
                      ...prev,
                      language: e.target.value,
                    }))
                  }
                  className="
                    w-full
                    min-w-0
                    bg-gray-800
                    text-white
                    rounded-2xl
                    px-4 py-3
                    text-sm
                    sm:text-base
                    border border-gray-700
                    focus:border-amber-400
                    focus:outline-none
                  "
                >
                  {LANGUAGES.map((language) => (
                    <option
                      key={language}
                      value={language}
                    >
                      {language}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 sm:gap-3 pt-2">

                <button
                  type="button"
                  onClick={() =>
                    setShowCreate(false)
                  }
                  className="
                    flex-1
                    py-3
                    rounded-2xl
                    bg-gray-800
                    text-gray-300
                    hover:bg-gray-700
                    transition-all
                  "
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="
                    flex-1
                    py-3
                    rounded-2xl
                    bg-amber-400
                    hover:bg-amber-300
                    text-gray-950
                    font-semibold
                    transition-all
                  "
                >
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}







