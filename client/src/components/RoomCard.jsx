import { useNavigate } from "react-router-dom"

export const RoomCard = ({ room, onDelete }) => {
  const navigate = useNavigate()

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3 hover:border-amber-400/50 transition">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-white font-semibold truncate">{room.name}</h3>
          <span className="text-xs text-gray-500 mt-0.5 block">
            {room.language} • {room.members?.length || 1} members
          </span>
        </div>
        <span className="text-xs font-mono bg-gray-800 text-amber-400 px-2 py-1 rounded">
          {room.code}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-1">
        <button
          onClick={() => navigate(`/room/${room._id}`)}
          className="flex-1 py-1.5 rounded-lg bg-amber-400 text-gray-950 text-sm font-semibold hover:bg-amber-300 transition"
        >
          Open
        </button>
        <button
          onClick={() => {
            navigator.clipboard.writeText(room.code)
          }}
          className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 text-sm hover:bg-gray-700 transition"
          title="Copy room code"
        >
          Copy
        </button>
        {onDelete && (
          <button
            onClick={() => onDelete(room._id)}
            className="px-3 py-1.5 rounded-lg bg-red-900/40 text-red-400 text-sm hover:bg-red-900/60 transition"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}