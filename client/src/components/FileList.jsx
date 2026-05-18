import { motion, AnimatePresence } from "framer-motion"

const getIcon = (lang) => {
  switch (lang) {
    case "python": return "🐍"
    case "javascript": return "📜"
    case "java": return "☕"
    case "cpp": return "⚙️"
    case "go": return "🐹"
    default: return "📄"
  }
}

export const FileList = ({ files = [], onLoad, currentFile }) => (
  <div className="flex flex-col gap-1 p-2 sm:p-3 w-full max-h-[300px] overflow-y-auto pb-4">

    {/* Header */}
    <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider px-2 mb-1 sticky top-0 bg-black z-10 py-2">
      Saved Files
    </p>

    {/* Empty state */}
    {files.length === 0 ? (
      <p className="text-xs sm:text-sm text-gray-400 px-2 py-4 text-center">
        No files saved yet
      </p>
    ) : (
      <AnimatePresence>
        {files.map((file, i) => (
          <motion.button
            key={file._id || file.filename}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => onLoad(file)}
            className={`
              w-full text-left px-3 py-2 sm:py-2.5 rounded-lg
              text-xs sm:text-sm
              flex items-center gap-2
              transition active:scale-[0.98]
              touch-manipulation
              ${
                currentFile === file.filename
                  ? "bg-amber-400/20 text-amber-300"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              }
            `}
          >
            {/* Icon */}
            <span className="text-lg">
              {getIcon(file.language)}
            </span>

            {/* Filename */}
            <span className="truncate flex-1 min-w-0">
              {file.filename}
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
    )}
  </div>
)