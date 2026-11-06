import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Mail, Lock } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "../context/AuthContext"
import { AuthLayout } from "../components/AuthLayout"
import { AuthField, AuthError, AuthSubmit } from "../components/AuthField"

export const Login = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const { login, guestLogin } = useAuth()
  const [guestLoading, setGuestLoading] = useState(false)
  const location = useLocation()



  const handleGuest = async () => {
    setError("")
    setGuestLoading(true)
    try {
      await guestLogin()
      toast.success("Welcome! This guest session lasts 24 hours")
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not start a guest session")
    } finally {
      setGuestLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await login(email, password)
      toast.success("Login successful")

    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to login"
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue to your rooms."
      footer={
        <>
          New to Coduet?{" "}
          <Link to="/signup" state={location.state} className="text-ember hover:underline font-medium">
            Create an account
          </Link>
        </>
      }
    >
      {error && <AuthError>{error}</AuthError>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthField
          label="Email"
          icon={Mail}
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="alex@example.com"
          autoComplete="email"
        />

        <AuthField
          label="Password"
          icon={Lock}
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          autoComplete="current-password"
        />

        <div className="text-right -mt-2">
          <Link to="/forgot-password" className="text-xs text-muted hover:text-ember transition-colors">
            Forgot password?
          </Link>
        </div>

        <AuthSubmit loading={loading} loadingText="Signing in...">
          Log in
        </AuthSubmit>
      </form>
      <div className="mt-6">
        <div className="flex items-center gap-3">
          <span className="flex-1 h-px bg-line" />
          <span className="text-xs text-muted">or</span>
          <span className="flex-1 h-px bg-line" />
        </div>
        <button
          type="button"
          onClick={handleGuest}
          disabled={guestLoading}
          className="mt-6 w-full h-11 rounded-lg border border-line text-fg text-sm font-medium hover:border-ember/50 disabled:opacity-60 transition-colors"
        >
          {guestLoading ? "Starting demo..." : "Try the demo as a guest"}
        </button>
        <p className="mt-2 text-center text-[11px] text-muted">No signup. Guest sessions last 24 hours.</p>
      </div>
    </AuthLayout>
  )
}