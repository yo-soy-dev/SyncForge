import * as authService from "../services/auth.service.js"

export const guest = async (req, res) => {
  try {
    const result = await authService.guestLogin()
    res.status(201).json({ success: true, ...result })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const signup = async (req, res) => {
  try {
    const result = await authService.signup(req.body)
    res.status(201).json({ success: true, ...result })
  } catch (error) {
    console.error('Signup controller error:', error.message)
    console.error('Error name:', error.name)
    console.error('Error code:', error.code)
    console.error('Stack:', error.stack)
    res.status(400).json({ success: false, message: error.message })
  }
}

export const login = async (req, res) => {
  try {
    const result = await authService.login(req.body)
    res.status(200).json({ success: true, ...result })
  } catch (error) {
    res.status(401).json({ success: false, message: error.message })
  }
}

export const logout = async (req, res) => {
  try {
    await authService.logout(req.user.userId)
    res.status(200).json({ success: true, message: "Logged out" })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]
    if (!token) throw new Error("Token not found")
    const decoded = await authService.verifyToken(token)
    res.status(200).json({ success: true, user: decoded })
  } catch (error) {
    res.status(401).json({ success: false, message: error.message })
  }
}

export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Image required" })
    const user = await authService.updateAvatar(req.user.userId, req.file.buffer)
    res.json({ success: true, user })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

export const forgotPassword = async (req, res) => {
  const { email } = req.body
  if (typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ success: false, message: "A valid email is required" })
  }
  try {
    await authService.forgotPassword(email)
  } catch (error) {
    console.error("forgotPassword error:", error.message)
  }
  res.json({ success: true, message: "If that email exists, a reset link has been sent" })
}

export const resetPassword = async (req, res) => {
  const { token, password } = req.body
  if (typeof token !== "string" || typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" })
  }
  try {
    await authService.resetPassword(token, password)
    res.json({ success: true, message: "Password updated. Please log in." })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}