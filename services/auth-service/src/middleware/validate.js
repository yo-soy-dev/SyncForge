const isText = (v) => typeof v === "string"



export const validateSignup = (req, res, next) => {
  const { username, email, password } = req.body

  if (![username, email, password].every(isText)) {
    return res.status(400).json({ success: false, message: "Invalid input" })
  }


  const errors = []

  if (!username || username.trim().length < 3) {
    errors.push("Username must be at least 3 characters long")
  }

  if (!email || !email.includes("@")) {
    errors.push("A valid email is required")
  }

  if (!password || password.length < 6) {
    errors.push("Password must be at least 6 characters long")
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors[0], errors })
  }

  next()
}

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body


    if (![email, password].every(isText)) {
    return res.status(400).json({ success: false, message: "Invalid input" })
  }

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Both email and password are required"
    })
  }

  next()
}