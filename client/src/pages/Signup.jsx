import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export const Signup = () => {
  const [form, setForm] = useState({ username: "", email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  const handleChange = e =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    console.log("FORM SUBMITTED")
    setError("")
    setLoading(true)

    try {
      await signup(form.username, form.email, form.password)
      navigate("/")
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-amber-400 text-center mb-8">
          SyncForge
        </h1>

        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <h2 className="text-white text-xl font-semibold mb-6">Signup</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {[
              { name: "username", label: "Username", type: "text",     placeholder: "alice" },
              { name: "email",    label: "Email",    type: "email",    placeholder: "alice@example.com" },
              { name: "password", label: "Password", type: "password", placeholder: "••••••••" },
            ].map(field => (
              <div key={field.name}>
                <label className="text-gray-400 text-sm mb-1.5 block">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  name={field.name}
                  value={form[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  required
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 text-sm border border-gray-700 focus:border-amber-400 focus:outline-none transition"
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 py-2.5 rounded-lg bg-amber-400 text-gray-950 font-bold text-sm hover:bg-amber-300 disabled:opacity-50 transition"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-gray-500 text-sm text-center mt-4">
            Already account hai?{" "}
            <Link to="/login" className="text-amber-400 hover:underline">
              Login karo
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}