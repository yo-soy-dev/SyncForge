import { useNavigate } from "react-router-dom"

import {
  Code2,
  Users,
  Copy,
  Trash2,
  ArrowRight,
  Check,
  LogOut,
} from "lucide-react"

import { useState } from "react"

import { toast } from "sonner"

export const RoomCard = ({
  room,
  currentUserId,
  onDelete,
  onLeave
}) => {
  const navigate = useNavigate()

  const [copied, setCopied] = useState(false)

  const isOwner = room.owner?.toString() === currentUserId?.toString() || room.owner?._id?.toString() === currentUserId?.toString()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        room.code
      )

      setCopied(true)

      toast.success("Room code copied")

      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch {
      toast.error("Failed to copy code")
    }
  }

  return (
    <div
      className="
        group
        relative
        overflow-hidden
        bg-gray-900
        border border-gray-800
        rounded-3xl
        p-5
        hover:border-amber-400/40
        transition-all duration-300
      "
    >

      <div
        className="
          absolute
          top-0 right-0
          w-32 h-32
          bg-amber-400/5
          blur-3xl
          rounded-full
          opacity-0
          group-hover:opacity-100
          transition
        "
      />

      <div className="relative z-10 flex items-start justify-between gap-3">

        <div className="min-w-0 flex-1">

          <div
            className="
              mb-4
              w-12 h-12
              rounded-2xl
              bg-amber-400/10
              border border-amber-400/20
              flex items-center justify-center
            "
          >
            <Code2
              size={22}
              className="text-amber-400"
            />
          </div>

          <h3
            className="
              text-white
              text-lg
              font-semibold
              truncate
            "
          >
            {room.name}
          </h3>

          <div
            className="
              mt-2
              flex flex-wrap
              items-center
              gap-3
              text-xs
              text-gray-500
            "
          >

            <span className="capitalize">
              {room.language}
            </span>

            <span className="flex items-center gap-1">

              <Users size={12} />

              {room.members?.length || 1} members
            </span>

            {isOwner && (
              <span className="px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs">
                Owner
              </span>
            )}

          </div>
        </div>

        <div
          className="
            shrink-0
            rounded-xl
            border border-gray-700
            bg-gray-800
            px-3 py-2
            text-xs
            font-mono
            tracking-wider
            text-amber-400
          "
        >
          {room.code}
        </div>
      </div>

      <div
        className="
          relative z-10
          mt-6
          flex flex-col sm:flex-row
          gap-3
        "
      >

        <button
          onClick={() =>
            navigate(`/room/${room._id}`)
          }
          className="
            flex-1
            inline-flex
            items-center justify-center gap-2
            rounded-2xl
            bg-amber-400
            hover:bg-amber-300
            text-gray-950
            font-semibold
            py-3
            transition-all
          "
        >
          Open Room

          <ArrowRight size={18} />
        </button>

        <button
          onClick={handleCopy}
          className="
            sm:w-14
            h-12
            rounded-2xl
            bg-gray-800
            hover:bg-gray-700
            border border-gray-700
            flex items-center justify-center
            text-gray-300
            transition-all
          "
          title="Copy room code"
        >
          {copied ? (
            <Check
              size={18}
              className="text-green-400"
            />
          ) : (
            <Copy size={18} />
          )}
        </button>

        {/* {onDelete && (
          <button
            onClick={() =>
              onDelete(room._id)
            }
            className="
              sm:w-14
              h-12
              rounded-2xl
              bg-red-500/10
              hover:bg-red-500/20
              border border-red-500/20
              flex items-center justify-center
              text-red-400
              transition-all
            "
            title="Delete room"
          >
            <Trash2 size={18} />
          </button>
        )} */}

        {isOwner ? (
          <button
            onClick={() => onDelete?.(room._id)}
            className="sm:w-14 h-12 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 flex items-center justify-center text-red-400 transition-all"
            title="Delete room"
          >
            <Trash2 size={18} />
          </button>
        ) : (
          <button
            onClick={() => onLeave?.(room._id)}
            className="sm:w-14 h-12 rounded-2xl bg-gray-800 hover:bg-gray-700 border border-gray-700 flex items-center justify-center text-gray-400 transition-all"
            title="Leave room"
          >
            <LogOut size={18} />
          </button>
        )}

      </div>
    </div>
  )
}