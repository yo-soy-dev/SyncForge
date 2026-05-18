import { Loader2 } from "lucide-react"

export const Loader = ({ message = "Loading..." }) => {
  return (
    <div
      className="
        min-h-screen
        bg-gray-950
        relative
        overflow-hidden
        flex items-center justify-center
        px-4
      "
    >
      <div className="absolute top-[-100px] left-[-100px] w-[200px] sm:w-[280px] h-[200px] sm:h-[280px] bg-amber-400/10 rounded-full blur-3xl" />

      <div className="absolute bottom-[-100px] right-[-100px] w-[200px] sm:w-[280px] h-[200px] sm:h-[280px] bg-orange-500/10 rounded-full blur-3xl" />

      <div
        className="
          relative z-10
          flex flex-col items-center gap-4 sm:gap-5
          px-6 sm:px-8 py-8 sm:py-10
          rounded-3xl
          border border-gray-800
          bg-gray-900/80
          backdrop-blur-xl
          shadow-2xl
          w-full max-w-[300px] sm:max-w-sm
        "
      >
        <div className="relative flex items-center justify-center">
          <div className="absolute w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-amber-400/10 blur-xl" />

          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border border-amber-400/20 bg-amber-400/10 flex items-center justify-center">
            <Loader2
              size={24}
              className="sm:w-[28px] sm:h-[28px] text-amber-400 animate-spin"
            />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-white font-semibold text-base sm:text-lg">
            Please wait
          </h2>

          <p className="mt-1 text-xs sm:text-sm text-gray-400 max-w-xs leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}