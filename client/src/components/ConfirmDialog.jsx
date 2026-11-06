import { Modal } from "./Modal"

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) => (
  <Modal open={open} onClose={onCancel} title={title} description={description}>
    <div className="flex gap-3">
      <button
        onClick={onCancel}
        className="flex-1 h-11 rounded-lg border border-line text-fg text-sm font-medium hover:border-muted transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        disabled={loading}
        className={`flex-1 h-11 rounded-lg text-sm font-semibold transition disabled:opacity-60 ${
          danger
            ? "bg-red-500 text-white hover:bg-red-400"
            : "bg-ember text-ink hover:brightness-110"
        }`}
      >
        {loading ? "Please wait..." : confirmLabel}
      </button>
    </div>
  </Modal>
)