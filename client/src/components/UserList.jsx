import { useState } from "react"

import { Menu, X, Users } from "lucide-react"

import { useAuth } from "../context/AuthContext"

export const UserList = ({ users = [] }) => {
  const { user: currentUser } = useAuth()

  const [isOpen, setIsOpen] = useState(false)

  const currentUserEntry = currentUser
    ? {
      socketId: "me",
      username: currentUser.username,
      isMe: true,
    }
    : null

  const otherUsers = users.filter(
    (u) => u.username !== currentUser?.username
  )

  const allUsers = currentUserEntry
    ? [currentUserEntry, ...otherUsers]
    : otherUsers

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="
          md:hidden
          absolute
          top-3 left-3
          z-30
          w-10 h-10
          rounded-xl
          bg-gray-900/90
          backdrop-blur
          border border-gray-700
          flex items-center justify-center
          text-gray-300
        "
      >
        <Menu size={18} />
      </button>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="
            fixed inset-0
            bg-black/60
            backdrop-blur-sm
            z-40
            md:hidden
          "
        />
      )}

      <aside
        className={`
          fixed md:relative
          top-0 left-0
          z-50 md:z-0
          h-full
          w-[280px]
          bg-gray-900
          border-r border-gray-800
          flex flex-col
          transition-transform duration-300
          ${isOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
          }
        `}
      >

        <div className="h-14 px-4 border-b border-gray-800 flex items-center justify-between shrink-0">

          <div className="flex items-center gap-2">

            <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
              <Users size={16} className="text-amber-400" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-white">
                Participants
              </h2>

              <p className="text-xs text-gray-500">
                {allUsers.length} online
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="
              md:hidden
              w-8 h-8
              rounded-lg
              hover:bg-gray-800
              flex items-center justify-center
              text-gray-400
            "
          >
            <X size={18} />
          </button>
        </div>

        <ul className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">

          {allUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center text-gray-600">

              <Users size={32} />

              <p className="mt-3 text-sm">
                No users online
              </p>
            </div>
          )}

          {allUsers.map((u, i) => (
            <li
              key={u.socketId || i}
              className="
                group
                flex items-center gap-3
                p-3
                rounded-2xl
                bg-gray-800/60 
                backdrop-blur-xl
                border border-gray-700
                hover:border-amber-400/30
                hover:-translate-y-0.5
                hover:shadow-lg
                transition-all
              "
            >

              <div className="relative shrink-0">

                <div
                  className="
                    w-10 h-10
                    rounded-xl
                    bg-amber-400/10
                    border border-amber-400/20
                    flex items-center justify-center
                    text-sm font-bold text-amber-400
                  "
                >
                  {u.username?.charAt(0)?.toUpperCase()}
                </div>

                <span
                  className="
                    absolute
                    bottom-0 right-0
                    w-3 h-3
                    rounded-full
                    bg-emerald-400 animate-pulse
                    border-2 border-gray-900
                  "
                />
              </div>

              <div className="flex-1 min-w-0">

                <div className="flex items-center gap-2">

                  <p className="text-sm text-white truncate font-medium  max-w-[160px]">
                    {u.username}
                  </p>

                  {u.isMe && (
                    <span
                      className="
                        text-[10px]
                        px-2 py-0.5
                        rounded-full
                        bg-amber-400/10
                        text-amber-400
                        border border-amber-400/20
                      "
                    >
                      You
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-500 mt-0.5">
                  Connected
                </p>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </>
  )
}





