// services/api.js  –  all calls to the FastAPI backend
// using axios because fetch error handling is annoying

import axios from "axios"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  timeout: 15000,
})

// request interceptor - add auth token if we have one
api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("fitai_token") : null
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const calculateBMI = (data)    => api.post("/api/bmi/calculate", data)
export const getDietPlan  = (data)    => api.post("/api/diet/recommend", data)
export const getWorkoutPlan = (data)  => api.post("/api/workout/recommend", data)
export const analyzePosture = (data)  => api.post("/api/posture/analyze", data)
export const sendChatMessage = (data) => api.post("/api/chat/message", data)
export const getWeeklyProgress = (uid) => api.get(`/api/analytics/weekly-progress/${uid}`)
export const getBMIHistory = (uid)    => api.get(`/api/analytics/bmi-history/${uid}`)

export default api
