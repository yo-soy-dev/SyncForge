import { useEffect, useState } from "react"
import { Modal } from "./Modal"

const INVALID = /[\\/]/

export const SaveFileModal = ({ open, defaultName, onClose, onSave }) => {
  const [name, setName] = useState(defaultName)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setName(defaultName)
      setError("")
    }
  }, [open, defaultName])

  const submit = (e) => {
    e.preventDefault()
    const value = name.trim()
    if (!value) return setError("Enter a file name")
    if (INVALID.test(value)) return setError("File names can't contain / or \\")
    onSave(value)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Save file"
      description="Saved files appear in the Files tab of the sidebar."
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="file-name" className="block text-xs text-muted mb-2">
            File name
          </label>
          <input
            id="file-name"
            value={name}
            autoFocus
            maxLength={60}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              setName(e.target.value)
              setError("")
            }}
            className="w-full min-w-0 h-11 bg-ink border border-line rounded-lg px-3 font-mono text-sm text-fg focus:border-ember focus:outline-none transition-colors"
          />
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-lg border border-line text-fg text-sm font-medium hover:border-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 h-11 rounded-lg bg-ember text-ink text-sm font-semibold hover:brightness-110 transition"
          >
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}