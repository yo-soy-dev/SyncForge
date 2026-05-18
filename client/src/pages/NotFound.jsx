import { useNavigate } from "react-router-dom"
import { Home, ArrowLeft, AlertTriangle } from "lucide-react"

export const NotFound = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-hidden flex items-center justify-center px-4 sm:px-6">

      {/* Background Blobs */}
      <div className="absolute top-[-100px] left-[-100px] w-[220px] sm:w-[300px] h-[220px] sm:h-[300px] bg-amber-400/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[220px] sm:w-[300px] h-[220px] sm:h-[300px] bg-red-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-lg text-center">

        {/* Icon */}
        <div className="mx-auto mb-6 w-20 sm:w-24 h-20 sm:h-24 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle size={36} className="text-red-400 sm:w-[40px] sm:h-[40px]" />
        </div>

        {/* 404 Text */}
        <h1 className="text-6xl sm:text-8xl font-black tracking-tight text-white">
          4<span className="text-amber-400">0</span>4
        </h1>

        <h2 className="mt-4 sm:mt-5 text-xl sm:text-3xl font-bold text-white">
          Page Not Found
        </h2>

        <p className="mt-3 sm:mt-4 text-gray-500 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
          The page you’re looking for doesn’t exist or may have been moved.
        </p>

        {/* Buttons */}
        <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">

          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium transition-all"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>

          <button
            onClick={() => navigate("/")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-gray-950 font-semibold transition-all"
          >
            <Home size={18} />
            Back to Home
          </button>
        </div>

      </div>
    </div>
  )
}