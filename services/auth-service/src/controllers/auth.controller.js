import * as authService from "../services/auth.service.js"

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
    if (!token) throw new Error("Token nahi mila")
    const decoded = await authService.verifyToken(token)
    res.status(200).json({ success: true, user: decoded })
  } catch (error) {
    res.status(401).json({ success: false, message: error.message })
  }
}