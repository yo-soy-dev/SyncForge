import * as authService from "../services/auth.service.js"

export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]
    if (!token) throw new Error("Token required")

    const decoded = await authService.verifyToken(token)
    req.user = decoded 
    next()
  } catch (error) {
    res.status(401).json({ success: false, message: "Unauthorized" })
  }
}