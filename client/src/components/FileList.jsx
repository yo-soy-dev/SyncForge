import { motion, AnimatePresence } from "framer-motion"
import { FileCode2, FolderOpen } from "lucide-react"
import { LANGUAGE_COLORS } from "../utils/constants"

export const FileList = ({ files = [], onLoad, currentFile }) => (
  <div className="flex flex-col gap-1 p-3 w-full min-w-0 overflow-x-hidden">
    <p className="sticky top-0 z-10 bg-surface px-1 py-2 font-mono text-[11px] uppercase tracking-wide text-muted">
      Saved files
    </p>

    {files.length === 0 ? (
      <div className="flex flex-col items-center py-10 text-center text-muted">
        <FolderOpen size={28} />
        <p className="mt-3 text-sm">No files saved yet</p>
        <p className="mt-1 text-xs">
          Press <kbd className="text-fg">Ctrl</kbd>+<kbd className="text-fg">S</kbd> to save
        </p>
      </div>
    ) : (
      <AnimatePresence>
        {files.map((file, i) => {
          const active = currentFile === file.filename

          return (
            <motion.button
              key={file._id || file.filename}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ delay: Math.min(i, 8) * 0.03 }}
              onClick={() => onLoad(file)}
              className={`w-full text-left px-3 h-10 rounded-lg border text-sm flex items-center gap-2.5 transition-colors touch-manipulation ${
                active
                  ? "bg-ember/10 border-ember/30 text-fg"
                  : "border-transparent text-muted hover:bg-ink hover:text-fg"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: LANGUAGE_COLORS[file.language] || "#8b8f9a" }}
              />
              <span className="truncate flex-1 min-w-0 font-mono text-xs">
                {file.filename}
              </span>
              {active && <FileCode2 size={14} className="shrink-0 text-ember" />}
            </motion.button>
          )
        })}
      </AnimatePresence>
    )}
  </div>
)