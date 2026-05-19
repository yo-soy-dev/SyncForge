import { createContext, useContext, useState, useEffect } from "react"
import { authApi } from "../services/api"
import { connectSocket, disconnectSocket } from "../services/socket"

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const savedUser = localStorage.getItem("user")

    if (token && savedUser) {
      const parsedUser = JSON.parse(savedUser)
      setUser(parsedUser)
      connectSocket(parsedUser.id, parsedUser.username)
    }

    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const data = await authApi.login({ email, password })
    localStorage.setItem("token", data.token)
    localStorage.setItem("user", JSON.stringify(data.user))
    setUser(data.user)
    connectSocket(data.user.id, data.user.username)
    return data
  }

  const signup = async (username, email, password) => {
    const data = await authApi.signup({ username, email, password })
    localStorage.setItem("token", data.token)
    localStorage.setItem("user", JSON.stringify(data.user))
    setUser(data.user)
    connectSocket(data.user.id, data.user.username)
    return data
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch (err) {
      console.error("Logout error:", err)
    } finally {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      setUser(null)
      disconnectSocket()
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be inside AuthProvider")
  return ctx
}