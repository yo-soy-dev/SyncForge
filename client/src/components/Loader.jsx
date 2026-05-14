export const Loader = ({ message = "Loading..." }) => (
  <div className="flex flex-col items-center justify-center h-screen bg-gray-950 gap-4">
    <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
    <p className="text-gray-400 text-sm">{message}</p>
  </div>
)