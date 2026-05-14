export const validateSignup = (req, res, next) => {
  const { username, email, password } = req.body

  const errors = []

  if (!username || username.trim().length < 3) {
    errors.push("Username kam se kam 3 characters ka hona chahiye")
  }

  if (!email || !email.includes("@")) {
    errors.push("Valid email chahiye")
  }

  if (!password || password.length < 6) {
    errors.push("Password kam se kam 6 characters ka hona chahiye")
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors[0], errors })
  }

  next()
}

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email aur password dono chahiye"
    })
  }

  next()
}