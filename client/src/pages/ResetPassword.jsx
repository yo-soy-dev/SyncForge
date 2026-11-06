import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Lock } from "lucide-react"
import { toast } from "sonner"
import { authApi } from "../services/api"
import { AuthLayout } from "../components/AuthLayout"
import { AuthField, AuthError, AuthSubmit } from "../components/AuthField"

export const ResetPassword = () => {
  const [params] = useSearchParams()
  const token = params.get("token") || ""
  const navigate = useNavigate()

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    if (password.length < 6) return setError("Password must be at least 6 characters long")
    if (password !== confirm) return setError("Passwords do not match")

    setLoading(true)
    try {
      await authApi.resetPassword(token, password)
      toast.success("Password updated. Please log in.")
      navigate("/login", { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || "Could not reset password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a strong password you haven't used before."
      footer={
        <Link to="/login" className="text-ember hover:underline font-medium">
          Back to login
        </Link>
      }
    >
      {!token ? (
        <AuthError>This reset link is invalid. Please request a new one.</AuthError>
      ) : (
        <>
          {error && <AuthError>{error}</AuthError>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <AuthField
              label="New password"
              icon={Lock}
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
            <AuthField
              label="Confirm password"
              icon={Lock}
              type="password"
              name="confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              autoComplete="new-password"
            />
            <AuthSubmit loading={loading} loadingText="Updating...">
              Update password
            </AuthSubmit>
          </form>
        </>
      )}
    </AuthLayout>
  )
}