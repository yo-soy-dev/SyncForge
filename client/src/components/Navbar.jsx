import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export const Navbar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  return (
    <nav className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
      <span
        onClick={() => navigate("/")}
        className="text-amber-400 font-bold text-lg cursor-pointer"
      >
        SyncForge
      </span>

      {user && (
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">
            @{user.username}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  )
}