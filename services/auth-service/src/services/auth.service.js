import User from "../models/User.js"
import { generateToken, saveSession, deleteSession, verifySession } from "../utils/generateToken.js"
import jwt from "jsonwebtoken"

export const signup = async ({ username, email, password }) => {
  console.log('signup called with:', { username, email })

  const existingUser = await User.findOne({ 
    $or: [{ email }, { username }] 
  })

  console.log('existingUser check done')
  
  if (existingUser) {
    throw new Error("Email or username already exists")
  }


  const user = await User.create({ username, email, password })

  console.log('user created:', user._id)

  const token = generateToken(user._id)
   console.log('token generated')
   
  await saveSession(user._id.toString(), token)
   console.log('Session saved successfully')

  return {
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email
    }
  }
}

export const login = async ({ email, password }) => {
  const user = await User.findOne({ email })
  if (!user) throw new Error("Invalid credentials")

  const isMatch = await user.comparePassword(password)
  if (!isMatch) throw new Error("Invalid credentials")

  await deleteSession(user._id.toString())
  const token = generateToken(user._id)
  await saveSession(user._id.toString(), token)

  return {
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email
    }
  }
}

export const logout = async (userId) => {
  await deleteSession(userId)
}

export const verifyToken = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET)
  
  const isValid = await verifySession(decoded.userId)
  if (!isValid) throw new Error("Session expired — please login again")

  return decoded
}