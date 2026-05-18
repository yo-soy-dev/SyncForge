import axios from "axios"
import { API_URL } from "../utils/constants"

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

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

  leave: async (roomId) => {
  const res = await api.post(`/api/rooms/${roomId}/leave`)
  return res.data
},
}

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

export const executeApi = {
  run: async (body) => {
    const res = await api.post("/api/execute/run", body)
    return res.data
  },
}

export const filesApi = {
  save: async (body) => {
    const res = await api.post("/api/files/save", body)
    return res.data
  },

  getByRoom: async (roomId) => {
    const res = await api.get(`/api/files/${roomId}`)
    return res.data
  },

  delete: async (fileId) => {
    const res = await api.delete(`/api/files/${fileId}`)
    return res.data
  },
}