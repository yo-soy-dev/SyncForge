import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Play, Save, Sparkles, LogOut, Loader2, Settings, Mic, Search, BookOpen } from "lucide-react"
import { openCommandPalette, shortcutLabel } from "./CommandPalette"
import { LogoMark } from "./LogoMark";
import { useAuth } from "../context/AuthContext"
import { toast } from "sonner"
// import logo from "../assets/logo.png"

const base =
  "h-9 px-3 md:px-4 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"

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
      toast.error("Failed to log out")
    }
  }

  return (
    <nav className="h-14 bg-ink border-b border-line flex items-center gap-2 px-2 sm:px-4 md:px-5 shrink-0 min-w-0">
      {/* LEFT: brand */}
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-2.5 shrink-0 rounded-lg"
        aria-label="Coduet home"
      >
        {/* <img src={logo} alt="" className="w-8 h-8 object-contain" /> */}
        <LogoMark />
        <span className="hidden sm:block font-display text-[17px] font-bold tracking-tight text-fg">
          Co<span className="text-ember">duet</span>
        </span>
      </button>

      {/* CENTER: room actions */}
      <div className="flex-1 min-w-0 flex justify-center">
        {showRoomControls && (
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onRun}
              disabled={running}
              className={`${base} bg-ember text-ink border-ember hover:brightness-110`}
            >
              {running ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Play size={15} fill="currentColor" />
              )}
              <span className="hidden sm:inline">
                {running ? "Running" : "Run"}
              </span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onSave}
              disabled={saving}
              className={`${base} bg-surface text-fg border-line hover:border-muted`}
            >
              <Save size={15} />
              <span className="hidden sm:inline">
                {saving ? "Saving..." : "Save"}
              </span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onToggleAI}
              className={`${base} ${showAI
                ? "bg-ai/15 text-ai border-ai/40"
                : "bg-surface text-fg border-line hover:border-ai/50 hover:text-ai"
                }`}
            >
              <Sparkles size={15} />
              <span className="hidden sm:inline">
                {showAI ? "Hide AI" : "AI Assistant"}
              </span>
            </motion.button>
          </div>
        )}
      </div>

      {/* RIGHT: user */}
      {user && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate("/problems")}
            className="hidden md:inline-flex h-9 px-3 items-center gap-2 rounded-lg text-xs font-medium text-muted hover:text-fg transition-colors"
          >
            <BookOpen size={15} />
            Problems
          </button>
          <button
            onClick={() => navigate("/interviews")}
            className="hidden md:inline-flex h-9 px-3 items-center gap-2 rounded-lg text-xs font-medium text-muted hover:text-fg transition-colors"
          >
            <Mic size={15} />
            Interviews
          </button>
          <div className="hidden md:flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full border border-line bg-surface">
            <div className="relative w-7 h-7 rounded-full bg-ember/15 border border-ember/30 flex items-center justify-center text-xs font-bold text-ember">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full rounded-full object-cover"
                />
              ) : (
                user.username?.charAt(0)?.toUpperCase()
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-sync border-2 border-surface" />
            </div>
            <span className="text-xs text-fg max-w-[100px] truncate">
              {user.username}
            </span>
          </div>

          <button
            onClick={openCommandPalette}
            aria-label="Open command palette"
            title={`Command palette (${shortcutLabel})`}
            className="h-9 px-2.5 lg:px-3 rounded-lg inline-flex items-center gap-2 bg-surface text-muted border border-line hover:text-fg hover:border-muted transition-colors"
          >
            <Search size={15} />
            <kbd className="hidden lg:inline font-mono text-[11px]">{shortcutLabel}</kbd>
          </button>

          <button
            onClick={() => navigate("/settings")}
            aria-label="Settings"
            title="Settings"
            className="max-sm:hidden h-9 w-9 rounded-lg flex items-center justify-center bg-surface text-muted border border-line hover:text-fg hover:border-muted transition-colors"
          >
            <Settings size={15} />
          </button>

          <button
            onClick={handleLogout}
            aria-label="Log out"
            className="h-9 w-9 sm:w-auto sm:px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-medium bg-surface text-muted border border-line hover:text-fg hover:border-muted transition-colors"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      )}
    </nav>
  )
}