import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { LogOut } from "lucide-react"
import { toast } from "sonner"
import { Navbar } from "../components/Navbar"
import { useAuth } from "../context/AuthContext"
import { authApi } from "../services/api"
import { LANGUAGES, LANGUAGE_COLORS } from "../utils/constants"
import { getPreferences, savePreferences } from "../utils/preferences"

const FONT_SIZES = [12, 14, 16, 18]

const Section = ({ title, description, children }) => (
  <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
    <h2 className="font-display text-lg font-semibold text-fg">{title}</h2>
    {description && <p className="mt-1 text-sm text-muted">{description}</p>}
    <div className="mt-5">{children}</div>
  </section>
)

export const Settings = () => {
  const { user, logout, updateUser } = useAuth()
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return toast.error("Image must be under 2MB")

    setUploading(true)
    try {
      const data = await authApi.uploadAvatar(file)
      updateUser({ avatarUrl: data.user.avatarUrl })
      toast.success("Profile photo updated")
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }
  const navigate = useNavigate()
  const [prefs, setPrefs] = useState(getPreferences)

  const update = (patch) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    savePreferences(next)
  }

  const handleLogout = async () => {
    await logout()
    toast.success("Logged out successfully")
    navigate("/login")
  }

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      <Navbar />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-5">
        <header className="mb-3">
          <p className="font-mono text-xs text-sync tracking-wide mb-2">● SETTINGS</p>
          <h1 className="font-display text-3xl font-bold text-fg">Preferences</h1>
          <p className="mt-2 text-sm text-muted">
            Editor and room preferences are saved on this device.
          </p>
        </header>

        {/* ACCOUNT */}
        <Section title="Account">
          <div className="flex items-center gap-4 min-w-0">
            <div className="shrink-0 flex flex-col items-center gap-1">
              <div className="w-12 h-12 overflow-hidden rounded-full bg-ember/15 border border-ember/30 flex items-center justify-center font-display text-lg font-bold text-ember">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  user?.username?.charAt(0)?.toUpperCase()
                )}
              </div>
              {!user?.isGuest && (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatar}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="text-[11px] text-muted hover:text-ember disabled:opacity-60 transition-colors"
                  >
                    {uploading ? "Uploading..." : "Change"}
                  </button>
                </>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-fg truncate">{user?.username}</p>
              {user?.email && (
                <p className="text-sm text-muted truncate">{user.email}</p>
              )}
            </div>
          </div>
        </Section>

        {/* EDITOR */}
        <Section title="Editor" description="How the code editor looks and behaves.">
          <div className="space-y-6">
            <div>
              <p className="text-xs text-muted mb-2">Font size</p>
              <div role="radiogroup" className="inline-flex p-1 bg-ink border border-line rounded-lg">
                {FONT_SIZES.map((size) => (
                  <button
                    key={size}
                    role="radio"
                    aria-checked={prefs.fontSize === size}
                    onClick={() => update({ fontSize: size })}
                    className={`w-12 h-9 rounded-md font-mono text-xs transition-colors ${prefs.fontSize === size
                        ? "bg-surface text-ember border border-line"
                        : "text-muted hover:text-fg border border-transparent"
                      }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-fg">Word wrap</p>
                <p className="text-xs text-muted">Wrap long lines instead of scrolling sideways.</p>
              </div>
              <button
                role="switch"
                aria-checked={prefs.wordWrap}
                aria-label="Word wrap"
                onClick={() => update({ wordWrap: !prefs.wordWrap })}
                className={`relative shrink-0 w-11 h-6 rounded-full border transition-colors ${prefs.wordWrap ? "bg-ember border-ember" : "bg-ink border-line"
                  }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-fg transition-transform ${prefs.wordWrap ? "translate-x-5" : ""
                    }`}
                />
              </button>
            </div>

            <div>
              <p className="text-xs text-muted mb-2">Preview</p>
              <pre
                className={`rounded-lg border border-line bg-ink p-4 font-mono text-fg ${prefs.wordWrap ? "whitespace-pre-wrap break-words" : "overflow-x-auto"
                  }`}
                style={{ fontSize: prefs.fontSize }}
              >
                <span className="text-ember">const </span>
                greet = (name) =&gt; `Hello, ${"${name}"}! Welcome to Coduet, where two people can edit the same line.`
              </pre>
            </div>
          </div>
        </Section>

        {/* NEW ROOMS */}
        <Section title="New rooms" description="Language preselected when you create a room.">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                onClick={() => update({ defaultLanguage: lang })}
                aria-pressed={prefs.defaultLanguage === lang}
                className={`flex items-center gap-2 px-3 h-10 rounded-lg border font-mono text-xs capitalize transition-colors ${prefs.defaultLanguage === lang
                    ? "border-ember bg-ember/10 text-fg"
                    : "border-line text-muted hover:border-muted"
                  }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: LANGUAGE_COLORS[lang] || "#8b8f9a" }}
                />
                {lang}
              </button>
            ))}
          </div>
        </Section>

        {/* SESSION */}
        <Section title="Session">
          <button
            onClick={handleLogout}
            className="h-10 px-4 inline-flex items-center gap-2 rounded-lg border border-line text-sm text-fg hover:border-red-500/40 hover:text-red-400 transition-colors"
          >
            <LogOut size={15} />
            Log out
          </button>
        </Section>
      </main>
    </div>
  )
}