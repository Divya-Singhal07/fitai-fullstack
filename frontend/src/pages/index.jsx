// pages/index.jsx  –  FitAI main page (Next.js)
// all the tabs, forms, and visualizations live here

import { useState, useEffect } from "react"
import Head from "next/head"
import { useFitAI } from "../hooks/useFitAI"
import { CaloriesBurnedChart, PostureScoreChart, WorkoutDurationChart, BMIProgressChart, MacroDonut } from "../components/AnalyticsCharts"
import ChatBot from "../components/ChatBot"

// ── tiny reusable bits ───────────────────────────────────────────────────────
const Card = ({ children, style = {} }) => (
  <div className="glass fade-in" style={{ padding: "1.5rem", ...style }}>{children}</div>
)

const PillBtn = ({ label, active, onClick }) => (
  <button className={`pill-btn ${active ? "active" : ""}`} onClick={onClick}>{label}</button>
)

const FormGroup = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
    <label>{label}</label>
    {children}
  </div>
)

const Spinner = () => (
  <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid rgba(79,195,247,0.3)", borderTopColor: "#4FC3F7", animation: "spin 0.8s linear infinite", margin: "0 auto" }}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
)

// ── Exercises data ────────────────────────────────────────────────────────────
const EXERCISES = [
  { id:"squat",     name:"Squats",             emoji:"🏋️",  color:"#4FC3F7", diff:"Beginner",
    muscles:["Quads","Glutes","Core"],
    steps:["🦶 Feet shoulder-width apart, toes slightly out.","📐 Chest up, spine neutral.","⬇️ Hips back and down, knees tracking over toes.","📏 Thighs parallel to floor or lower.","🔼 Drive through heels to stand. Exhale up.","⚠️ Never let knees cave inward!"],
    tip:"💡 Stretch arms forward for balance when starting out." },
  { id:"pushup",    name:"Push-ups",            emoji:"💪",  color:"#FF6B9D", diff:"Beginner",
    muscles:["Chest","Triceps","Shoulders"],
    steps:["🤲 Hands slightly wider than shoulder-width.","📏 Straight line from head to heels.","⬇️ Lower chest, elbows at ~45° to body.","✋ Stop just before chest touches.","🔼 Push up, core braced throughout.","😤 Inhale down, exhale up."],
    tip:"💡 Squeeze glutes the whole time for better alignment." },
  { id:"jacks",     name:"Jumping Jacks",       emoji:"⭐",  color:"#FFD740", diff:"Beginner",
    muscles:["Full Body","Cardio"],
    steps:["🧍 Stand straight, feet together.","⬆️ Jump feet out to shoulder-width.","🙌 Arms arc overhead as feet go out.","⬇️ Return to start position.","🔄 Maintain steady rhythmic pace.","🦵 Land with soft bent knees."],
    tip:"💡 Engaging your core makes this much harder (great!)." },
  { id:"curl",      name:"Dumbbell Arm Curls",  emoji:"🏋️‍♂️", color:"#69F0AE", diff:"Beginner",
    muscles:["Biceps","Forearms"],
    steps:["🤌 Hold dumbbells, palms facing forward.","🦾 Feet hip-width apart, elbows at sides.","⬆️ Curl upward, exhale as you lift.","🎯 Hold full contraction at the top.","⬇️ Lower slowly — this is where gains happen.","🔁 No swinging! Torso stays still."],
    tip:"💡 If you need to swing, the weight is too heavy." },
  { id:"kneepush",  name:"Knee Push-ups",       emoji:"🧎",  color:"#CE93D8", diff:"Beginner-Friendly",
    muscles:["Chest","Triceps","Core"],
    steps:["🧎 Kneel on mat, hands slightly wider than shoulders.","📏 Diagonal line from knees to shoulders.","⬇️ Lower chest while keeping back flat.","🔼 Push back up, no hip sag.","✅ Great stepping stone to full push-ups.","🔄 When you can do 15 cleanly, progress up!"],
    tip:"💡 Cross your ankles in the air for extra core work." },
  { id:"plank",     name:"Plank Hold",          emoji:"🪨",  color:"#80DEEA", diff:"Beginner",
    muscles:["Core","Shoulders","Back"],
    steps:["🤲 Forearms on ground, elbows under shoulders.","📏 Extend legs back, balance on balls of feet.","🔩 Rigid straight line from head to heels.","💨 Breathe steadily — never hold your breath.","⏱️ Start with 20-30s, build slowly.","⚠️ Hips drop = rest and reset. Quality first!"],
    tip:"💡 Look slightly forward to keep your neck neutral." },
]

const DIET_PLANS = {
  lose: {
    vegan:   [{icon:"🥣",name:"Breakfast",desc:"Oatmeal with berries, chia seeds & almond milk",kcal:320},{icon:"🥗",name:"Lunch",desc:"Chickpea Buddha bowl with quinoa, avocado & greens",kcal:470},{icon:"🍎",name:"Snack",desc:"Apple with almond butter & walnuts",kcal:215},{icon:"🍜",name:"Dinner",desc:"Lentil soup with whole grain bread & broccoli",kcal:405}],
    keto:    [{icon:"🥚",name:"Breakfast",desc:"Scrambled eggs with spinach, bacon & avocado",kcal:430},{icon:"🥩",name:"Lunch",desc:"Grilled chicken Caesar (no croutons)",kcal:390},{icon:"🧀",name:"Snack",desc:"Cheese cubes, celery & peanut butter",kcal:275},{icon:"🐟",name:"Dinner",desc:"Baked salmon with asparagus & zucchini noodles",kcal:475}],
    default: [{icon:"🍳",name:"Breakfast",desc:"Greek yogurt with granola, banana & honey",kcal:345},{icon:"🥪",name:"Lunch",desc:"Grilled turkey wrap with veggies & hummus",kcal:445},{icon:"🍊",name:"Snack",desc:"Mixed fruit salad with almonds",kcal:195},{icon:"🍗",name:"Dinner",desc:"Baked chicken, brown rice & steamed vegetables",kcal:490}],
  },
  maintain: {
    default: [{icon:"🥞",name:"Breakfast",desc:"Whole wheat pancakes with berries & maple syrup",kcal:415},{icon:"🍱",name:"Lunch",desc:"Quinoa bowl with salmon, mixed veg & olive oil",kcal:595},{icon:"🥜",name:"Snack",desc:"Trail mix with dark chocolate",kcal:275},{icon:"🍝",name:"Dinner",desc:"Whole wheat pasta with turkey & salad",kcal:645}],
  },
  gain: {
    default: [{icon:"🥤",name:"Breakfast",desc:"Protein shake: banana, oats, PB & whey in milk",kcal:545},{icon:"🍛",name:"Lunch",desc:"Large rice bowl with chicken thighs, beans & sweet potato",kcal:750},{icon:"🥚",name:"Snack",desc:"3 boiled eggs with crackers & cheese",kcal:375},{icon:"🥩",name:"Dinner",desc:"Steak, mash, broccoli & whole milk",kcal:845}],
  },
}

const WEEK_PLANS = {
  beginner: {
    weight_loss:[
      {day:"Mon",icon:"🚶",name:"Cardio Start",    detail:"20min walk + Jumping Jacks 3×15 + Knee Push-ups 2×10",     lvl:"active"},
      {day:"Tue",icon:"🧘",name:"Active Rest",     detail:"Light stretching + 20min yoga",                             lvl:"rest"},
      {day:"Wed",icon:"💪",name:"Strength Basics", detail:"Squats 3×12 + Knee Push-ups 3×10 + Arm Curls 2×12",        lvl:"active"},
      {day:"Thu",icon:"🏃",name:"Cardio Burst",    detail:"Jumping Jacks 4×20 + High Knees 3×30sec + Walk 15min",     lvl:"hard"},
      {day:"Fri",icon:"🌟",name:"Full Body Light", detail:"Plank 3×20sec + Squats 2×15 + Arm Curls 2×10",             lvl:"active"},
      {day:"Sat",icon:"⚽",name:"Fun Activity",    detail:"30min walk/jog or any sport you enjoy",                    lvl:"active"},
      {day:"Sun",icon:"😴",name:"Rest Day",        detail:"Full rest. Hydrate, sleep, meal prep!",                    lvl:"rest"},
    ],
    muscle:[
      {day:"Mon",icon:"💪",name:"Upper Body",      detail:"Knee Push-ups 3×12 + Arm Curls 3×10 + Plank 3×20sec",    lvl:"active"},
      {day:"Tue",icon:"🦵",name:"Lower Body",      detail:"Squats 4×15 + Lunges 2×10 + Calf raises 3×20",           lvl:"hard"},
      {day:"Wed",icon:"💤",name:"Rest",            detail:"Full rest or gentle 15min walk",                           lvl:"rest"},
      {day:"Thu",icon:"🔥",name:"Push Day",        detail:"Knee Push-ups 4×12 + Squats 3×12 + Chair dips 2×10",      lvl:"hard"},
      {day:"Fri",icon:"🧲",name:"Pull & Core",     detail:"Arm Curls 3×12 + Plank 3×30sec + Superman holds 2×10",   lvl:"active"},
      {day:"Sat",icon:"🧘",name:"Recovery",        detail:"Yoga or stretching – 30min",                               lvl:"rest"},
      {day:"Sun",icon:"😴",name:"Rest",            detail:"Total rest. Muscle grows while you sleep!",                lvl:"rest"},
    ],
  },
  intermediate: {
    weight_loss:[
      {day:"Mon",icon:"⚡",name:"HIIT Cardio",    detail:"Burpees 3×10 + Jumping Jacks 4×30 + High Knees 4×40sec",  lvl:"hard"},
      {day:"Tue",icon:"💪",name:"Upper Strength", detail:"Push-ups 4×15 + Arm Curls 4×12 + Diamond Push-ups 3×10", lvl:"active"},
      {day:"Wed",icon:"🦵",name:"Lower Strength", detail:"Squats 4×20 + Jump Squats 3×12 + Reverse Lunges 3×15",   lvl:"hard"},
      {day:"Thu",icon:"🧘",name:"Active Rest",    detail:"Yoga / foam rolling / walk at easy pace – 30min",         lvl:"rest"},
      {day:"Fri",icon:"🔄",name:"Full Circuit",   detail:"4 rounds: Push-ups + Squats + Curls + Plank 45sec",       lvl:"hard"},
      {day:"Sat",icon:"🚴",name:"Cardio Fun",     detail:"Cycle, jog or swim – 45min",                               lvl:"active"},
      {day:"Sun",icon:"😴",name:"Rest",           detail:"Full rest and recovery",                                   lvl:"rest"},
    ],
    muscle:[
      {day:"Mon",icon:"🏋️",name:"Chest & Tris", detail:"Push-ups 5×20 + Tricep dips 4×15 + Plank 3×45sec",        lvl:"hard"},
      {day:"Tue",icon:"💪",name:"Back & Bis",    detail:"Curls 4×15 + Reverse curls 3×12 + Superman 3×12",         lvl:"active"},
      {day:"Wed",icon:"🦵",name:"Leg Day",       detail:"Squats 5×15 + Jump Squats 4×10 + Calf raises 4×25",       lvl:"hard"},
      {day:"Thu",icon:"💤",name:"Rest",          detail:"Rest or 20min yoga",                                        lvl:"rest"},
      {day:"Fri",icon:"⭐",name:"Full Body",     detail:"Circuit: Push-ups + Squats + Curls + Jacks + Plank",       lvl:"hard"},
      {day:"Sat",icon:"🪨",name:"Core Focus",    detail:"Plank 4×60sec + Mountain climbers 4×30 + V-sits 3×15",    lvl:"active"},
      {day:"Sun",icon:"😴",name:"Rest",          detail:"Recovery. Eat well and sleep!",                            lvl:"rest"},
    ],
  },
  advanced: {
    weight_loss:[
      {day:"Mon",icon:"💥",name:"HIIT Blast",    detail:"Burpees 5×15 + Jump Squats 5×20 + Push-ups 5×20 + Plank 5×60sec",lvl:"hard"},
      {day:"Tue",icon:"💪",name:"Upper Power",   detail:"Push-up variations 5×20 + Curls 5×15 + Decline Push-ups 4×15",   lvl:"hard"},
      {day:"Wed",icon:"🦵",name:"Leg Power",     detail:"Jump Squats 6×15 + Split squats 4×15 + Calf raises 5×30",         lvl:"hard"},
      {day:"Thu",icon:"🧘",name:"Recovery",      detail:"Easy swim or cycle 40min. Don't skip this!",                      lvl:"active"},
      {day:"Fri",icon:"🔥",name:"Full Circuit",  detail:"5 rounds: 20 push-ups + 20 squats + 20 jacks + 15 curls + 45sec plank",lvl:"hard"},
      {day:"Sat",icon:"🏃",name:"Run",           detail:"5km or 45min jog at strong pace",                                  lvl:"hard"},
      {day:"Sun",icon:"😴",name:"Rest",          detail:"Full recovery. Sleep 8hrs, eat well.",                             lvl:"rest"},
    ],
    muscle:[
      {day:"Mon",icon:"💥",name:"Chest Blast",   detail:"Push-ups 6×20 + Wide push-ups 5×15 + Decline 4×15 + Plank 4×60sec",lvl:"hard"},
      {day:"Tue",icon:"💪",name:"Arms & Back",   detail:"Curls 6×15 + Hammer curls 5×12 + Chin-ups 4×8",                   lvl:"hard"},
      {day:"Wed",icon:"🦵",name:"Leg Day 🔥",   detail:"Squats 6×20 + Jump squats 5×15 + Pistol squats 3×8 each",          lvl:"hard"},
      {day:"Thu",icon:"🧘",name:"Rest",          detail:"Full rest or 30min yoga/mobility only",                             lvl:"rest"},
      {day:"Fri",icon:"🎯",name:"Shoulders+Core",detail:"Pike push-ups 5×15 + Plank 5×60sec + Mountain climbers 5×30",     lvl:"hard"},
      {day:"Sat",icon:"⭐",name:"Giant Circuit", detail:"6 rounds: 25 push-ups + 25 squats + 20 curls + 30 jacks + 60sec plank",lvl:"hard"},
      {day:"Sun",icon:"😴",name:"Rest",          detail:"Rest completely. Muscle grows at rest!",                           lvl:"rest"},
    ],
  },
}

const BMI_CATS = {
  Underweight: { color:"#80DEEA", emoji:"⚡", advice:"Focus on nutrient-dense foods to build healthy weight." },
  Healthy:     { color:"#69F0AE", emoji:"✅", advice:"Great range — keep up your current habits!" },
  Overweight:  { color:"#FFD740", emoji:"⚠️", advice:"Moderate diet + exercise will get you there." },
  Obese:       { color:"#FF8A65", emoji:"🎯", advice:"Start slow and stay consistent. Every step counts!" },
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function Home() {
  const [tab, setTab] = useState("bmi")
  const [modal, setModal] = useState(null)  // exercise id for the posture modal

  // BMI form state
  const [bmiForm, setBmiForm] = useState({ height_cm:"", weight_kg:"", age:"", gender:"", goal:"lose", activity_level:1.55, preferences:["Balanced"] })
  const [localBMI, setLocalBMI] = useState(null)

  // plan form state
  const [planForm, setPlanForm] = useState({ age:"", gender:"male", fitness_level:"beginner", goal:"weight_loss" })
  const [localPlan, setLocalPlan] = useState(null)

  const { chat, chatHistory, loading: llmLoading } = useFitAI()

  // generate analytics mock data locally (would come from API in prod)
  const [analyticsData] = useState({
    weekly: {
      labels:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
      calories_burned:[310,0,420,480,380,290,0],
      workout_duration:[35,0,45,50,40,30,0],
      posture_scores:[72,0,81,85,79,88,0],
    },
    bmiHistory: { labels:["Aug","Sep","Oct","Nov","Dec","Jan"], bmi_values:[27.4,26.8,26.1,25.5,24.9,24.3] },
  })

  // ── local BMI calc (mirrors the backend logic) ───────────────────────────
  const calcBMI = () => {
    const { height_cm:h, weight_kg:w, age, gender, goal, activity_level } = bmiForm
    if (!h || !w) { alert("Please enter height and weight!"); return }
    const bmi = +(w / ((h/100)**2)).toFixed(1)
    let cat
    if (bmi < 18.5)      cat = "Underweight"
    else if (bmi < 25)   cat = "Healthy"
    else if (bmi < 30)   cat = "Overweight"
    else                 cat = "Obese"
    let bmr = gender === "female" ? 10*w+6.25*h-5*age-161 : 10*w+6.25*h-5*age+5
    const tdee   = +(bmr * activity_level).toFixed(0)
    const target = goal==="lose" ? tdee-400 : goal==="gain" ? tdee+350 : tdee
    const pref = bmiForm.preferences
    const dietKey = pref.includes("Vegan")?"vegan":pref.includes("Keto")?"keto":"default"
    const meals = (DIET_PLANS[goal]||DIET_PLANS.maintain)[dietKey] || DIET_PLANS.maintain.default
    setLocalBMI({ bmi, cat, tdee, target, meals, prot:goal==="gain"?35:30, carb:goal==="lose"?35:40 })
  }

  const genPlan = () => {
    let { age, fitness_level, goal } = planForm
    if (age > 65 && fitness_level==="advanced") fitness_level = "intermediate"
    if (age > 72) fitness_level = "beginner"
    const wk = (WEEK_PLANS[fitness_level]||WEEK_PLANS.beginner)[goal]||WEEK_PLANS.beginner.weight_loss
    setLocalPlan({ level:fitness_level, week:wk })
  }

  const togglePref = (p) => {
    setBmiForm(f => ({
      ...f,
      preferences: f.preferences.includes(p) ? f.preferences.filter(x=>x!==p) : [...f.preferences, p]
    }))
  }

  // ── render ────────────────────────────────────────────────────────────────
  const TABS = [
    {id:"bmi",      label:"🏋️ BMI & Diet"},
    {id:"posture",  label:"🤸 Postures"},
    {id:"plan",     label:"📅 My Plan"},
    {id:"analytics",label:"📊 Analytics"},
  ]

  return (
    <>
      <Head>
        <title>FitAI – Smart Gym Buddy 💪</title>
        <meta name="description" content="AI-powered gym assistant with personalized diet, workout plans and posture analysis" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet" />
      </Head>

      {/* Background bubbles */}
      <div aria-hidden style={{ position:"fixed",inset:0,pointerEvents:"none",zIndex:0 }}>
        <div style={{ position:"absolute",inset:0, background:"radial-gradient(ellipse 80% 60% at 20% 10%,rgba(2,136,209,.35),transparent 60%),radial-gradient(ellipse 60% 50% at 80% 80%,rgba(0,229,255,.2),transparent 60%)" }} />
        {[...Array(10)].map((_,i) => {
          const sz = 25+Math.random()*70
          return <div key={i} className="bubble-anim" style={{ position:"absolute", borderRadius:"50%", background:"rgba(79,195,247,.07)", border:"1px solid rgba(79,195,247,.13)", width:sz, height:sz, left:`${Math.random()*100}%`, animationDuration:`${15+Math.random()*18}s`, animationDelay:`${Math.random()*9}s` }} />
        })}
      </div>

      {/* Nav */}
      <nav style={{ position:"sticky",top:0,zIndex:100, background:"rgba(10,25,41,.88)", backdropFilter:"blur(16px)", borderBottom:"1px solid rgba(79,195,247,.2)", padding:"0.9rem 2rem", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontFamily:"Nunito",fontSize:"1.5rem",fontWeight:900 }}>
          Fit<span style={{color:"#00E5FF"}}>AI</span> 💪
        </div>
        <div style={{ display:"flex",gap:"0.4rem",flexWrap:"wrap" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding:"0.38rem 0.9rem", borderRadius:20, border:`1px solid ${tab===t.id?"#0288D1":"rgba(79,195,247,.25)"}`,
              background: tab===t.id?"#0288D1":"transparent", color: tab===t.id?"#fff":"rgba(255,255,255,.55)",
              cursor:"pointer", fontFamily:"Poppins", fontSize:"0.82rem", fontWeight:600, transition:"all 0.25s",
            }}>{t.label}</button>
          ))}
        </div>
        <div style={{ fontSize:"0.72rem", color:"rgba(79,195,247,.6)", display:"flex", gap:"0.5rem", alignItems:"center" }}>
          <span style={{ background:"rgba(105,240,174,.15)", color:"#69F0AE", padding:"0.2rem 0.6rem", borderRadius:10, fontWeight:700 }}>FastAPI</span>
          <span style={{ background:"rgba(0,229,255,.12)", color:"#00E5FF", padding:"0.2rem 0.6rem", borderRadius:10, fontWeight:700 }}>Next.js</span>
          <span style={{ background:"rgba(255,107,157,.12)", color:"#FF6B9D", padding:"0.2rem 0.6rem", borderRadius:10, fontWeight:700 }}>GPT-4</span>
        </div>
      </nav>

      {/* Main content */}
      <main style={{ maxWidth:1120, margin:"0 auto", padding:"2rem", position:"relative", zIndex:1 }}>

        {/* ═══ TAB: BMI & DIET ═══ */}
        {tab === "bmi" && (
          <div className="fade-in">
            <div style={{ textAlign:"center", padding:"2rem 1rem 1.5rem" }}>
              <span className="bounce-anim" style={{ display:"block", fontSize:"4.5rem" }}>🏃‍♂️</span>
              <h1 style={{ fontFamily:"Nunito", fontWeight:900, fontSize:"2.1rem", marginTop:"0.8rem" }} className="gradient-text">Your Smart Gym Buddy</h1>
              <p style={{ color:"rgba(255,255,255,.6)", marginTop:"0.4rem", maxWidth:480, margin:"0.4rem auto 0" }}>
                AI-powered BMI analysis, personalised meal plans via FastAPI + scikit-learn
              </p>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.5rem" }}>
              {/* inputs */}
              <Card>
                <h2 style={{ fontFamily:"Nunito", fontWeight:800, fontSize:"1.4rem", marginBottom:"1.2rem" }}>📋 About You</h2>
                <div style={{ display:"flex", flexDirection:"column", gap:"0.9rem" }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.9rem" }}>
                    <FormGroup label="Height (cm)"><input type="number" placeholder="e.g. 170" value={bmiForm.height_cm} onChange={e=>setBmiForm(f=>({...f,height_cm:+e.target.value}))} /></FormGroup>
                    <FormGroup label="Weight (kg)"><input type="number" placeholder="e.g. 68" value={bmiForm.weight_kg} onChange={e=>setBmiForm(f=>({...f,weight_kg:+e.target.value}))} /></FormGroup>
                    <FormGroup label="Age"><input type="number" placeholder="e.g. 24" value={bmiForm.age} onChange={e=>setBmiForm(f=>({...f,age:+e.target.value}))} /></FormGroup>
                    <FormGroup label="Gender">
                      <select value={bmiForm.gender} onChange={e=>setBmiForm(f=>({...f,gender:e.target.value}))}>
                        <option value="">Select...</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </FormGroup>
                  </div>
                  <FormGroup label="Goal">
                    <select value={bmiForm.goal} onChange={e=>setBmiForm(f=>({...f,goal:e.target.value}))}>
                      <option value="lose">🔥 Lose Weight</option>
                      <option value="maintain">⚖️ Maintain</option>
                      <option value="gain">💪 Gain Muscle</option>
                    </select>
                  </FormGroup>
                  <FormGroup label="Activity Level">
                    <select value={bmiForm.activity_level} onChange={e=>setBmiForm(f=>({...f,activity_level:+e.target.value}))}>
                      <option value={1.2}>🛋️ Sedentary</option>
                      <option value={1.375}>🚶 Lightly Active</option>
                      <option value={1.55}>🏃 Moderately Active</option>
                      <option value={1.725}>🔥 Very Active</option>
                      <option value={1.9}>⚡ Athlete</option>
                    </select>
                  </FormGroup>
                  <div>
                    <label>Dietary Preferences</label>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:"0.4rem", marginTop:"0.3rem" }}>
                      {["🥗 Vegan","🧀 Vegetarian","🍗 Keto","🥩 High Protein","🌾 Gluten Free","🍽️ Balanced"].map(p => (
                        <PillBtn key={p} label={p} active={bmiForm.preferences.includes(p.replace(/^.{2}/,"").trim())||bmiForm.preferences.includes(p)} onClick={()=>togglePref(p)} />
                      ))}
                    </div>
                  </div>
                  <button className="btn-main" onClick={calcBMI} style={{ width:"100%", justifyContent:"center" }}>✨ Calculate & Get Plan</button>
                </div>
              </Card>

              {/* results */}
              <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
                {!localBMI ? (
                  <Card style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", gap:"0.8rem" }}>
                    <div style={{ fontSize:"3.5rem" }}>🎯</div>
                    <h3 style={{ fontFamily:"Nunito", fontWeight:800, color:"#4FC3F7" }}>Results appear here</h3>
                    <p style={{ color:"rgba(255,255,255,.45)", fontSize:"0.82rem" }}>Fill in the form and hit the button!</p>
                  </Card>
                ) : (
                  <>
                    <Card>
                      <div style={{ textAlign:"center" }}>
                        <div style={{ width:130, height:130, borderRadius:"50%", border:`5px solid ${BMI_CATS[localBMI.cat].color}`, margin:"0 auto 0.8rem", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }} className="pulse-ring-anim">
                          <div style={{ fontFamily:"Nunito", fontSize:"2.3rem", fontWeight:900, color:BMI_CATS[localBMI.cat].color }}>{localBMI.bmi}</div>
                          <div style={{ fontSize:"0.7rem", color:"rgba(255,255,255,.6)" }}>BMI</div>
                        </div>
                        <div style={{ fontWeight:700, color:BMI_CATS[localBMI.cat].color }}>{BMI_CATS[localBMI.cat].emoji} {localBMI.cat}</div>
                        <p style={{ fontSize:"0.8rem", color:"rgba(255,255,255,.55)", marginTop:"0.4rem" }}>{BMI_CATS[localBMI.cat].advice}</p>
                      </div>
                      <div style={{ marginTop:"1rem", display:"flex", flexDirection:"column", gap:"0.5rem" }}>
                        {[["🔥 Daily TDEE",`${localBMI.tdee} kcal`],["🎯 Target",`${localBMI.target} kcal`]].map(([l,v])=>(
                          <div key={l} style={{ display:"flex", justifyContent:"space-between", background:"rgba(0,229,255,.07)", border:"1px solid rgba(0,229,255,.15)", borderRadius:12, padding:"0.65rem 1rem" }}>
                            <span style={{ fontSize:"0.85rem", color:"rgba(255,255,255,.75)" }}>{l}</span>
                            <span style={{ fontFamily:"Nunito", fontWeight:900, color:"#00E5FF" }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                    <Card style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                      <h3 style={{ fontFamily:"Nunito", fontWeight:800, color:"#4FC3F7", marginBottom:"0.8rem" }}>📊 Macro Split</h3>
                      <MacroDonut protein={localBMI.prot} carbs={localBMI.carb} fats={100-localBMI.prot-localBMI.carb} />
                    </Card>
                  </>
                )}
              </div>
            </div>

            {/* meal plan */}
            {localBMI && (
              <div style={{ marginTop:"2rem" }} className="fade-in">
                <h2 style={{ fontFamily:"Nunito", fontWeight:900, fontSize:"1.7rem" }} className="gradient-text">🥗 Your Daily Meal Plan</h2>
                <p style={{ color:"rgba(255,255,255,.5)", fontSize:"0.85rem", marginBottom:"1rem" }}>
                  ~{localBMI.meals.reduce((a,m)=>a+m.kcal,0)} kcal/day • Recommended by scikit-learn diet classifier
                </p>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))", gap:"1rem" }}>
                  {localBMI.meals.map(m => (
                    <div key={m.name} style={{ background:"rgba(255,255,255,.04)", border:"1px solid rgba(79,195,247,.2)", borderRadius:16, padding:"1.2rem", textAlign:"center", transition:"all .28s", cursor:"default" }}
                      onMouseOver={e=>e.currentTarget.style.background="rgba(79,195,247,.09)"}
                      onMouseOut={e=>e.currentTarget.style.background="rgba(255,255,255,.04)"}
                    >
                      <div style={{ fontSize:"2.3rem", marginBottom:"0.4rem" }}>{m.icon}</div>
                      <div style={{ color:"#00E5FF", fontSize:"0.85rem", fontWeight:700, marginBottom:"0.25rem" }}>{m.name}</div>
                      <p style={{ fontSize:"0.78rem", color:"rgba(255,255,255,.62)", lineHeight:1.55 }}>{m.desc}</p>
                      <div style={{ fontSize:"0.78rem", color:"#00E5FF", fontWeight:700, marginTop:"0.4rem" }}>{m.kcal} kcal</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: POSTURES ═══ */}
        {tab === "posture" && (
          <div className="fade-in">
            <div style={{ marginBottom:"1.4rem" }}>
              <h2 style={{ fontFamily:"Nunito", fontWeight:900, fontSize:"1.75rem" }} className="gradient-text">🤸 Exercise Posture Guide</h2>
              <p style={{ color:"rgba(255,255,255,.55)", fontSize:"0.87rem", marginTop:"0.25rem" }}>
                Tap any card for the full guide • Posture analysis powered by MediaPipe + OpenCV
              </p>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))", gap:"1.4rem" }}>
              {EXERCISES.map(ex => (
                <div key={ex.id} className="glass" onClick={() => setModal(ex)} style={{
                  cursor:"pointer", overflow:"hidden", transition:"all .3s",
                  borderColor:"rgba(79,195,247,.25)",
                }}
                  onMouseOver={e=>{ e.currentTarget.style.transform="translateY(-5px)"; e.currentTarget.style.borderColor=ex.color; e.currentTarget.style.boxShadow=`0 14px 38px ${ex.color}22` }}
                  onMouseOut={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.borderColor="rgba(79,195,247,.25)"; e.currentTarget.style.boxShadow="none" }}
                >
                  <div style={{ height:150, display:"flex", alignItems:"center", justifyContent:"center", background:`linear-gradient(135deg,${ex.color}22,${ex.color}0a)`, fontSize:"4.5rem" }}>
                    <span style={{ filter:`drop-shadow(0 0 12px ${ex.color}77)` }}>{ex.emoji}</span>
                  </div>
                  <div style={{ padding:"1.1rem" }}>
                    <h3 style={{ fontFamily:"Nunito", fontWeight:800, color:"#4FC3F7" }}>{ex.emoji} {ex.name}</h3>
                    <div style={{ margin:"0.35rem 0" }}>
                      {ex.muscles.map(m=><span key={m} style={{ display:"inline-block", background:"rgba(79,195,247,.18)", color:"#4FC3F7", borderRadius:20, padding:"0.15rem 0.6rem", fontSize:"0.72rem", fontWeight:700, margin:"0.12rem" }}>{m}</span>)}
                      <span style={{ display:"inline-block", background:"rgba(105,240,174,.18)", color:"#69F0AE", borderRadius:20, padding:"0.15rem 0.6rem", fontSize:"0.72rem", fontWeight:700, margin:"0.12rem" }}>{ex.diff}</span>
                    </div>
                    <p style={{ fontSize:"0.8rem", color:"rgba(255,255,255,.58)", lineHeight:1.6, marginTop:"0.4rem" }}>{ex.steps[0]}</p>
                    <p style={{ fontSize:"0.73rem", color:"rgba(255,255,255,.3)", marginTop:"0.6rem" }}>👆 Tap for full guide</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ TAB: PLAN ═══ */}
        {tab === "plan" && (
          <div className="fade-in">
            <div style={{ marginBottom:"1.4rem" }}>
              <h2 style={{ fontFamily:"Nunito", fontWeight:900, fontSize:"1.75rem" }} className="gradient-text">📅 Weekly Workout Planner</h2>
              <p style={{ color:"rgba(255,255,255,.55)", fontSize:"0.87rem" }}>Personalised via PyTorch workout recommender + your profile</p>
            </div>
            <Card style={{ marginBottom:"1.4rem" }}>
              <h2 style={{ fontFamily:"Nunito", fontWeight:800, fontSize:"1.35rem", marginBottom:"1rem" }}>⚙️ Your Profile</h2>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.9rem", marginBottom:"1rem" }}>
                <FormGroup label="Age"><input type="number" placeholder="e.g. 28" value={planForm.age} onChange={e=>setPlanForm(f=>({...f,age:+e.target.value}))} /></FormGroup>
                <FormGroup label="Gender">
                  <select value={planForm.gender} onChange={e=>setPlanForm(f=>({...f,gender:e.target.value}))}>
                    <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select>
                </FormGroup>
                <FormGroup label="Fitness Level">
                  <select value={planForm.fitness_level} onChange={e=>setPlanForm(f=>({...f,fitness_level:e.target.value}))}>
                    <option value="beginner">🌱 Beginner</option><option value="intermediate">⚡ Intermediate</option><option value="advanced">🔥 Advanced</option>
                  </select>
                </FormGroup>
                <FormGroup label="Goal">
                  <select value={planForm.goal} onChange={e=>setPlanForm(f=>({...f,goal:e.target.value}))}>
                    <option value="weight_loss">🔥 Weight Loss</option><option value="muscle">💪 Build Muscle</option>
                  </select>
                </FormGroup>
              </div>
              <button className="btn-main" onClick={genPlan} style={{ width:"100%", justifyContent:"center" }}>🗓️ Build My Week</button>
            </Card>

            {localPlan && (
              <div className="fade-in">
                <div style={{ background:"rgba(0,229,255,.05)", border:"1px solid rgba(0,229,255,.18)", borderRadius:16, padding:"1rem 1.4rem", marginBottom:"1rem", display:"flex", gap:"1rem", alignItems:"center" }}>
                  <div style={{ fontSize:"2rem" }}>{localPlan.level==="beginner"?"🌱":localPlan.level==="intermediate"?"⚡":"🔥"}</div>
                  <div>
                    <div style={{ fontFamily:"Nunito", fontWeight:800, color:"#00E5FF" }}>{localPlan.level.charAt(0).toUpperCase()+localPlan.level.slice(1)} Plan</div>
                    <div style={{ fontSize:"0.8rem", color:"rgba(255,255,255,.55)" }}>Generated by PyTorch workout recommender</div>
                  </div>
                </div>
                <div style={{ display:"grid", gap:"0.7rem" }}>
                  {localPlan.week.map(d => {
                    const lcolors = { rest:"#69F0AE", active:"#4FC3F7", hard:"#FF6B9D" }
                    const lbg    = { rest:"rgba(105,240,174,.13)", active:"rgba(79,195,247,.17)", hard:"rgba(255,107,157,.16)" }
                    const llabel = { rest:"😴 Rest", active:"✅ Active", hard:"🔥 Hard" }
                    return (
                      <div key={d.day} className="glass" style={{ padding:"0.95rem 1.4rem", display:"flex", alignItems:"center", gap:"1.1rem", cursor:"pointer", transition:"background .25s" }}
                        onMouseOver={e=>e.currentTarget.style.background="rgba(79,195,247,.09)"}
                        onMouseOut={e=>e.currentTarget.style.background="rgba(255,255,255,.07)"}
                      >
                        <div style={{ minWidth:54, textAlign:"center", background:"linear-gradient(135deg,#0288D1,#01579B)", borderRadius:11, padding:"0.35rem 0.5rem", fontSize:"0.72rem", fontWeight:800, fontFamily:"Nunito" }}>{d.day}</div>
                        <div style={{ fontSize:"1.65rem" }}>{d.icon}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:"0.92rem", fontWeight:700 }}>{d.name}</div>
                          <div style={{ fontSize:"0.77rem", color:"rgba(255,255,255,.52)" }}>{d.detail}</div>
                        </div>
                        <div style={{ padding:"0.25rem 0.75rem", borderRadius:20, fontSize:"0.72rem", fontWeight:700, background:lbg[d.lvl], color:lcolors[d.lvl], whiteSpace:"nowrap" }}>{llabel[d.lvl]}</div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"0.7rem", marginTop:"1rem" }}>
                  {[["🔥","Hard",localPlan.week.filter(d=>d.lvl==="hard").length,"#FF6B9D"],["✅","Active",localPlan.week.filter(d=>d.lvl==="active").length,"#4FC3F7"],["😴","Rest",localPlan.week.filter(d=>d.lvl==="rest").length,"#69F0AE"]].map(([ic,lb,n,c])=>(
                    <div key={lb} className="glass" style={{ textAlign:"center", padding:"0.9rem" }}>
                      <div style={{ fontSize:"1.65rem" }}>{ic}</div>
                      <div style={{ fontSize:"0.72rem", color:"rgba(255,255,255,.5)" }}>{lb} Days</div>
                      <div style={{ fontFamily:"Nunito", fontSize:"1.3rem", fontWeight:900, color:c }}>{n}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: ANALYTICS ═══ */}
        {tab === "analytics" && (
          <div className="fade-in">
            <div style={{ marginBottom:"1.4rem", display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:"0.5rem" }}>
              <div>
                <h2 style={{ fontFamily:"Nunito", fontWeight:900, fontSize:"1.75rem" }} className="gradient-text">📊 Analytics Dashboard</h2>
                <p style={{ color:"rgba(255,255,255,.55)", fontSize:"0.87rem" }}>Plotly + D3.js visualisations • Data stored in MongoDB + PostgreSQL</p>
              </div>
              <div style={{ display:"flex", gap:"0.5rem" }}>
                {["AWS S3","Firebase","PostgreSQL","MongoDB"].map(t=>(
                  <span key={t} style={{ background:"rgba(79,195,247,.12)", color:"#4FC3F7", borderRadius:10, padding:"0.2rem 0.65rem", fontSize:"0.7rem", fontWeight:700 }}>{t}</span>
                ))}
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem", marginBottom:"1rem" }}>
              <CaloriesBurnedChart data={analyticsData.weekly} />
              <PostureScoreChart data={analyticsData.weekly} />
              <WorkoutDurationChart data={analyticsData.weekly} />
              <BMIProgressChart data={analyticsData.bmiHistory} />
            </div>
            <Card>
              <h3 style={{ fontFamily:"Nunito", fontWeight:800, color:"#4FC3F7", marginBottom:"1rem" }}>🏗️ Tech Stack Overview</h3>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:"0.8rem" }}>
                {[
                  ["⚛️ Frontend","Next.js + React","#4FC3F7"],
                  ["🐍 Backend","FastAPI + Python","#69F0AE"],
                  ["🧠 AI/ML","TF + PyTorch + MediaPipe","#FF6B9D"],
                  ["💬 Chat AI","GPT-4 + HuggingFace","#FFD740"],
                  ["🗄️ Database","MongoDB + PostgreSQL","#CE93D8"],
                  ["☁️ Storage","AWS S3 + Firebase","#80DEEA"],
                  ["📊 Analytics","Plotly + D3.js","#4FC3F7"],
                  ["👁️ Vision","OpenCV + MediaPipe","#69F0AE"],
                ].map(([icon,label,color])=>(
                  <div key={label} style={{ background:"rgba(255,255,255,.04)", border:`1px solid ${color}33`, borderRadius:12, padding:"0.85rem", textAlign:"center" }}>
                    <div style={{ fontSize:"1.6rem" }}>{icon}</div>
                    <div style={{ fontSize:"0.78rem", fontWeight:700, color, marginTop:"0.35rem" }}>{label}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Posture Modal */}
      {modal && (
        <div onClick={e=>{ if(e.target===e.currentTarget) setModal(null) }} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.72)", backdropFilter:"blur(8px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div className="fade-in" style={{ background:"#0d2137", border:"1px solid rgba(79,195,247,.25)", borderRadius:24, maxWidth:540, width:"91%", maxHeight:"85vh", overflowY:"auto", padding:"2rem" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.4rem" }}>
              <h2 style={{ fontFamily:"Nunito", fontWeight:900 }}>{modal.emoji} {modal.name}</h2>
              <button onClick={()=>setModal(null)} style={{ background:"rgba(255,255,255,.09)", border:"none", color:"#fff", width:34, height:34, borderRadius:"50%", cursor:"pointer", fontSize:"1rem" }}>✕</button>
            </div>
            <div style={{ background:`linear-gradient(135deg,${modal.color}22,${modal.color}0a)`, borderRadius:14, padding:"1.5rem", textAlign:"center", marginBottom:"1.3rem", fontSize:"4rem" }}>
              {modal.emoji}
              <div style={{ marginTop:"0.5rem" }}>
                {modal.muscles.map(m=><span key={m} style={{ display:"inline-block", background:"rgba(79,195,247,.18)", color:"#4FC3F7", borderRadius:20, padding:"0.15rem 0.6rem", fontSize:"0.72rem", fontWeight:700, margin:"0.12rem" }}>{m}</span>)}
                <span style={{ display:"inline-block", background:"rgba(105,240,174,.18)", color:"#69F0AE", borderRadius:20, padding:"0.15rem 0.6rem", fontSize:"0.72rem", fontWeight:700, margin:"0.12rem" }}>{modal.diff}</span>
              </div>
            </div>
            <h3 style={{ fontFamily:"Nunito", fontWeight:800, color:"#4FC3F7", marginBottom:"0.9rem" }}>📋 Step-by-Step</h3>
            <ul style={{ listStyle:"none" }}>
              {modal.steps.map((s,i)=>(
                <li key={i} style={{ padding:"0.65rem 1rem", marginBottom:"0.45rem", borderRadius:11, background:"rgba(79,195,247,.07)", borderLeft:"3px solid #4FC3F7", fontSize:"0.86rem", lineHeight:1.6, animation:`fadeSlide 0.3s ${i*0.06}s ease backwards` }}>
                  <strong>Step {i+1}:</strong> {s}
                </li>
              ))}
            </ul>
            <div style={{ marginTop:"1rem", background:"rgba(0,229,255,.08)", border:"1px solid rgba(0,229,255,.22)", borderRadius:12, padding:"0.75rem 1rem", fontSize:"0.83rem", color:"#00E5FF", fontWeight:600 }}>{modal.tip}</div>
            <div style={{ marginTop:"0.8rem", background:"rgba(255,107,157,.07)", border:"1px solid rgba(255,107,157,.2)", borderRadius:12, padding:"0.75rem 1rem", fontSize:"0.8rem", color:"rgba(255,255,255,.65)" }}>
              <strong style={{ color:"#FF6B9D" }}>⚠️ Safety:</strong> Stop if you feel sharp pain. Consult a doctor before starting any new routine. Posture feedback via MediaPipe + OpenCV analysis.
            </div>
          </div>
        </div>
      )}

      <ChatBot onChat={chat} chatHistory={chatHistory} loading={llmLoading.chat} />
    </>
  )
}
