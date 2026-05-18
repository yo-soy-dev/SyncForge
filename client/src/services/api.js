import axios from "axios"
import { API_URL } from "../utils/constants"

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Token automatically attach
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Auth ──────────────────────────────────────
export const authApi = {
  signup: async (body) => {
    const res = await api.post("/api/auth/signup", body)
    return res.data
  },
  login: async (body) => {
    const res = await api.post("/api/auth/login", body)
    return res.data
  },
  logout: async () => {
    const res = await api.post("/api/auth/logout")
    return res.data
  },
}

// ── Rooms ──────────────────────────────────────
export const roomApi = {
  create: async (body) => {
    const res = await api.post("/api/rooms/create", body)
    return res.data
  },
  join: async (code) => {
    const res = await api.post("/api/rooms/join", { code })
    return res.data
  },
  getMyRooms: async () => {
    const res = await api.get("/api/rooms/my-rooms")
    return res.data
  },
  getById: async (roomId) => {
    const res = await api.get(`/api/rooms/${roomId}`)
    return res.data
  },
  delete: async (roomId) => {
    const res = await api.delete(`/api/rooms/${roomId}`)
    return res.data
  },
}

// ── AI (also uses axios) ───────────────────────
export const aiApi = {
  review: async (code, language) => {
    const res = await api.post("/api/ai/review", { code, language })
    return res.data
  },
  chat: async (message, code, language) => {
    const res = await api.post("/api/ai/chat", { message, code, language })
    return res.data
  },
  fix: async (code, language, error = "") => {
    const res = await api.post("/api/ai/fix", { code, language, error })
    return res.data
  },
  explain: async (code, language) => {
    const res = await api.post("/api/ai/explain", { code, language })
    return res.data
  },
}