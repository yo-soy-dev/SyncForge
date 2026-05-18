import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { useAuth } from "../context/AuthContext"
import { toast } from "sonner"
import logo from "../assets/logo.png"

export const Navbar = ({
  showRoomControls = false,
  onRun,
  onSave,
  running = false,
  saving = false,
  showAI,
  onToggleAI,
}) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      toast.success("Logged out successfully")
      navigate("/login")
    } catch {
      toast.error("Failed to logout")
    }
  }

  return (
    <nav className="h-14 bg-[#0f172a] border-b border-gray-800 flex items-center px-3 md:px-5 shrink-0">

      {/* LEFT */}
      <div className="flex items-center min-w-[160px]">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate("/")}
          className="flex items-center gap-2"
        >
          {/* Logo */}
          {/* <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
            <span className="text-lg">⚒️</span>
          </div> */}
          <img
            src={logo}
            alt="SyncForge"
            className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]"
          />

          {/* Brand */}
          <div className="hidden sm:block text-left">
            <h1 className="text-amber-400 font-bold text-sm leading-none">
              SyncForge
            </h1>

            <p className="text-[10px] text-gray-500 mt-1">
              Real-time coding
            </p>
          </div>
        </motion.button>
      </div>

      <div className="flex-1 flex justify-center px-2">
        {showRoomControls && (
          <div className="flex items-center gap-2 flex-wrap justify-center">

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={onRun}
              disabled={running}
              className="
                h-9
                px-3 md:px-4
                rounded-xl
                text-xs font-semibold
                flex items-center gap-2
                bg-green-500/15
                text-green-400
                border border-green-500/30
                hover:bg-green-500/25
                transition-all
                disabled:opacity-50
              "
            >
              {running ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 1,
                      ease: "linear",
                    }}
                  >
                    ⟳
                  </motion.span>

                  <span className="hidden sm:inline">
                    Running
                  </span>
                </>
              ) : (
                <>
                  ▶
                  <span className="hidden sm:inline">
                    Run
                  </span>
                </>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={onSave}
              disabled={saving}
              className="
                h-9
                px-3 md:px-4
                rounded-xl
                text-xs font-semibold
                flex items-center gap-2
                bg-blue-500/15
                text-blue-400
                border border-blue-500/30
                hover:bg-blue-500/25
                transition-all
                disabled:opacity-50
              "
            >
              💾

              <span className="hidden sm:inline">
                {saving ? "Saving..." : "Save"}
              </span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={onToggleAI}
              className={`
                h-9
                px-3 md:px-4
                rounded-xl
                text-xs font-semibold
                flex items-center gap-2
                border transition-all
                ${
                  showAI
                    ? "bg-amber-400/15 text-amber-300 border-amber-400/30"
                    : "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"
                }
              `}
            >
              🤖

              <span className="hidden sm:inline">
                {showAI ? "Hide AI" : "AI Assistant"}
              </span>
            </motion.button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end min-w-[160px] gap-2">

        {user && (
          <>
            <div className="hidden md:flex items-center gap-2 bg-gray-800/60 border border-gray-700 rounded-xl px-2 py-1.5">

              <motion.div
                whileHover={{ scale: 1.08 }}
                className="
                  w-8 h-8 rounded-full
                  bg-amber-400/15
                  border border-amber-400/30
                  flex items-center justify-center
                  text-xs font-bold text-amber-400
                "
              >
                {user.username?.charAt(0)?.toUpperCase()}
              </motion.div>

              <div className="leading-tight">
                <p className="text-xs text-gray-300 max-w-[90px] truncate">
                  @{user.username}
                </p>

                <p className="text-[10px] text-green-400">
                  Online
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="
                h-9
                px-3 md:px-4
                rounded-xl
                text-xs font-medium
                bg-gray-800
                text-gray-300
                border border-gray-700
                hover:bg-red-500
                hover:border-red-500
                hover:text-white
                transition-all
              "
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  )
}