import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "../context/AuthContext"
import logo from "../assets/logo.png"

export const Login = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await login(email, password)
      toast.success("Login successful")
      navigate("/")
    } catch (err) {
      setError(err.message)
      toast.error(err.message || "Failed to login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-hidden flex items-center justify-center px-4 sm:px-6 py-10">

      <div className="absolute top-[-100px] left-[-100px] w-[250px] sm:w-[300px] h-[250px] sm:h-[300px] bg-amber-400/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[250px] sm:w-[300px] h-[250px] sm:h-[300px] bg-blue-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md">

        <div className="text-center mb-8">

          <img
            src={logo}
            alt="SyncForge"
            className="w-20 sm:w-24 mx-auto mb-4 drop-shadow-[0_0_20px_rgba(251,191,36,0.3)]"
          />

          {/* <div className="inline-flex items-center justify-center w-14 sm:w-16 h-14 sm:h-16 rounded-3xl bg-amber-400/10 border border-amber-400/20 mb-5">
            <Sparkles size={26} className="text-amber-400" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Sync<span className="text-amber-400">Forge</span>
          </h1> */}

          <p className="text-gray-500 text-xs sm:text-sm mt-3">
            Real-time collaborative coding platform
          </p>
        </div>

        <div className="bg-gray-900/90 backdrop-blur-xl border border-gray-800 rounded-3xl p-5 sm:p-8 shadow-2xl">

          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Welcome Back
            </h2>
            <p className="text-gray-500 text-sm mt-2">
              Sign in to continue collaborating
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-2xl border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Email Address
              </label>

              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  required
                  className="w-full bg-gray-800 text-white rounded-2xl border border-gray-700 py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-amber-400 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Password
              </label>

              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-gray-800 text-white rounded-2xl border border-gray-700 py-3 pl-12 pr-12 text-sm focus:outline-none focus:border-amber-400 transition-all"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-gray-950 font-semibold py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Login
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="text-amber-400 hover:text-amber-300 font-medium transition">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}