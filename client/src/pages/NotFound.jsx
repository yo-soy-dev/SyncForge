import { useNavigate } from "react-router-dom"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowLeft, Home } from "lucide-react"
import { useAuth } from "../context/AuthContext"

export const NotFound = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const reduce = useReducedMotion()
  const drift = { repeat: Infinity, repeatType: "reverse", duration: 2.4, ease: "easeInOut" }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">
        {/* two cursors that never quite reach the page */}
        <div className="relative inline-block px-8">
          <motion.span
            className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-ember"
            animate={reduce ? undefined : { x: [0, 10] }}
            transition={drift}
          />
          <h1 className="font-mono text-7xl sm:text-9xl font-bold tracking-tight text-fg select-none">
            404
          </h1>
          <motion.span
            className="absolute top-2 bottom-2 right-0 w-[3px] rounded-full bg-sync"
            animate={reduce ? undefined : { x: [0, -10] }}
            transition={drift}
          />
        </div>

        <h2 className="mt-6 font-display text-2xl sm:text-3xl font-bold text-fg">
          This page doesn't exist
        </h2>
        <p className="mt-3 text-sm sm:text-base text-muted max-w-md mx-auto leading-relaxed">
          The link may be wrong, or the page may have moved.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto h-11 px-5 inline-flex items-center justify-center gap-2 rounded-lg border border-line text-fg text-sm font-medium hover:border-muted transition-colors"
          >
            <ArrowLeft size={16} />
            Go back
          </button>

          <button
            onClick={() => navigate(user ? "/dashboard" : "/")}
            className="w-full sm:w-auto h-11 px-5 inline-flex items-center justify-center gap-2 rounded-lg bg-ember text-ink text-sm font-semibold hover:brightness-110 transition"
          >
            <Home size={16} />
            {user ? "Back to dashboard" : "Back to home"}
          </button>
        </div>
      </div>
    </div>
  )
}