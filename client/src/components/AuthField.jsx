import { useId, useState } from "react"
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react"

export const AuthField = ({
  label,
  icon: Icon,
  type = "text",
  name,
  value,
  onChange,
  placeholder,
  autoComplete,
  required = true,
}) => {
  const id = useId()
  const [show, setShow] = useState(false)
  const isPassword = type === "password"

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-muted mb-2">
        {label}
      </label>

      <div className="relative">
        <Icon
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
        />
        <input
          id={id}
          name={name}
          type={isPassword && show ? "text" : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className="w-full min-w-0 h-11 bg-ink border border-line rounded-lg pl-10 pr-10 text-sm text-fg placeholder:text-muted focus:border-ember focus:outline-none transition-colors"
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md text-muted hover:text-fg transition-colors"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  )
}

export const AuthError = ({ children }) => (
  <div
    role="alert"
    className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300"
  >
    {children}
  </div>
)

export const AuthSubmit = ({ loading, loadingText, children }) => (
  <button
    type="submit"
    disabled={loading}
    className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-ember text-ink text-sm font-semibold hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition"
  >
    {loading ? (
      <>
        <Loader2 size={16} className="animate-spin" />
        {loadingText}
      </>
    ) : (
      <>
        {children}
        <ArrowRight size={16} />
      </>
    )}
  </button>
)