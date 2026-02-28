// hooks/useFitAI.js  –  centralised state for the app
// started with useState everywhere but it got messy, moved to a custom hook

import { useState, useCallback } from "react"
import { calculateBMI, getDietPlan, getWorkoutPlan, sendChatMessage, getWeeklyProgress, getBMIHistory } from "../services/api"

export function useFitAI() {
  const [bmiData,     setBmiData]     = useState(null)
  const [dietPlan,    setDietPlan]    = useState(null)
  const [workoutPlan, setWorkoutPlan] = useState(null)
  const [analytics,   setAnalytics]   = useState(null)
  const [chatHistory, setChatHistory] = useState([])
  const [loading,     setLoading]     = useState({})
  const [errors,      setErrors]      = useState({})
  const [userContext, setUserContext] = useState(null)

  const setLoad = (key, val) => setLoading(p => ({...p, [key]: val}))
  const setErr  = (key, val) => setErrors(p => ({...p, [key]: val}))

  const runBMI = useCallback(async (formData) => {
    setLoad("bmi", true)
    setErr("bmi", null)
    try {
      const res = await calculateBMI(formData)
      setBmiData(res.data)
      setUserContext({ bmi: res.data.bmi, goal: formData.goal, level: formData.fitness_level })
      // auto-fetch diet plan after BMI
      const dietRes = await getDietPlan({
        bmi: res.data.bmi,
        age: formData.age,
        activity: Math.round((formData.activity_level - 1.2) / 0.175),
        goal: formData.goal_idx || 0,
        preferences: formData.preferences || [],
      })
      setDietPlan(dietRes.data)
    } catch (e) {
      setErr("bmi", e.response?.data?.detail || "Something went wrong")
    } finally {
      setLoad("bmi", false)
    }
  }, [])

  const runWorkoutPlan = useCallback(async (profileData) => {
    setLoad("workout", true)
    try {
      const res = await getWorkoutPlan(profileData)
      setWorkoutPlan(res.data)
    } catch (e) {
      setErr("workout", e.message)
    } finally {
      setLoad("workout", false)
    }
  }, [])

  const fetchAnalytics = useCallback(async (userId = "demo_user") => {
    setLoad("analytics", true)
    try {
      const [prog, bmiHist] = await Promise.all([
        getWeeklyProgress(userId),
        getBMIHistory(userId),
      ])
      setAnalytics({ weekly: prog.data, bmiHistory: bmiHist.data })
    } catch (e) {
      setErr("analytics", e.message)
    } finally {
      setLoad("analytics", false)
    }
  }, [])

  const chat = useCallback(async (message) => {
    const newMsg = { role: "user", content: message }
    const updated = [...chatHistory, newMsg]
    setChatHistory(updated)
    setLoad("chat", true)
    try {
      const res = await sendChatMessage({ messages: updated, user_context: userContext })
      setChatHistory(prev => [...prev, { role: "assistant", content: res.data.reply, intent: res.data.intent }])
    } catch (e) {
      setChatHistory(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't connect to the AI right now. Try again!", intent: "error" }])
    } finally {
      setLoad("chat", false)
    }
  }, [chatHistory, userContext])

  return {
    bmiData, dietPlan, workoutPlan, analytics, chatHistory,
    loading, errors, userContext,
    runBMI, runWorkoutPlan, fetchAnalytics, chat,
  }
}
