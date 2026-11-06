import { useState } from "react"
import { Link } from "react-router-dom"
import { Mail } from "lucide-react"
import { authApi } from "../services/api"
import { AuthLayout } from "../components/AuthLayout"
import { AuthField, AuthError, AuthSubmit } from "../components/AuthField"

export const ForgotPassword = () => {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <Link to="/login" className="text-ember hover:underline font-medium">
          Back to login
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm text-muted">
          If an account exists for <span className="text-fg">{email}</span>, a reset link is on its way.
          It expires in 15 minutes. Check spam too.
        </p>
      ) : (
        <>
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
            <AuthSubmit loading={loading} loadingText="Sending...">
              Send reset link
            </AuthSubmit>
          </form>
        </>
      )}
    </AuthLayout>
  )
}