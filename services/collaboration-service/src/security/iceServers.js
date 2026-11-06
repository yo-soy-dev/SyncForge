import crypto from "crypto"

export const TURN_TTL_SECONDS = 6 * 60 * 60

const list = (value) => String(value || "").split(",").map((s) => s.trim()).filter(Boolean)

export const buildIceServers = ({ userId, now = Date.now(), env = process.env } = {}) => {
  const stun = list(env.STUN_URLS)
  const servers = [{ urls: stun.length ? stun : ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }]

  const turn = list(env.TURN_URLS)
  if (turn.length && env.TURN_SECRET) {
    const username = `${Math.floor(now / 1000) + TURN_TTL_SECONDS}:${userId}`
    const credential = crypto.createHmac("sha1", env.TURN_SECRET).update(username).digest("base64")
    servers.push({ urls: turn, username, credential })
  }
  return servers
}