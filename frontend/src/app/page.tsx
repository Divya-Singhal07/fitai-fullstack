// frontend/src/app/page.tsx
"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useAppStore } from "@/store/useAppStore";
import { calculateBMI } from "@/lib/api";
import toast from "react-hot-toast";

// dynamic imports for heavy components
const AnalyticsDashboard  = dynamic(() => import("@/components/charts/AnalyticsCharts"), { ssr: false, loading: () => <Spinner /> });
const D3Heatmap           = dynamic(() => import("@/components/charts/D3Heatmap"),       { ssr: false, loading: () => <Spinner /> });
const AIChatPanel         = dynamic(() => import("@/components/chat/AIChatPanel"),       { ssr: false });
const WebcamPoseDetector  = dynamic(() => import("@/components/posture/WebcamPoseDetector"), { ssr: false });

function Spinner() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="spinner" />
    </div>
  );
}

const TABS = [
  { id: "bmi",       icon: "🏋️", label: "BMI & Diet"  },
  { id: "posture",   icon: "🤸", label: "AI Posture"  },
  { id: "plan",      icon: "📅", label: "My Plan"     },
  { id: "chat",      icon: "💬", label: "AI Coach"    },
  { id: "analytics", icon: "📊", label: "Analytics"   },
] as const;

export default function HomePage() {
  const { activeTab, setActiveTab, profile, setProfile, bmiResult, setBmiResult, isCalculating, setIsCalculating } = useAppStore();
  const [dietPills, setDietPills] = useState<string[]>(["balanced"]);

  function toggleDiet(d: string) {
    setDietPills(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  async function handleBMI() {
    if (!profile.height_cm || !profile.weight_kg) {
      toast.error("Please enter height and weight first!");
      return;
    }
    setIsCalculating(true);
    try {
      const result = await calculateBMI({
        height_cm:    profile.height_cm!,
        weight_kg:    profile.weight_kg!,
        age:          profile.age || 25,
        gender:       profile.gender || "male",
        activity_lvl: profile.activity_lvl || 1.55,
        goal:         profile.goal || "maintain",
      });
      setBmiResult(result);
      toast.success("BMI calculated! 🎉");
    } catch {
      // api not running — use local calculation
      const h = profile.height_cm! / 100;
      const bmi = profile.weight_kg! / (h * h);
      const cat = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy Weight" : bmi < 30 ? "Overweight" : "Obese";
      const col = bmi < 18.5 ? "#80DEEA" : bmi < 25 ? "#69F0AE" : bmi < 30 ? "#FFD740" : "#FF8A65";
      const bmr = profile.gender === "female"
        ? 10 * profile.weight_kg! + 6.25 * profile.height_cm! - 5 * (profile.age || 25) - 161
        : 10 * profile.weight_kg! + 6.25 * profile.height_cm! - 5 * (profile.age || 25) + 5;
      const tdee = bmr * (profile.activity_lvl || 1.55);
      const delta = { lose: -400, maintain: 0, gain: 350 }[profile.goal || "maintain"] || 0;
      setBmiResult({
        bmi: +bmi.toFixed(1), category: cat, color: col, bmr: +bmr.toFixed(0),
        tdee: +tdee.toFixed(0), target_calories: +(tdee + delta).toFixed(0),
        macros: { protein_pct: 30, carbs_pct: 40, fats_pct: 30, protein_g: 120, carbs_g: 200, fats_g: 67 },
        advice: "Stay consistent and track your progress! 💪",
      });
      toast.success("Calculated! (Backend offline — using local calc)");
    } finally {
      setIsCalculating(false);
    }
  }

  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      {/* nav */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(10,25,41,0.9)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(79,195,247,0.2)",
        padding: "0.9rem 2rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ fontFamily: "var(--font-nunito)", fontSize: "1.5rem", fontWeight: 900 }}>
          Fit<span style={{ color: "var(--accent)" }}>AI</span> 💪
        </div>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "0.38rem 0.9rem", borderRadius: 20, cursor: "pointer",
                fontFamily: "Poppins", fontSize: "0.82rem", fontWeight: 600,
                border: `1px solid ${activeTab === tab.id ? "var(--ocean)" : "transparent"}`,
                background: activeTab === tab.id ? "var(--ocean)" : "transparent",
                color: activeTab === tab.id ? "#fff" : "rgba(255,255,255,0.55)",
                transition: "all 0.25s",
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >

            {/* ── BMI & DIET ───────────────────────────────────────── */}
            {activeTab === "bmi" && (
              <div>
                <HeroSection />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1.5rem" }}>
                  {/* form */}
                  <div className="glass" style={{ padding: "1.5rem" }}>
                    <h2 style={{ fontFamily: "var(--font-nunito)", marginBottom: "1rem" }}>📋 Your Profile</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                      <FormField label="Height (cm)" type="number" placeholder="e.g. 170"
                        value={profile.height_cm || ""} onChange={v => setProfile({ height_cm: +v })} />
                      <FormField label="Weight (kg)" type="number" placeholder="e.g. 68"
                        value={profile.weight_kg || ""} onChange={v => setProfile({ weight_kg: +v })} />
                      <FormField label="Age" type="number" placeholder="e.g. 25"
                        value={profile.age || ""} onChange={v => setProfile({ age: +v })} />
                      <SelectField label="Gender" value={profile.gender || ""} onChange={v => setProfile({ gender: v as any })}
                        options={[{ value: "", label: "Select..." }, { value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }]} />
                      <SelectField label="Goal" value={profile.goal || "maintain"} onChange={v => setProfile({ goal: v as any })}
                        options={[{ value: "lose", label: "🔥 Lose Weight" }, { value: "maintain", label: "⚖️ Maintain" }, { value: "gain", label: "💪 Gain Muscle" }]} />
                      <SelectField label="Activity Level" value={String(profile.activity_lvl || 1.55)} onChange={v => setProfile({ activity_lvl: +v })}
                        options={[
                          { value: "1.2",   label: "🛋️ Sedentary" },
                          { value: "1.375", label: "🚶 Light" },
                          { value: "1.55",  label: "🏃 Moderate" },
                          { value: "1.725", label: "🔥 Very Active" },
                          { value: "1.9",   label: "⚡ Athlete" },
                        ]} />
                    </div>
                    <div style={{ marginTop: "0.85rem" }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--sky)" }}>Diet Preference</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.4rem" }}>
                        {["🥗 Vegan","🧀 Vegetarian","🍗 Keto","🥩 High Protein","🌾 Gluten Free","🍽️ Balanced"].map(d => {
                          const key = d.split(" ").slice(1).join(" ").toLowerCase();
                          const active = dietPills.includes(key);
                          return (
                            <button key={d} onClick={() => toggleDiet(key)}
                              style={{
                                padding: "0.28rem 0.8rem", borderRadius: 20, cursor: "pointer",
                                border: `1px solid ${active ? "var(--ocean)" : "rgba(79,195,247,0.25)"}`,
                                background: active ? "var(--ocean)" : "transparent",
                                color: active ? "#fff" : "rgba(255,255,255,0.6)",
                                fontSize: "0.78rem", fontFamily: "Poppins", transition: "all 0.2s",
                              }}>{d}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <button
                      onClick={handleBMI}
                      disabled={isCalculating}
                      style={{
                        marginTop: "1rem", width: "100%", padding: "0.75rem",
                        borderRadius: 50, border: "none", cursor: "pointer",
                        background: "linear-gradient(135deg, var(--ocean), var(--accent))",
                        color: "#0A1929", fontFamily: "var(--font-nunito)", fontWeight: 800, fontSize: "1rem",
                        opacity: isCalculating ? 0.7 : 1,
                      }}
                    >
                      {isCalculating ? "⏳ Calculating..." : "✨ Calculate & Get Plan"}
                    </button>
                  </div>

                  {/* result */}
                  <div>
                    {bmiResult ? <BMIResultCard result={bmiResult} /> : <EmptyState />}
                  </div>
                </div>

                {bmiResult && <DietPlanSection goal={profile.goal || "maintain"} dietPills={dietPills} tdee={bmiResult.tdee} />}
              </div>
            )}

            {/* ── POSTURE ─────────────────────────────────────────── */}
            {activeTab === "posture" && (
              <div>
                <div style={{ marginBottom: "1.5rem" }}>
                  <div className="gradient-text" style={{ fontFamily: "var(--font-nunito)", fontSize: "1.9rem", fontWeight: 900 }}>🤸 AI Posture Analysis</div>
                  <div style={{ color: "rgba(255,255,255,0.55)", marginTop: "0.3rem" }}>
                    Live webcam pose detection powered by MediaPipe + OpenCV on the backend
                  </div>
                  <TechBadges tags={["MediaPipe", "OpenCV", "FastAPI", "PyTorch"]} />
                </div>
                <div className="glass" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
                  <WebcamPoseDetector />
                </div>
                <ExerciseGuideGrid />
              </div>
            )}

            {/* ── PLAN ────────────────────────────────────────────── */}
            {activeTab === "plan" && <WeeklyPlanSection />}

            {/* ── CHAT ────────────────────────────────────────────── */}
            {activeTab === "chat" && (
              <div>
                <div style={{ marginBottom: "1.2rem" }}>
                  <div className="gradient-text" style={{ fontFamily: "var(--font-nunito)", fontSize: "1.9rem", fontWeight: 900 }}>💬 AI Fitness Coach</div>
                  <div style={{ color: "rgba(255,255,255,0.55)", marginTop: "0.25rem" }}>Powered by GPT-4 + HuggingFace intent classification</div>
                  <TechBadges tags={["GPT-4o", "HuggingFace", "SSE Streaming", "MongoDB"]} />
                </div>
                <div className="glass" style={{ overflow: "hidden" }}>
                  <AIChatPanel />
                </div>
              </div>
            )}

            {/* ── ANALYTICS ───────────────────────────────────────── */}
            {activeTab === "analytics" && (
              <div>
                <div style={{ marginBottom: "1.5rem" }}>
                  <div className="gradient-text" style={{ fontFamily: "var(--font-nunito)", fontSize: "1.9rem", fontWeight: 900 }}>📊 Your Analytics</div>
                  <div style={{ color: "rgba(255,255,255,0.55)", marginTop: "0.25rem" }}>Visualised with Plotly.js + D3.js</div>
                  <TechBadges tags={["Plotly.js", "D3.js", "PostgreSQL", "MongoDB"]} />
                </div>
                <AnalyticsDashboard userId={1} />
                <div className="glass" style={{ padding: "1.5rem", marginTop: "1rem" }}>
                  <D3Heatmap year={2024} />
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* floating mascot */}
      <MascotBot />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ textAlign: "center", padding: "2rem 0 1rem" }}
    >
      <motion.span
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{ display: "block", fontSize: "4.5rem", marginBottom: "0.5rem" }}
      >
        🏃‍♂️
      </motion.span>
      <h1 className="gradient-text" style={{ fontFamily: "var(--font-nunito)", fontSize: "2.3rem", fontWeight: 900 }}>
        Your Smart Gym Buddy
      </h1>
      <p style={{ color: "rgba(255,255,255,0.6)", marginTop: "0.5rem" }}>
        AI-powered BMI analysis, diet planning and workout coaching
      </p>
      <TechBadges tags={["Next.js 14", "FastAPI", "TensorFlow", "scikit-learn", "PostgreSQL", "AWS S3"]} />
    </motion.div>
  );
}

function TechBadges({ tags }: { tags: string[] }) {
  const colors = ["#4FC3F7","#00E5FF","#69F0AE","#FFD740","#FF6B9D","#CE93D8","#80DEEA"];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.6rem", justifyContent: "center" }}>
      {tags.map((t, i) => (
        <span key={t} style={{
          padding: "0.18rem 0.6rem",
          borderRadius: 20,
          fontSize: "0.7rem",
          fontWeight: 700,
          background: `${colors[i % colors.length]}22`,
          border: `1px solid ${colors[i % colors.length]}55`,
          color: colors[i % colors.length],
        }}>{t}</span>
      ))}
    </div>
  );
}

function FormField({ label, type, placeholder, value, onChange }: {
  label: string; type: string; placeholder: string; value: any; onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--sky)" }}>{label}</label>
      <input
        type={type} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: "0.6rem 0.9rem", borderRadius: 12,
          border: "1px solid rgba(79,195,247,0.25)",
          background: "rgba(255,255,255,0.05)", color: "#fff",
          fontFamily: "Poppins", fontSize: "0.88rem", outline: "none",
        }}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--sky)" }}>{label}</label>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        style={{
          padding: "0.6rem 0.9rem", borderRadius: 12,
          border: "1px solid rgba(79,195,247,0.25)",
          background: "#0d2137", color: "#fff",
          fontFamily: "Poppins", fontSize: "0.88rem", outline: "none",
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass" style={{ height: "100%", minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: "0.75rem" }}>
      <div style={{ fontSize: "3.5rem" }}>🎯</div>
      <h3 style={{ color: "var(--sky)", fontFamily: "var(--font-nunito)" }}>Results show here</h3>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.82rem" }}>Fill in your profile and hit Calculate</p>
    </div>
  );
}

function BMIResultCard({ result }: { result: any }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div className="glass" style={{ padding: "1.5rem", textAlign: "center" }}>
        <motion.div
          animate={{ boxShadow: [`0 0 0 0 ${result.color}44`, `0 0 0 16px ${result.color}00`, `0 0 0 0 ${result.color}44`] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            width: 120, height: 120, borderRadius: "50%",
            border: `5px solid ${result.color}`,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            margin: "0 auto 0.75rem",
          }}
        >
          <div style={{ fontFamily: "var(--font-nunito)", fontSize: "2.3rem", fontWeight: 900, color: result.color, lineHeight: 1 }}>{result.bmi}</div>
          <div style={{ fontSize: "0.7rem", color: result.color }}>BMI</div>
        </motion.div>
        <div style={{ color: result.color, fontWeight: 700, fontSize: "1rem" }}>{result.category}</div>
        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.55)", marginTop: "0.4rem" }}>{result.advice}</p>
      </div>

      <div className="glass" style={{ padding: "1rem" }}>
        {[
          { label: "Daily TDEE", val: `${result.tdee.toLocaleString()} kcal`, icon: "🔥" },
          { label: "Target Calories", val: `${result.target_calories.toLocaleString()} kcal`, icon: "🎯" },
        ].map(r => (
          <div key={r.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.55rem 0.75rem", background: "rgba(0,229,255,0.06)", borderRadius: 12, marginBottom: "0.45rem", border: "1px solid rgba(0,229,255,0.15)" }}>
            <span style={{ fontSize: "0.84rem", color: "rgba(255,255,255,0.7)" }}>{r.icon} {r.label}</span>
            <span style={{ fontFamily: "var(--font-nunito)", fontWeight: 900, color: "var(--accent)", fontSize: "1.1rem" }}>{r.val}</span>
          </div>
        ))}
        <div style={{ marginTop: "0.6rem" }}>
          {[
            { name: "Protein", pct: result.macros.protein_pct, g: result.macros.protein_g, color: "#69F0AE" },
            { name: "Carbs",   pct: result.macros.carbs_pct,   g: result.macros.carbs_g,   color: "#4FC3F7" },
            { name: "Fats",    pct: result.macros.fats_pct,    g: result.macros.fats_g,    color: "#FFD740" },
          ].map(m => (
            <div key={m.name} style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.45rem" }}>
              <div style={{ width: 64, fontSize: "0.76rem", color: "rgba(255,255,255,0.6)" }}>{m.name}</div>
              <div style={{ flex: 1, height: 9, background: "rgba(255,255,255,0.08)", borderRadius: 5, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${m.pct}%` }} transition={{ delay: 0.3, duration: 0.9 }}
                  style={{ height: "100%", borderRadius: 5, background: m.color }}
                />
              </div>
              <div style={{ fontSize: "0.76rem", fontWeight: 700, color: m.color, width: 44, textAlign: "right" }}>{m.g}g</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

const MEAL_DATA: Record<string, any> = {
  lose: {
    balanced: [
      { icon:"🍳", name:"Breakfast", desc:"Greek yogurt, granola & banana", kcal: 345 },
      { icon:"🥪", name:"Lunch",     desc:"Grilled turkey wrap with hummus & veggies", kcal: 445 },
      { icon:"🍊", name:"Snack",     desc:"Fruit salad with a handful of almonds", kcal: 195 },
      { icon:"🍗", name:"Dinner",    desc:"Baked chicken, brown rice & steamed veg", kcal: 490 },
    ],
    vegan: [
      { icon:"🥣", name:"Breakfast", desc:"Oatmeal with berries, chia seeds & almond milk", kcal: 320 },
      { icon:"🥗", name:"Lunch",     desc:"Chickpea Buddha bowl with quinoa & avocado", kcal: 470 },
      { icon:"🍎", name:"Snack",     desc:"Apple with almond butter & walnuts", kcal: 215 },
      { icon:"🍜", name:"Dinner",    desc:"Lentil soup with whole grain bread", kcal: 405 },
    ],
    keto: [
      { icon:"🥚", name:"Breakfast", desc:"Scrambled eggs, spinach, bacon & avocado", kcal: 430 },
      { icon:"🥩", name:"Lunch",     desc:"Chicken Caesar salad (no croutons)", kcal: 390 },
      { icon:"🧀", name:"Snack",     desc:"Cheese cubes, celery & peanut butter", kcal: 275 },
      { icon:"🐟", name:"Dinner",    desc:"Baked salmon with asparagus & zucchini noodles", kcal: 475 },
    ],
  },
  gain: {
    balanced: [
      { icon:"🥤", name:"Breakfast", desc:"Protein shake: banana, oats, peanut butter & whey", kcal: 545 },
      { icon:"🍛", name:"Lunch",     desc:"Large rice bowl with chicken & sweet potato", kcal: 750 },
      { icon:"🥚", name:"Snack",     desc:"3 boiled eggs with whole grain crackers", kcal: 375 },
      { icon:"🥩", name:"Dinner",    desc:"Steak, mashed potato & broccoli", kcal: 845 },
    ],
  },
  maintain: {
    balanced: [
      { icon:"🥞", name:"Breakfast", desc:"Whole wheat pancakes with fresh berries", kcal: 415 },
      { icon:"🍱", name:"Lunch",     desc:"Quinoa bowl with grilled salmon & olive oil", kcal: 595 },
      { icon:"🥜", name:"Snack",     desc:"Trail mix with a few dark chocolate pieces", kcal: 275 },
      { icon:"🍝", name:"Dinner",    desc:"Whole wheat pasta, turkey sauce & salad", kcal: 645 },
    ],
  },
};

function DietPlanSection({ goal, dietPills, tdee }: { goal: string; dietPills: string[]; tdee: number }) {
  const pref = dietPills.find(d => ["vegan","keto","high protein"].includes(d)) || "balanced";
  const planGroup = MEAL_DATA[goal] || MEAL_DATA.maintain;
  const meals = planGroup[pref] || planGroup.balanced || MEAL_DATA.maintain.balanced;
  const total = meals.reduce((s: number, m: any) => s + m.kcal, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: "2rem" }}>
      <div style={{ marginBottom: "1rem" }}>
        <div className="gradient-text" style={{ fontFamily: "var(--font-nunito)", fontSize: "1.7rem", fontWeight: 900 }}>🥗 Your Daily Meal Plan</div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
          ~{total} kcal / day &nbsp;•&nbsp; Powered by scikit-learn diet recommender
        </div>
        <TechBadges tags={["scikit-learn", "PostgreSQL", "FastAPI", "AWS S3"]} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "1rem" }}>
        {meals.map((m: any, i: number) => (
          <motion.div
            key={m.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass"
            style={{ padding: "1.2rem", textAlign: "center", transition: "all 0.3s" }}
            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-4px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <div style={{ fontSize: "2.3rem", marginBottom: "0.4rem" }}>{m.icon}</div>
            <div style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.25rem" }}>{m.name}</div>
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.62)", lineHeight: 1.55 }}>{m.desc}</p>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--accent)", marginTop: "0.4rem" }}>{m.kcal} kcal</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

const EXERCISE_GUIDES = [
  { id:"squat",    name:"Squats",           emoji:"🏋️",   color:"#4FC3F7", difficulty:"Beginner",          muscles:["Quads","Glutes","Core"],      steps:["Stand shoulder-width apart, toes slightly out","Keep chest tall and spine straight","Lower hips back and down, knees over toes","Thighs parallel to floor at bottom","Drive through heels to stand. Exhale up.","Never let knees cave inward — push out!"], tip:"Holding arms forward helps with balance" },
  { id:"pushup",   name:"Push-ups",         emoji:"💪",   color:"#FF6B9D", difficulty:"Beginner",          muscles:["Chest","Triceps","Shoulders"],  steps:["Hands slightly wider than shoulder-width","Straight line from head to heels","Lower chest to floor, elbows at 45°","Stop just before chest touches","Push through palms to return","Inhale down, exhale up"], tip:"Squeeze glutes the entire time" },
  { id:"jacks",    name:"Jumping Jacks",    emoji:"⭐",   color:"#FFD740", difficulty:"Beginner",          muscles:["Full Body","Cardio"],           steps:["Start standing, feet together","Jump and spread feet shoulder-width","Raise arms overhead in arc","Jump back, arms return to sides","Keep a steady rhythmic pace","Land with slight knee bend"], tip:"Core engagement improves balance" },
  { id:"curl",     name:"Dumbbell Curls",   emoji:"🏋️‍♂️", color:"#69F0AE", difficulty:"Beginner",          muscles:["Biceps","Forearms"],           steps:["Hold dumbbells, palms forward","Elbows pinned close to torso","Curl up, breathing out","Hold at top — fully contract","Slowly lower back down","Keep torso still — no swinging!"], tip:"If you must swing, the weight is too heavy" },
  { id:"kneepush", name:"Knee Push-ups",    emoji:"🧎",   color:"#CE93D8", difficulty:"Beginner-Friendly", muscles:["Chest","Triceps","Core"],      steps:["Kneel, hands wider than shoulders","Walk hands forward to diagonal","Lower chest to floor, back straight","Push up — don't sag or hike hips","Great stepping stone to full push-ups","Do 15 clean reps then progress!"], tip:"Cross ankles in air for extra core work" },
  { id:"plank",    name:"Plank Hold",       emoji:"🪨",   color:"#80DEEA", difficulty:"Beginner",          muscles:["Core","Shoulders","Back"],     steps:["Forearms flat, elbows under shoulders","Extend legs, balance on feet","Rigid line from head to heels","Breathe steadily — don't hold breath","Start 20-30s, build up gradually","If hips drop or rise, rest and reset"], tip:"Look slightly forward for neutral neck" },
];

function ExerciseGuideGrid() {
  const [selected, setSelected] = useState<typeof EXERCISE_GUIDES[0] | null>(null);

  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        <div className="gradient-text" style={{ fontFamily: "var(--font-nunito)", fontSize: "1.5rem", fontWeight: 900 }}>📖 Exercise Guide Library</div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.82rem", marginTop: "0.2rem" }}>Tap any card for full posture breakdown</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        {EXERCISE_GUIDES.map(ex => (
          <motion.div
            key={ex.id}
            whileHover={{ y: -4, boxShadow: `0 16px 40px ${ex.color}22` }}
            className="glass"
            style={{ cursor: "pointer", overflow: "hidden", border: `1px solid ${ex.color}33` }}
            onClick={() => setSelected(ex)}
          >
            <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3.5rem", background: `linear-gradient(135deg, ${ex.color}22, ${ex.color}0a)` }}>
              {ex.emoji}
            </div>
            <div style={{ padding: "1rem" }}>
              <h3 style={{ color: "var(--sky)", fontFamily: "var(--font-nunito)", marginBottom: "0.35rem" }}>{ex.emoji} {ex.name}</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.2rem", marginBottom: "0.5rem" }}>
                {ex.muscles.map(m => <span key={m} style={{ padding: "0.15rem 0.55rem", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700, background: "rgba(79,195,247,0.15)", color: "var(--sky)" }}>{m}</span>)}
                <span style={{ padding: "0.15rem 0.55rem", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700, background: "rgba(105,240,174,0.15)", color: "var(--green)" }}>{ex.difficulty}</span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.55)" }}>{ex.steps[0]}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* exercise modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: "#0d2137", border: "1px solid rgba(79,195,247,0.25)", borderRadius: 24, maxWidth: 520, width: "100%", maxHeight: "85vh", overflowY: "auto", padding: "2rem" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
                <h2 style={{ fontFamily: "var(--font-nunito)" }}>{selected.emoji} {selected.name}</h2>
                <button onClick={() => setSelected(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: "50%", cursor: "pointer" }}>✕</button>
              </div>
              <div style={{ fontSize: "4rem", textAlign: "center", padding: "1rem", background: `linear-gradient(135deg,${selected.color}22,${selected.color}0a)`, borderRadius: 14, marginBottom: "1.2rem" }}>{selected.emoji}</div>
              <h3 style={{ color: "var(--sky)", marginBottom: "0.75rem" }}>📋 Step-by-Step</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {selected.steps.map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                    style={{ padding: "0.6rem 0.9rem", borderRadius: 10, background: "rgba(79,195,247,0.07)", borderLeft: "3px solid var(--sky)", fontSize: "0.85rem", lineHeight: 1.6 }}>
                    <strong>Step {i + 1}:</strong> {s}
                  </motion.div>
                ))}
              </div>
              <div style={{ marginTop: "0.9rem", padding: "0.75rem 1rem", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 12, fontSize: "0.82rem", color: "var(--accent)" }}>
                💡 {selected.tip}
              </div>
              <div style={{ marginTop: "0.6rem", padding: "0.75rem", background: "rgba(255,107,157,0.07)", border: "1px solid rgba(255,107,157,0.2)", borderRadius: 12, fontSize: "0.8rem", color: "rgba(255,255,255,0.65)" }}>
                <strong style={{ color: "var(--pink)" }}>⚠️ Safety:</strong> Stop if you feel sharp pain. Consult a doctor before starting.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const WEEKLY_PLANS: Record<string, Record<string, any[]>> = {
  beginner: {
    weight_loss: [
      { day:"Mon", icon:"🚶", name:"Cardio Start",    detail:"20min walk + Jumping Jacks 3×15 + Knee Push-ups 2×10", lvl:"active" },
      { day:"Tue", icon:"🧘", name:"Active Rest",     detail:"Light stretching + 20min yoga",                         lvl:"rest" },
      { day:"Wed", icon:"💪", name:"Strength Basics", detail:"Squats 3×12 + Knee Push-ups 3×10 + Arm Curls 2×12",   lvl:"active" },
      { day:"Thu", icon:"🏃", name:"Cardio Burst",    detail:"Jumping Jacks 4×20 + High Knees 3×30sec",              lvl:"hard" },
      { day:"Fri", icon:"🌟", name:"Full Body Light", detail:"Plank 3×20sec + Squats 2×15 + Arm Curls 2×10",        lvl:"active" },
      { day:"Sat", icon:"⚽", name:"Fun Activity",    detail:"30min walk/jog or any sport you enjoy",                lvl:"active" },
      { day:"Sun", icon:"😴", name:"Rest Day",        detail:"Full rest, hydrate, prep meals for the week!",         lvl:"rest" },
    ],
    muscle: [
      { day:"Mon", icon:"💪", name:"Upper Body",   detail:"Knee Push-ups 3×12 + Arm Curls 3×10 + Plank 3×20sec", lvl:"active" },
      { day:"Tue", icon:"🦵", name:"Lower Body",   detail:"Squats 4×15 + Reverse lunges 2×10 + Calf raises 3×20", lvl:"hard" },
      { day:"Wed", icon:"💤", name:"Rest",         detail:"Full rest or gentle 15min walk", lvl:"rest" },
      { day:"Thu", icon:"🔥", name:"Push Day",     detail:"Knee Push-ups 4×12 + Squats 3×12 + Chair dips 2×10",   lvl:"hard" },
      { day:"Fri", icon:"🧲", name:"Pull & Core",  detail:"Arm Curls 3×12 + Plank 3×30sec + Superman holds 2×10", lvl:"active" },
      { day:"Sat", icon:"🧘", name:"Recovery",     detail:"Yoga or stretching – 30min",                            lvl:"rest" },
      { day:"Sun", icon:"😴", name:"Rest",         detail:"Total rest. Muscle rebuilds when you sleep!",           lvl:"rest" },
    ],
  },
  intermediate: {
    weight_loss: [
      { day:"Mon", icon:"⚡", name:"HIIT Cardio",    detail:"Burpees 3×10 + Jumping Jacks 4×30 + High Knees 4×40sec", lvl:"hard" },
      { day:"Tue", icon:"💪", name:"Upper Strength", detail:"Push-ups 4×15 + Arm Curls 4×12 + Diamond Push-ups 3×10", lvl:"active" },
      { day:"Wed", icon:"🦵", name:"Lower Strength", detail:"Squats 4×20 + Jump Squats 3×12 + Lunges 3×15",           lvl:"hard" },
      { day:"Thu", icon:"🧘", name:"Active Rest",    detail:"Yoga / foam rolling / easy walk 30min",                   lvl:"rest" },
      { day:"Fri", icon:"🔄", name:"Full Circuit",   detail:"4 rounds: Push-ups + Squats + Curls + Plank 45sec",       lvl:"hard" },
      { day:"Sat", icon:"🚴", name:"Cardio Fun",     detail:"Cycle, jog or swim – 45min",                              lvl:"active" },
      { day:"Sun", icon:"😴", name:"Rest",           detail:"Full rest and recovery",                                   lvl:"rest" },
    ],
    muscle: [
      { day:"Mon", icon:"🏋️", name:"Chest & Tris", detail:"Push-ups 5×20 + Tricep dips 4×15 + Plank 3×45sec", lvl:"hard" },
      { day:"Tue", icon:"💪", name:"Back & Bis",    detail:"Curls 4×15 + Reverse curls 3×12 + Superman 3×12",  lvl:"active" },
      { day:"Wed", icon:"🦵", name:"Leg Day",       detail:"Squats 5×15 + Jump Squats 4×10 + Calf raises 4×25", lvl:"hard" },
      { day:"Thu", icon:"💤", name:"Rest",          detail:"Rest or 20min yoga", lvl:"rest" },
      { day:"Fri", icon:"⭐", name:"Full Body",     detail:"Circuit: Push-ups + Squats + Curls + Jacks + Plank",  lvl:"hard" },
      { day:"Sat", icon:"🪨", name:"Core Focus",    detail:"Plank 4×60sec + Mountain climbers 4×30 + V-sits 3×15", lvl:"active" },
      { day:"Sun", icon:"😴", name:"Rest",          detail:"Recovery day — eat well and sleep!",                  lvl:"rest" },
    ],
  },
  advanced: {
    weight_loss: [
      { day:"Mon", icon:"💥", name:"HIIT Blast",    detail:"5×15 Burpees + 5×20 Jump Squats + 5×20 Push-ups + 5×60sec Plank", lvl:"hard" },
      { day:"Tue", icon:"💪", name:"Upper Power",   detail:"Push-up variations 5×20 + Curls 5×15 + Decline Push-ups 4×15",    lvl:"hard" },
      { day:"Wed", icon:"🦵", name:"Leg Power",     detail:"Jump Squats 6×15 + Split squats 4×15 + Calf raises 5×30",          lvl:"hard" },
      { day:"Thu", icon:"🧘", name:"Recovery",      detail:"Easy 40min swim or cycle. Don't skip this!",                       lvl:"active" },
      { day:"Fri", icon:"🔥", name:"Full Circuit",  detail:"5 rounds: 20 push-ups + 20 squats + 20 jacks + 15 curls + 45sec plank", lvl:"hard" },
      { day:"Sat", icon:"🏃", name:"Run",           detail:"5km or 45min jog at a strong steady pace",                         lvl:"hard" },
      { day:"Sun", icon:"😴", name:"Rest",          detail:"Full recovery. Sleep 8hrs, eat well.",                             lvl:"rest" },
    ],
    muscle: [
      { day:"Mon", icon:"💥", name:"Chest Blast",    detail:"Push-ups 6×20 + Wide push-ups 5×15 + Decline 4×15 + Plank 4×60sec", lvl:"hard" },
      { day:"Tue", icon:"💪", name:"Arms & Back",    detail:"Curls 6×15 + Hammer curls 5×12 + Chin-ups 4×8",                    lvl:"hard" },
      { day:"Wed", icon:"🦵", name:"Leg Day 🔥",    detail:"Squats 6×20 + Jump squats 5×15 + Pistol squats 3×8 each",           lvl:"hard" },
      { day:"Thu", icon:"🧘", name:"Rest",           detail:"Full rest or 30min yoga/mobility only",                             lvl:"rest" },
      { day:"Fri", icon:"🎯", name:"Shoulders+Core", detail:"Pike push-ups 5×15 + Plank 5×60sec + Mountain climbers 5×30",      lvl:"hard" },
      { day:"Sat", icon:"⭐", name:"Giant Circuit",  detail:"6 rounds: 25 push-ups + 25 squats + 20 curls + 30 jacks + 60sec plank", lvl:"hard" },
      { day:"Sun", icon:"😴", name:"Rest",           detail:"Rest completely. Muscle grows when you sleep!",                     lvl:"rest" },
    ],
  },
};

function WeeklyPlanSection() {
  const { profile, setProfile } = useAppStore();
  const [level, setLevel] = useState<"beginner"|"intermediate"|"advanced">("beginner");
  const [planGoal, setPlanGoal] = useState<"weight_loss"|"muscle">("weight_loss");
  const [generated, setGenerated] = useState(false);

  const age = profile.age || 25;
  const effectiveLevel = age > 65 && level === "advanced" ? "intermediate" : age > 72 ? "beginner" : level;
  const planData = WEEKLY_PLANS[effectiveLevel]?.[planGoal] || WEEKLY_PLANS.beginner.weight_loss;

  return (
    <div>
      <div style={{ marginBottom: "1.4rem" }}>
        <div className="gradient-text" style={{ fontFamily: "var(--font-nunito)", fontSize: "1.9rem", fontWeight: 900 }}>📅 Weekly Workout Planner</div>
        <div style={{ color: "rgba(255,255,255,0.5)", marginTop: "0.25rem" }}>AI-generated plan powered by PyTorch + scikit-learn</div>
        <TechBadges tags={["PyTorch", "scikit-learn", "FastAPI", "PostgreSQL"]} />
      </div>

      <div className="glass" style={{ padding: "1.5rem", marginBottom: "1.2rem" }}>
        <h2 style={{ fontFamily: "var(--font-nunito)", marginBottom: "1rem" }}>⚙️ Your Profile</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.85rem", marginBottom: "1rem" }}>
          <SelectField label="Age Group" value={String(profile.age || "")} onChange={v => setProfile({ age: +v })}
            options={[{ value:"20",label:"20s" },{ value:"30",label:"30s" },{ value:"40",label:"40s" },{ value:"55",label:"50s" },{ value:"65",label:"60s+" }]} />
          <SelectField label="Fitness Level" value={level} onChange={v => setLevel(v as any)}
            options={[{ value:"beginner",label:"🌱 Beginner" },{ value:"intermediate",label:"⚡ Intermediate" },{ value:"advanced",label:"🔥 Advanced" }]} />
          <SelectField label="Goal" value={planGoal} onChange={v => setPlanGoal(v as any)}
            options={[{ value:"weight_loss",label:"🔥 Weight Loss" },{ value:"muscle",label:"💪 Build Muscle" }]} />
        </div>
        <button
          onClick={() => setGenerated(true)}
          style={{ padding: "0.7rem 2rem", borderRadius: 50, border: "none", cursor: "pointer", background: "linear-gradient(135deg, var(--ocean), var(--accent))", color: "#0A1929", fontFamily: "var(--font-nunito)", fontWeight: 800, fontSize: "0.95rem" }}
        >
          🗓️ Generate My Week
        </button>
      </div>

      <AnimatePresence>
        {generated && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {planData.map((d: any, i: number) => {
                const badge = d.lvl === "rest" ? { label:"😴 Rest", bg:"rgba(105,240,174,0.12)", color:"#69F0AE" }
                  : d.lvl === "hard" ? { label:"🔥 Hard", bg:"rgba(255,107,157,0.12)", color:"#FF6B9D" }
                  : { label:"✅ Active", bg:"rgba(79,195,247,0.15)", color:"#4FC3F7" };

                return (
                  <motion.div
                    key={d.day}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="glass"
                    style={{ padding: "0.95rem 1.3rem", display: "flex", alignItems: "center", gap: "1rem", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(79,195,247,0.1)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                  >
                    <div style={{ minWidth: 52, textAlign: "center", background: "linear-gradient(135deg, var(--ocean), var(--deep))", borderRadius: 10, padding: "0.3rem", fontSize: "0.72rem", fontWeight: 800, fontFamily: "var(--font-nunito)" }}>{d.day}</div>
                    <div style={{ fontSize: "1.6rem" }}>{d.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{d.name}</div>
                      <div style={{ fontSize: "0.77rem", color: "rgba(255,255,255,0.52)", marginTop: "0.1rem" }}>{d.detail}</div>
                    </div>
                    <div style={{ padding: "0.25rem 0.7rem", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, background: badge.bg, color: badge.color, whiteSpace: "nowrap" }}>{badge.label}</div>
                  </motion.div>
                );
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.7rem", marginTop: "1rem" }}>
              {[
                { icon:"🔥", label:"Hard Days",   val: planData.filter((d:any)=>d.lvl==="hard").length,   color:"var(--pink)"  },
                { icon:"✅", label:"Active Days",  val: planData.filter((d:any)=>d.lvl==="active").length, color:"var(--sky)"   },
                { icon:"😴", label:"Rest Days",    val: planData.filter((d:any)=>d.lvl==="rest").length,   color:"var(--green)" },
              ].map(s => (
                <div key={s.label} className="glass" style={{ padding: "0.9rem", textAlign: "center" }}>
                  <div style={{ fontSize: "1.6rem" }}>{s.icon}</div>
                  <div style={{ fontFamily: "var(--font-nunito)", fontSize: "1.5rem", fontWeight: 900, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const BOT_LINES = [
  "💪 Every rep counts. Keep going!",
  "🥗 Remember to drink water today!",
  "😴 Sleep is where the gains happen.",
  "🔥 Progress over perfection, always.",
  "⭐ You showed up today. That matters.",
  "💧 Hydrate! Your muscles need it.",
  "🌱 Small steps lead to big changes.",
];

function MascotBot() {
  const [msg, setMsg] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setMsg("👋 Hi! I'm FitAI! Fill in your details to get started!"), 1500);
    const hide = setTimeout(() => setMsg(null), 6000);
    return () => { clearTimeout(t); clearTimeout(hide); };
  }, []);

  function talk() {
    setMsg(BOT_LINES[idx % BOT_LINES.length]);
    setIdx(i => i + 1);
    setTimeout(() => setMsg(null), 3800);
  }

  return (
    <div style={{ position: "fixed", bottom: "1.8rem", right: "1.8rem", zIndex: 50 }}>
      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: "absolute", bottom: 66, right: 0,
              background: "var(--ocean)", borderRadius: "14px 14px 0 14px",
              padding: "0.7rem 1rem", minWidth: 175,
              fontSize: "0.79rem", fontWeight: 600,
              boxShadow: "0 8px 28px rgba(0,0,0,0.28)",
            }}
          >
            {msg}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        animate={{ boxShadow: ["0 0 0 0 rgba(0,229,255,0.4)", "0 0 0 12px rgba(0,229,255,0)", "0 0 0 0 rgba(0,229,255,0.4)"] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        onClick={talk}
        style={{
          width: 54, height: 54, borderRadius: "50%",
          background: "linear-gradient(135deg, var(--ocean), var(--accent))",
          border: "none", fontSize: "1.7rem", cursor: "pointer",
        }}
      >
        🤖
      </motion.button>
    </div>
  );
}
