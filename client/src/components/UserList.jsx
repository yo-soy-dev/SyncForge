import { Users, Eye } from "lucide-react"
import { useAuth } from "../context/AuthContext"

const AVATAR_STYLES = [
  "bg-ember/15 border-ember/30 text-ember",
  "bg-sync/15 border-sync/30 text-sync",
  "bg-ai/15 border-ai/30 text-ai",
  "bg-gold/15 border-gold/30 text-gold",
]

const avatarStyle = (name = "") => {
  let sum = 0
  for (const ch of name) sum += ch.charCodeAt(0)
  return AVATAR_STYLES[sum % AVATAR_STYLES.length]
}

export const UserList = ({ users = [], followingId = null, onFollow }) => {
  const { user: currentUser } = useAuth()

  const others = users.filter((u) => u.username !== currentUser?.username)
  const everyone = currentUser
    ? [{ socketId: "me", username: currentUser.username, avatarUrl: currentUser.avatarUrl, isMe: true }, ...others]
    : others

  return (
    <div className="p-3">
      <p className="px-1 pb-3 font-mono text-[11px] uppercase tracking-wide text-muted">
        {everyone.length} online
      </p>

      {everyone.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center text-muted">
          <Users size={28} />
          <p className="mt-3 text-sm">No one is online</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {everyone.map((u, i) => (
            <li
              key={u.socketId || i}
              className="flex items-center gap-3 p-2.5 rounded-xl border border-line bg-ink"
            >
              <div className="relative shrink-0">
                <div
                  className={`w-9 h-9 rounded-lg border overflow-hidden flex items-center justify-center text-sm font-bold ${avatarStyle(u.username)}`}
                >
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    u.username?.charAt(0)?.toUpperCase()
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-sync border-2 border-ink" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm font-medium text-fg truncate">
                    {u.username}
                  </p>
                  {u.isMe && (
                    <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-sync/30 bg-sync/10 text-sync">
                      You
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted mt-0.5">Connected</p>
              </div>

              {!u.isMe && onFollow && (
                <button
                  onClick={() => onFollow(u.socketId)}
                  aria-pressed={followingId === u.socketId}
                  className={`shrink-0 h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg border text-[11px] font-medium transition-colors ${followingId === u.socketId
                    ? "border-sync/40 bg-sync/10 text-sync"
                    : "border-line text-muted hover:text-fg hover:border-muted"
                    }`}
                >
                  <Eye size={13} />
                  {followingId === u.socketId ? "Following" : "Follow"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}