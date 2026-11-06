import { motion } from "framer-motion"

export const Loader = ({ message = "Loading..." }) => {
  const transition = { repeat: Infinity, duration: 1.6, ease: "easeInOut" }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        {/* two collaborators' cursors meeting in the middle */}
        <div className="relative w-28 h-7">
          <motion.span
            className="absolute top-0 h-7 w-[3px] rounded-full bg-ember"
            animate={{ left: ["0%", "46%", "0%"] }}
            transition={transition}
          />
          <motion.span
            className="absolute top-0 h-7 w-[3px] rounded-full bg-sync"
            animate={{ left: ["98%", "52%", "98%"] }}
            transition={transition}
          />
        </div>

        <p className="font-mono text-xs text-muted tracking-wide">
          {message}
        </p>
      </div>
    </div>
  )
}