import { ApiError } from "../errors/ApiError.js"

export const errorHandler = (err, req, res, next) => {

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors.length > 0 ? err.errors : undefined
    })
  }

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map(e => e.message)
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors
    })
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    return res.status(409).json({
      success: false,
      message: `${field} already exists`
    })
  }

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

  console.error("Unhandled error:", err)

  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === "production"
      ? "Server error — baad mein try karo"
      : err.message  
  })
}