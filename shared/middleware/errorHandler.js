import { ApiError } from "../errors/ApiError.js"

// Ye middleware Express ke saare errors pakadta hai
// app.use(errorHandler) — sabse last mein lagao

export const errorHandler = (err, req, res, next) => {

  // Agar ApiError hai — humara custom error
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors.length > 0 ? err.errors : undefined
    })
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map(e => e.message)
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors
    })
  }

  // Mongoose duplicate key error (unique field)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    return res.status(409).json({
      success: false,
      message: `${field} already exists`
    })
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token"
    })
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expire ho gaya — dobara login karo"
    })
  }

  // Unknown error — production mein details mat dikhao
  console.error("Unhandled error:", err)

  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === "production"
      ? "Server error — baad mein try karo"
      : err.message  // Development mein full message
  })
}