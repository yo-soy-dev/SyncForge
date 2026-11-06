import { useEffect, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

/* Centered dialog on desktop, bottom sheet on mobile. Closes on Esc and backdrop click. */
export const Modal = ({ open, onClose, title, description, size = "md", children }) => {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === "Escape" && onClose?.()
    window.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  const dialogRef = useRef(null)

  // Keep Tab inside the dialog, and give focus back to what opened it.
  useEffect(() => {
    if (!open) return
    const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    const previous = document.activeElement
    const el = dialogRef.current
    if (el && !el.contains(document.activeElement)) (el.querySelector(FOCUSABLE) || el).focus()

    const onTab = (e) => {
      if (e.key !== "Tab" || !el) return
      const items = [...el.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null)
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener("keydown", onTab)
    return () => {
      document.removeEventListener("keydown", onTab)
      previous?.focus?.()
    }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div
            className="absolute inset-0 bg-black/70"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className={`relative w-full ${
              size === "lg" ? "sm:max-w-4xl" : "sm:max-w-md"
            } max-h-[90dvh] overflow-y-auto bg-surface border border-line rounded-t-2xl sm:rounded-2xl p-5 sm:p-6`}
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold text-fg">
                  {title}
                </h2>
                {description && (
                  <p className="mt-1 text-sm text-muted leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 w-8 h-8 rounded-lg border border-line text-muted hover:text-fg hover:border-muted flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}