import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { Login } from "./pages/Login"
import { Signup } from "./pages/Signup"
import { ForgotPassword } from "./pages/ForgotPassword"
import { ResetPassword } from "./pages/ResetPassword"
import { Home } from "./pages/Home"
import { Room } from "./pages/Room"
import { NotFound } from "./pages/NotFound"
import { Landing } from "./pages/Landing"
import { JoinRoom } from "./pages/JoinRoom"
import { Settings } from "./pages/Settings"
import { Problems } from "./pages/Problems"
import { Interviews } from "./pages/Interviews"
import { Replay } from "./pages/Replay"
import { CommandPalette } from "./components/CommandPalette"
import { Loader } from "./components/Loader"
import { Toaster } from "sonner"
import { useEffect, useRef } from "react"

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()


  if (loading) {
    return <Loader />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <Loader />
  }

  if (user) {
    const from = location.state?.from?.pathname
    const target = from?.startsWith("/join/") ? from : "/dashboard"
    return <Navigate to={target} replace />
  }

  return children
}


// Tells MetricNest who is logged in, so visitors are counted per PERSON, not per browser.
const MetricNestIdentity = () => {
  const { user, loading } = useAuth()
  const userId = user ? String(user._id ?? user.id ?? "") : ""
  const wasLoggedIn = useRef(false)

  useEffect(() => {
    if (loading) return

    if (userId) {
      window.metricnest?.identify?.(userId)
      wasLoggedIn.current = true
    } else if (wasLoggedIn.current) {
      // user logged out (or session expired)
      window.metricnest?.reset?.()
      wasLoggedIn.current = false
    }
  }, [userId, loading])

  return null
}

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={
      <PublicRoute><Login /></PublicRoute>
    } />
    <Route path="/signup" element={
      <PublicRoute><Signup /></PublicRoute>
    } />
    <Route path="/forgot-password" element={
      <PublicRoute><ForgotPassword /></PublicRoute>
    } />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/" element={<Landing />} />
    <Route path="/dashboard" element={
      <ProtectedRoute><Home /></ProtectedRoute>
    } />
    <Route path="/join/:code" element={
      <ProtectedRoute><JoinRoom /></ProtectedRoute>
    } />
    <Route path="/interviews" element={
      <ProtectedRoute><Interviews /></ProtectedRoute>
    } />
    <Route path="/problems" element={
      <ProtectedRoute><Problems /></ProtectedRoute>
    } />
    <Route path="/settings" element={
      <ProtectedRoute><Settings /></ProtectedRoute>
    } />
    <Route path="/room/:roomId/replay" element={
      <ProtectedRoute><Replay /></ProtectedRoute>
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
              background: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              color: "var(--color-fg)",
              fontFamily: "var(--font-sans)",
            },
          }}
        />
        <MetricNestIdentity />
        <AppRoutes />
        <CommandPalette />
      </AuthProvider>
    </BrowserRouter>
  )
}