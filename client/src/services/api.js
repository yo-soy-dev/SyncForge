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

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || ""
    const isAuthForm = /\/api\/auth\/(login|signup|guest|forgot-password|reset-password)/.test(url)
    if (err.response?.status === 401 && !isAuthForm) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      if (window.location.pathname !== "/login") window.location.assign("/login")
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  signup: async (body) => {
    const res = await api.post("/api/auth/signup", body)
    return res.data
  },

  login: async (body) => {
    const res = await api.post("/api/auth/login", body)
    return res.data
  },

  guest: async () => {
    const res = await api.post("/api/auth/guest")
    return res.data
  },

  uploadAvatar: async (file) => {
    const form = new FormData()
    form.append("avatar", file)
    const res = await api.post("/api/auth/avatar", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return res.data
  },

  forgotPassword: async (email) => {
    const res = await api.post("/api/auth/forgot-password", { email })
    return res.data
  },

  resetPassword: async (token, password) => {
    const res = await api.post("/api/auth/reset-password", { token, password })
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

  updateInterview: async (roomId, patch) => {
    const res = await api.patch(`/api/rooms/${roomId}/interview`, patch)
    return res.data
  },

  createSnapshot: async (roomId, body) => {
    const res = await api.post(`/api/rooms/${roomId}/snapshots`, body)
    return res.data
  },

  listSnapshots: async (roomId) => {
    const res = await api.get(`/api/rooms/${roomId}/snapshots`)
    return res.data
  },

  getSnapshot: async (roomId, snapshotId) => {
    const res = await api.get(`/api/rooms/${roomId}/snapshots/${snapshotId}`)
    return res.data
  },

  saveScorecard: async (roomId, body) => {
    const res = await api.put(`/api/rooms/${roomId}/scorecard`, body)
    return res.data
  },

  getScorecards: async (roomId) => {
    const res = await api.get(`/api/rooms/${roomId}/scorecards`)
    return res.data
  },
  getTimeline: async (roomId) => {
    const res = await api.get(`/api/rooms/${roomId}/timeline`)
    return res.data
  },

  getSummary: async (roomId) => {
    const res = await api.get(`/api/rooms/${roomId}/summary`)
    return res.data
  },

  saveSummary: async (roomId, body) => {
    const res = await api.put(`/api/rooms/${roomId}/summary`, body)
    return res.data
  },
}

export const aiApi = {
  review: async (code, language, roomId) => {
    const res = await api.post("/api/ai/review", { roomId, code, language })
    return res.data
  },

  chat: async (message, code, language, roomId) => {
    const res = await api.post("/api/ai/chat", { roomId, message, code, language })
    return res.data
  },

  fix: async (code, language, error = "", roomId) => {
    const res = await api.post("/api/ai/fix", { roomId, code, language, error })
    return res.data
  },
  explain: async (code, language, roomId) => {
    const res = await api.post("/api/ai/explain", { roomId, code, language })
    return res.data
  },
  suggest: async ({ roomId, instruction, baseText, language }) => {
    const res = await api.post("/api/ai/suggest", { roomId, instruction, baseText, language })
    return res.data
  },
  draftSummary: async (roomId) => {
    const res = await api.post("/api/ai/interview-summary", { roomId })
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

