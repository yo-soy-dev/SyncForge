// export const UserList = ({ users = [] }) => (
//   <aside className="h-full w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
//     <div className="p-4 border-b border-gray-800">
//       <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
//         Online — {users.length}
//       </h2>
//     </div>

//     <ul className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
//       {users.length === 0 ? (
//         <li className="text-gray-600 text-sm text-center mt-4">
//           Sirf tum ho abhi
//         </li>
//       ) : (
//         users.map((user, i) => (
//           <li
//             key={user.socketId || i}
//             className="flex items-center gap-2 p-2 rounded-lg bg-gray-800"
//           >
//             {/* Online dot */}
//             <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
//             <span className="text-white text-sm truncate">
//               {user.username}
//             </span>
//           </li>
//         ))
//       )}
//     </ul>
//   </aside>
// )









import { useAuth } from "../context/AuthContext"

export const UserList = ({ users = [] }) => {
  const { user: currentUser } = useAuth()

  // Always show current user at top, then others
  const currentUserEntry = currentUser
    ? { socketId: "me", username: currentUser.username, isMe: true }
    : null

  const otherUsers = users.filter(u => u.username !== currentUser?.username)

  const allUsers = currentUserEntry ? [currentUserEntry, ...otherUsers] : otherUsers

  return (
    <aside className="h-full w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Online — {allUsers.length}
        </h2>
      </div>

      <ul className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {allUsers.map((u, i) => (
          <li
            key={u.socketId || i}
            className="flex items-center gap-2 p-2 rounded-lg bg-gray-800"
          >
            <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
            <span className="text-white text-sm truncate">
              {u.username}
              {u.isMe && (
                <span className="ml-1 text-xs text-gray-500">(you)</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  )
}