import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { User, Mail, Lock } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "../context/AuthContext"
import { AuthLayout } from "../components/AuthLayout"
import { AuthField, AuthError, AuthSubmit } from "../components/AuthField"

export const Signup = () => {
  const [form, setForm] = useState({ username: "", email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const { signup } = useAuth()
  const location = useLocation()

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await signup(form.username, form.email, form.password)
      toast.success("Account created successfully")

    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Signup failed"
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start coding with your team in seconds."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" state={location.state} className="text-ember hover:underline font-medium">
            Log in
          </Link>
        </>
      }
    >
      {error && <AuthError>{error}</AuthError>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthField
          label="Username"
          icon={User}
          name="username"
          value={form.username}
          onChange={handleChange}
          placeholder="alexdev"
          autoComplete="username"
        />

        <AuthField
          label="Email"
          icon={Mail}
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="alex@example.com"
          autoComplete="email"
        />

        <AuthField
          label="Password"
          icon={Lock}
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Create a password"
          autoComplete="new-password"
        />

        <AuthSubmit loading={loading} loadingText="Creating account...">
          Create account
        </AuthSubmit>
      </form>
    </AuthLayout>
  )
}