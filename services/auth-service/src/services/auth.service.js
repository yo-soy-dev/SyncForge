import { randomBytes, createHash } from "crypto"
import User from "../models/User.js"
import { generateToken, saveSession, deleteSession, verifySession } from "../utils/generateToken.js"
import jwt from "jsonwebtoken"
import redisClient from "../config/redis.js"
import cloudinary from "../config/cloudinary.js"
import { sendMail } from "../utils/mailer.js"

const GUEST_TTL_SECONDS = 24 * 60 * 60

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))

export const guestLogin = async () => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = randomBytes(3).toString("hex")
    try {
      const user = await User.create({
        username: `Guest-${id}`,
        email: `guest-${id}-${randomBytes(4).toString("hex")}@guest.invalid`,
        password: randomBytes(24).toString("hex"),
        isGuest: true,
        expiresAt: new Date(Date.now() + GUEST_TTL_SECONDS * 1000),
      })

      const token = generateToken(user._id, user.username, { isGuest: true, expiresIn: "24h" })
      await saveSession(user._id.toString(), token, GUEST_TTL_SECONDS)

      return {
        token,
        user: { id: user._id, username: user.username, email: user.email, isGuest: true },
      }
    } catch (err) {
      if (err.code !== 11000) throw err
    }
  }
  throw new Error("Could not start a guest session. Please try again.")
}

export const signup = async ({ username, email, password }) => {

  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  })


  if (existingUser) {
    throw new Error("Email or username already exists")
  }


  const user = await User.create({ username, email, password })


  const appUrl = process.env.APP_URL || "http://localhost"
  sendMail({
    to: user.email,
    subject: "You're in. Your Coduet room is waiting ⚡",
    html: `
<div style="background:#0e0f13;padding:32px 16px;font-family:Segoe UI,Arial,sans-serif;">
  <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#16181d;border:1px solid #2a2d35;border-radius:16px;">
    <tr><td style="padding:32px;">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;color:#2dd4bf;">● CODUET</p>
      <h1 style="margin:0 0 12px;font-size:26px;color:#f4f1ea;">Welcome aboard, ${esc(user.username)}.</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#9aa0ac;">
        Code together, in real time. No setup, no "can you see my screen?". Here is how to get going in under a minute:
      </p>
      <table role="presentation" width="100%" style="font-size:14px;color:#f4f1ea;">
        <tr><td style="padding:8px 0;"><span style="color:#ff5a36;font-weight:bold;">1</span>&nbsp; Create a room from your dashboard</td></tr>
        <tr><td style="padding:8px 0;"><span style="color:#ff5a36;font-weight:bold;">2</span>&nbsp; Share the room code with a teammate</td></tr>
        <tr><td style="padding:8px 0;"><span style="color:#ff5a36;font-weight:bold;">3</span>&nbsp; Write, run and review code together</td></tr>
      </table>
      <p style="margin:28px 0;">
        <a href="${appUrl}/dashboard" style="background:#ff5a36;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;display:inline-block;">Open my dashboard</a>
      </p>
      <p style="margin:0;font-size:12px;color:#6b7280;">
        Didn't sign up? You can safely ignore this email.
      </p>
    </td></tr>
  </table>
</div>`,
  }).catch((e) => console.error("Welcome mail failed:", e.message))


  const token = generateToken(user._id, user.username)

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

export const login = async ({ email, password }) => {
  const user = await User.findOne({ email })
  if (!user) throw new Error("Invalid credentials")

  const isMatch = await user.comparePassword(password)
  if (!isMatch) throw new Error("Invalid credentials")

  await deleteSession(user._id.toString())
  if (user.avatarUrl) await redisClient.set(`avatar:${user._id}`, user.avatarUrl)
  const token = generateToken(user._id, user.username)
  await saveSession(user._id.toString(), token)

  return {
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl
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

  // Redis lookup sasta hai: har request pe DB query nahi lagti
  const avatarUrl = (await redisClient.get(`avatar:${decoded.userId}`)) || ""
  return { ...decoded, avatarUrl }
}



// ---------- Avatar ----------
const uploadBuffer = (buffer, userId) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: "avatars",
          public_id: `user_${userId}`,
          overwrite: true,
          invalidate: true,
          transformation: [{ width: 256, height: 256, crop: "fill", gravity: "face" }],
        },
        (err, result) => (err ? reject(err) : resolve(result))
      )
      .end(buffer)
  })

export const updateAvatar = async (userId, buffer) => {
  const user = await User.findById(userId)
  if (!user || user.isGuest) throw new Error("Guests cannot upload a photo")
  const result = await uploadBuffer(buffer, userId)
  user.avatarUrl = result.secure_url
  await user.save()
  await redisClient.set(`avatar:${userId}`, user.avatarUrl)
  return { id: user._id, username: user.username, email: user.email, avatarUrl: user.avatarUrl }
}


// ---------- Forgot / Reset password ----------
const RESET_TTL = 15 * 60
const hashToken = (t) => createHash("sha256").update(t).digest("hex")

export const forgotPassword = async (email) => {
  const normalized = email.trim().toLowerCase()

  const cooldownKey = `pwreset:cd:${normalized}`
  if (await redisClient.get(cooldownKey)) return
  await redisClient.setEx(cooldownKey, 60, "1")

  const user = await User.findOne({ email: normalized, isGuest: { $ne: true } })
  if (!user) return

  const token = randomBytes(32).toString("hex")
  await redisClient.setEx(`pwreset:${hashToken(token)}`, RESET_TTL, user._id.toString())

  const link = `${process.env.APP_URL}/reset-password?token=${token}`
  await sendMail({
    to: user.email,
    subject: "Reset your Coduet password 🔐",
    html: `
<div style="background:#0e0f13;padding:32px 16px;font-family:Segoe UI,Arial,sans-serif;">
  <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#16181d;border:1px solid #2a2d35;border-radius:16px;">
    <tr><td style="padding:32px;">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;color:#2dd4bf;">● CODUET</p>
      <h1 style="margin:0 0 12px;font-size:26px;color:#f4f1ea;">Locked out, ${esc(user.username)}?</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#9aa0ac;">
        No stress. Click the button below to choose a new password.
        This link works for <strong style="color:#f4f1ea;">15 minutes</strong> and only once.
      </p>
      <p style="margin:0 0 28px;">
        <a href="${link}" style="background:#ff5a36;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;display:inline-block;">Set a new password</a>
      </p>
      <p style="margin:0 0 8px;font-size:12px;color:#6b7280;">Button not working? Paste this link into your browser:</p>
      <p style="margin:0 0 24px;font-size:12px;word-break:break-all;color:#2dd4bf;">${link}</p>
      <p style="margin:0;font-size:12px;color:#6b7280;">
        Didn't ask for this? Ignore this email and your password stays the same.
      </p>
    </td></tr>
  </table>
</div>`,
  })
}

export const resetPassword = async (token, newPassword) => {
  const key = `pwreset:${hashToken(token)}`
  const userId = await redisClient.getDel(key)
  if (!userId) throw new Error("Reset link is invalid or has expired")

  const user = await User.findById(userId)
  if (!user) throw new Error("Reset link is invalid or has expired")

  user.password = newPassword
  await user.save()

  await deleteSession(userId)
}