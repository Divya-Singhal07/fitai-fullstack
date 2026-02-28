// frontend/src/components/charts/AnalyticsCharts.tsx
"use client";
// using dynamic import for plotly because it's large and SSR breaks it
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getAnalytics } from "@/lib/api";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const BLUE  = "#4FC3F7";
const CYAN  = "#00E5FF";
const GREEN = "#69F0AE";
const PINK  = "#FF6B9D";
const GOLD  = "#FFD740";

const plotLayout = (title: string) => ({
  title: { text: title, font: { color: "#fff", size: 14, family: "Nunito" } },
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  font: { color: "rgba(255,255,255,0.7)", family: "Poppins" },
  margin: { t: 40, b: 40, l: 45, r: 15 },
  xaxis: { gridcolor: "rgba(79,195,247,0.1)", linecolor: "rgba(79,195,247,0.2)", zerolinecolor: "rgba(79,195,247,0.1)" },
  yaxis: { gridcolor: "rgba(79,195,247,0.1)", linecolor: "rgba(79,195,247,0.2)", zerolinecolor: "rgba(79,195,247,0.1)" },
  showlegend: false,
});

export function WeightChart({ data }: { data: { date: string; weight: number }[] }) {
  const trace = {
    x: data.map((d) => d.date),
    y: data.map((d) => d.weight),
    type: "scatter" as const,
    mode: "lines+markers" as const,
    line: { color: CYAN, width: 2 },
    marker: { color: CYAN, size: 5 },
    fill: "tozeroy" as const,
    fillcolor: "rgba(0,229,255,0.08)",
  };
  return (
    <Plot
      data={[trace]}
      layout={{ ...plotLayout("⚖️ Weight Progress (kg)"), height: 220 }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%" }}
    />
  );
}

export function CalorieChart({ data }: { data: { date: string; consumed: number; target: number; burned: number }[] }) {
  const consumed = { x: data.map(d => d.date), y: data.map(d => d.consumed), name: "Consumed", type: "bar" as const, marker: { color: BLUE, opacity: 0.8 } };
  const target   = { x: data.map(d => d.date), y: data.map(d => d.target), name: "Target", type: "scatter" as const, mode: "lines" as const, line: { color: GOLD, dash: "dot" as const, width: 2 } };
  const burned   = { x: data.map(d => d.date), y: data.map(d => d.burned), name: "Burned", type: "bar" as const, marker: { color: PINK, opacity: 0.7 } };

  return (
    <Plot
      data={[consumed, burned, target]}
      layout={{
        ...plotLayout("🔥 Calories (consumed vs burned)"),
        barmode: "group" as const,
        height: 220,
        showlegend: true,
        legend: { font: { color: "#fff", size: 11 }, bgcolor: "rgba(0,0,0,0)" },
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%" }}
    />
  );
}

export function PostureScoreChart({ data }: { data: { exercise: string; avg_score: number }[] }) {
  const trace = {
    theta: data.map(d => d.exercise),
    r:     data.map(d => d.avg_score),
    type: "scatterpolar" as const,
    fill: "toself" as const,
    fillcolor: "rgba(79,195,247,0.15)",
    line: { color: CYAN },
    marker: { color: CYAN },
  };
  return (
    <Plot
      data={[trace]}
      layout={{
        ...plotLayout("🏋️ Posture Quality by Exercise"),
        polar: {
          bgcolor: "rgba(0,0,0,0)",
          radialaxis: { visible: true, range: [0, 100], gridcolor: "rgba(79,195,247,0.15)", color: "rgba(255,255,255,0.4)" },
          angularaxis: { gridcolor: "rgba(79,195,247,0.15)", color: "rgba(255,255,255,0.6)" },
        },
        height: 260,
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%" }}
    />
  );
}

export function MacroDonut({ macros }: { macros: { protein_pct: number; carbs_pct: number; fats_pct: number } }) {
  const trace = {
    labels: ["Protein", "Carbs", "Fats"],
    values: [macros.protein_pct, macros.carbs_pct, macros.fats_pct],
    type: "pie" as const,
    hole: 0.55,
    marker: { colors: [GREEN, BLUE, GOLD] },
    textfont: { color: "#fff" },
  };
  return (
    <Plot
      data={[trace]}
      layout={{
        ...plotLayout("📊 Macro Split"),
        height: 220,
        showlegend: true,
        legend: { font: { color: "#fff", size: 11 }, bgcolor: "rgba(0,0,0,0)", orientation: "h" as const },
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%" }}
    />
  );
}

export function WorkoutFreqChart({ data }: { data: { week: string; sessions: number; avg_duration_min: number }[] }) {
  const bars = {
    x: data.map(d => d.week),
    y: data.map(d => d.sessions),
    type: "bar" as const,
    marker: {
      color: data.map(d => d.sessions >= 5 ? GREEN : d.sessions >= 3 ? BLUE : GOLD),
    },
    text: data.map(d => `${d.sessions} days`),
    textposition: "outside" as const,
    textfont: { color: "#fff", size: 11 },
  };
  return (
    <Plot
      data={[bars]}
      layout={{ ...plotLayout("📅 Weekly Workout Frequency"), height: 220, yaxis: { ...plotLayout("").yaxis, range: [0, 8] } }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%" }}
    />
  );
}


// ── Full analytics dashboard component ────────────────────────────────────
export default function AnalyticsDashboard({ userId = 1 }: { userId?: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalytics(userId)
      .then(setData)
      .catch(() => {
        // use mock data if api isn't running yet
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const mockData = {
    weight_series: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split("T")[0],
      weight: +(78 - i * 0.08 + (Math.random() - 0.5) * 0.6).toFixed(1),
    })),
    calorie_tracker: Array.from({ length: 14 }, (_, i) => ({
      date: new Date(Date.now() - (13 - i) * 86400000).toISOString().split("T")[0],
      consumed: 1600 + Math.floor(Math.random() * 800),
      target: 2000,
      burned: 200 + Math.floor(Math.random() * 300),
    })),
    pose_scores: [
      { exercise: "Squat",     avg_score: 78 },
      { exercise: "Push-up",   avg_score: 85 },
      { exercise: "Plank",     avg_score: 72 },
      { exercise: "Curl",      avg_score: 91 },
      { exercise: "Jacks",     avg_score: 88 },
    ],
    workout_freq: Array.from({ length: 8 }, (_, i) => ({
      week: `W${i + 1}`,
      sessions: 2 + Math.floor(Math.random() * 5),
      avg_duration_min: 25 + Math.floor(Math.random() * 40),
    })),
    streak_days: 7,
    total_workouts: 32,
    total_minutes: 1240,
  };

  const d = data || mockData;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      {/* stat pills */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {[
          { icon: "🔥", label: "Day Streak", val: d.streak_days },
          { icon: "🏋️", label: "Total Workouts", val: d.total_workouts },
          { icon: "⏱️", label: "Minutes Active", val: d.total_minutes.toLocaleString() },
        ].map((stat) => (
          <div key={stat.label} className="glass" style={{ padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.8rem" }}>{stat.icon}</div>
            <div style={{ fontFamily: "var(--font-nunito)", fontSize: "1.6rem", fontWeight: 900, color: "var(--accent)" }}>{stat.val}</div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* charts grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="glass" style={{ padding: "1rem" }}><WeightChart data={d.weight_series} /></div>
        <div className="glass" style={{ padding: "1rem" }}><WorkoutFreqChart data={d.workout_freq} /></div>
        <div className="glass" style={{ padding: "1rem", gridColumn: "1/-1" }}><CalorieChart data={d.calorie_tracker} /></div>
        <div className="glass" style={{ padding: "1rem" }}><PostureScoreChart data={d.pose_scores} /></div>
        <div className="glass" style={{ padding: "1rem" }}>
          <MacroDonut macros={{ protein_pct: 35, carbs_pct: 40, fats_pct: 25 }} />
        </div>
      </div>
    </div>
  );
}
