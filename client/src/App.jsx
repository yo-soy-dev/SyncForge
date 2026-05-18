import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { Login } from "./pages/Login"
import { Signup } from "./pages/Signup"
import { Home } from "./pages/Home"
import { Room } from "./pages/Room"
import { NotFound } from "./pages/NotFound"
import { Loader } from "./components/Loader"
import { Toaster } from "sonner"

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) {
    return <Loader />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) {
    return <Loader />
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return children
}

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={
      <PublicRoute><Login /></PublicRoute>
    } />
    <Route path="/signup" element={
      <PublicRoute><Signup /></PublicRoute>
    } />
    <Route path="/" element={
      <ProtectedRoute><Home /></ProtectedRoute>
    } />
    <Route path="/room/:roomId" element={
      <ProtectedRoute><Room /></ProtectedRoute>
    } />
    <Route path="*" element={<NotFound />} />
  </Routes>
)

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          theme="dark"
          expand
          visibleToasts={4}
          toastOptions={{
            style: {
              background: "#111827",
              border: "1px solid #374151",
              color: "#fff",
            },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}