import { useNavigate } from "react-router-dom"
import { Users, Mic, Copy, Check, Trash2, LogOut, ArrowRight } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { LANGUAGE_COLORS } from "../utils/constants"

export const isRoomOwner = (room, userId) => {
  const id = userId?.toString()
  return (
    !!id &&
    (room.owner?.toString() === id || room.owner?._id?.toString() === id)
  )
}

export const RoomCard = ({ room, currentUserId, onDelete, onLeave }) => {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const isOwner = isRoomOwner(room, currentUserId)
  const isInterview = room.type === "interview"
  const members = room.members?.length || 1

  const handleCopy = async () => {
    if (!room.code) {
      toast.info("Only the interview owner can see room codes")
      return
    }
    try {
      await navigator.clipboard.writeText(room.code)
      setCopied(true)
      toast.success("Room code copied")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy code")
    }
  }

  return (
    <div className="group flex flex-col bg-surface border border-line rounded-2xl p-4 sm:p-5 hover:border-ember/40 transition-colors">
      {/* badges */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
            isInterview
              ? "bg-ai/10 text-ai border-ai/30"
              : "bg-sync/10 text-sync border-sync/30"
          }`}
        >
          {isInterview ? <Mic size={11} /> : <Users size={11} />}
          {isInterview ? "Interview" : "Collab"}
        </span>

        {isOwner && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-gold/30 bg-gold/10 text-gold">
            Owner
          </span>
        )}
      </div>

      {/* title + meta */}
      <h3 className="font-display text-lg font-semibold text-fg truncate">
        {room.name}
      </h3>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted">
        <span className="flex items-center gap-1.5 capitalize">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: LANGUAGE_COLORS[room.language] || "#8b8f9a" }}
          />
          {room.language}
        </span>
        <span className="flex items-center gap-1">
          <Users size={12} />
          {members} {members === 1 ? "member" : "members"}
        </span>
        {room.updatedAt && (
          <span>{new Date(room.updatedAt).toLocaleDateString()}</span>
        )}
      </div>

      {/* code */}
      <button
        onClick={handleCopy}
        title="Copy room code"
        className="mt-4 flex items-center justify-between w-full font-mono text-xs bg-ink border border-line rounded-lg px-3 py-2 text-muted hover:border-muted transition-colors"
      >
        <span className={room.code ? "tracking-[0.2em] text-fg" : "tracking-wide"}>
          {room.code || "Owner only"}
        </span>
        {copied ? (
          <Check size={14} className="text-sync" />
        ) : (
          <Copy size={14} />
        )}
      </button>

      {/* actions */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => navigate(`/room/${room._id}`)}
          className="flex-1 h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-ember text-ink text-sm font-semibold hover:brightness-110 transition"
        >
          Open room
          <ArrowRight size={16} />
        </button>

        {isOwner ? (
          <button
            onClick={() => onDelete?.(room)}
            aria-label="Delete room"
            title="Delete room"
            className="w-10 h-10 shrink-0 rounded-lg border border-line text-muted hover:text-red-400 hover:border-red-500/40 flex items-center justify-center transition-colors"
          >
            <Trash2 size={16} />
          </button>
        ) : (
          <button
            onClick={() => onLeave?.(room)}
            aria-label="Leave room"
            title="Leave room"
            className="w-10 h-10 shrink-0 rounded-lg border border-line text-muted hover:text-fg hover:border-muted flex items-center justify-center transition-colors"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </div>
  )
}