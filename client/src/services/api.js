// import { API_URL } from "../utils/constants"

// // Token localStorage se lo
// const getToken = () => localStorage.getItem("token")

// // Base fetch wrapper — token automatically attach hoga
// const request = async (endpoint, options = {}) => {
//   const token = getToken()

//   const response = await fetch(`${API_URL}${endpoint}`, {
//     ...options,
//     headers: {
//       "Content-Type": "application/json",
//       ...(token && { Authorization: `Bearer ${token}` }),
//       ...options.headers,
//     },
//   })

//   const data = await response.json()

//   if (!response.ok) {
//     throw new Error(data.message || "Something went wrong")
//   }

//   return data
// }

// // ── Auth ─────────────────────────────────────────
// export const authApi = {
//   signup: (body) =>
//     request("/api/auth/signup", { method: "POST", body: JSON.stringify(body) }),

//   login: (body) =>
//     request("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),

//   logout: () =>
//     request("/api/auth/logout", { method: "POST" }),
// }

// // ── Rooms ────────────────────────────────────────
// export const roomApi = {
//   create: (body) =>
//     request("/api/rooms/create", { method: "POST", body: JSON.stringify(body) }),

//   join: (code) =>
//     request("/api/rooms/join", { method: "POST", body: JSON.stringify({ code }) }),

//   getMyRooms: () =>
//     request("/api/rooms/my-rooms"),

//   getById: (roomId) =>
//     request(`/api/rooms/${roomId}`),

//   delete: (roomId) =>
//     request(`/api/rooms/${roomId}`, { method: "DELETE" }),
// }



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

// ── Auth ─────────────────────────────
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

// ── Rooms ────────────────────────────
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