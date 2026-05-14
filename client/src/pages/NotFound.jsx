import { useNavigate } from "react-router-dom"

export const NotFound = () => {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
      <p className="text-6xl">404</p>
      <p className="text-gray-400">Ye page nahi mila bhai</p>
      <button
        onClick={() => navigate("/")}
        className="mt-2 text-amber-400 hover:underline text-sm"
      >
        Ghar wapas jao
      </button>
    </div>
  )
}