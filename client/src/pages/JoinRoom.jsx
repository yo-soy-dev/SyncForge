import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { AlertTriangle, ArrowRight } from "lucide-react"
import { roomApi } from "../services/api"
import { Loader } from "../components/Loader"
import { Navbar } from "../components/Navbar"

export const JoinRoom = () => {
  const { code = "" } = useParams()
  const navigate = useNavigate()
  const started = useRef(false) // stops React StrictMode from joining twice
  const [error, setError] = useState("")

  useEffect(() => {
    if (started.current) return
    started.current = true

    const join = async () => {
      try {
        const data = await roomApi.join(code.toUpperCase())
        navigate(`/room/${data.room._id}`, { replace: true })
      } catch (err) {
        setError(
          err.response?.data?.message || err.message || "Could not join this room",
        )
      }
    }
    join()
  }, [code, navigate])

  if (!error) return <Loader message={`Joining room ${code.toUpperCase()}...`} />

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 mx-auto mb-5 rounded-xl border border-red-500/30 bg-red-500/10 flex items-center justify-center">
            <AlertTriangle size={22} className="text-red-400" />
          </div>

          <h1 className="font-display text-2xl font-bold text-fg">
            Couldn't join this room
          </h1>
          <p className="mt-2 text-sm text-muted">{error}</p>
          <p className="mt-4 inline-block font-mono text-xs tracking-[0.2em] text-muted border border-line rounded-md px-3 py-1.5">
            {code.toUpperCase()}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              to="/dashboard"
              className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-ember text-ink text-sm font-semibold hover:brightness-110 transition"
            >
              Go to dashboard
              <ArrowRight size={16} />
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 h-11 rounded-lg border border-line text-fg text-sm font-medium hover:border-muted transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}