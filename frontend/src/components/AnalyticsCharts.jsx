// components/AnalyticsCharts.jsx
// Plotly + D3 charts for workout analytics
// switched from recharts to Plotly because the 3D charts looked way cooler

import { useEffect, useRef } from "react"
import dynamic from "next/dynamic"

// dynamic import so Plotly doesn't break SSR
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

const BLUE   = "#4FC3F7"
const ACCENT = "#00E5FF"
const PINK   = "#FF6B9D"
const GREEN  = "#69F0AE"
const YELLOW = "#FFD740"

const plotLayout = (title) => ({
  title:      { text: title, font: { color: "#fff", family: "Nunito", size: 14 } },
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor:  "rgba(0,0,0,0)",
  font:       { color: "rgba(255,255,255,0.7)", family: "Poppins" },
  xaxis:      { gridcolor: "rgba(79,195,247,0.1)", zerolinecolor: "rgba(79,195,247,0.2)" },
  yaxis:      { gridcolor: "rgba(79,195,247,0.1)", zerolinecolor: "rgba(79,195,247,0.2)" },
  margin:     { t: 40, r: 20, b: 40, l: 40 },
  showlegend: false,
})

const plotConfig = { displayModeBar: false, responsive: true }

export function CaloriesBurnedChart({ data }) {
  if (!data) return <ChartSkeleton label="Calories Burned This Week" />
  const trace = {
    x: data.labels,
    y: data.calories_burned,
    type: "bar",
    marker: {
      color: data.calories_burned.map(v => v > 350 ? PINK : BLUE),
      line: { color: ACCENT, width: 1 },
    },
    hovertemplate: "%{y} kcal<extra></extra>",
  }
  return (
    <div className="glass p-4">
      <Plot data={[trace]} layout={plotLayout("🔥 Calories Burned")} config={plotConfig} style={{ width: "100%", height: 220 }} />
    </div>
  )
}

export function PostureScoreChart({ data }) {
  if (!data) return <ChartSkeleton label="Posture Scores" />
  const trace = {
    x: data.labels,
    y: data.posture_scores,
    type: "scatter",
    mode: "lines+markers",
    line:   { color: GREEN, width: 2.5, shape: "spline" },
    marker: { color: GREEN, size: 7, symbol: "circle" },
    fill:   "tozeroy",
    fillcolor: "rgba(105,240,174,0.08)",
    hovertemplate: "%{y}/100<extra></extra>",
  }
  return (
    <div className="glass p-4">
      <Plot data={[trace]} layout={plotLayout("🎯 Posture Scores")} config={plotConfig} style={{ width: "100%", height: 220 }} />
    </div>
  )
}

export function WorkoutDurationChart({ data }) {
  if (!data) return <ChartSkeleton label="Workout Duration" />
  const trace = {
    x: data.labels,
    y: data.workout_duration,
    type: "scatter",
    mode: "lines+markers",
    line:   { color: YELLOW, width: 2.5, shape: "spline" },
    marker: { color: YELLOW, size: 7 },
    fill:   "tozeroy",
    fillcolor: "rgba(255,215,64,0.07)",
    hovertemplate: "%{y} min<extra></extra>",
  }
  return (
    <div className="glass p-4">
      <Plot data={[trace]} layout={plotLayout("⏱️ Workout Duration (min)")} config={plotConfig} style={{ width: "100%", height: 220 }} />
    </div>
  )
}

export function BMIProgressChart({ data }) {
  if (!data) return <ChartSkeleton label="BMI Progress" />
  const trace = {
    x: data.labels,
    y: data.bmi_values,
    type: "scatter",
    mode: "lines+markers",
    line:   { color: ACCENT, width: 3, shape: "spline" },
    marker: { color: ACCENT, size: 8 },
    fill:   "tozeroy",
    fillcolor: "rgba(0,229,255,0.07)",
    hovertemplate: "BMI: %{y}<extra></extra>",
  }
  // shaded healthy range - a nice D3-style touch done in Plotly shapes
  const layout = {
    ...plotLayout("📉 BMI Over Time"),
    shapes: [
      { type: "rect", x0: data.labels[0], x1: data.labels.at(-1), y0: 18.5, y1: 24.9,
        fillcolor: "rgba(105,240,174,0.07)", line: { width: 0 } },
    ],
    annotations: [
      { x: data.labels[1], y: 21.5, text: "Healthy Range", showarrow: false,
        font: { color: "rgba(105,240,174,0.5)", size: 10 } },
    ],
  }
  return (
    <div className="glass p-4">
      <Plot data={[trace]} layout={layout} config={plotConfig} style={{ width: "100%", height: 220 }} />
    </div>
  )
}

// D3-powered macro donut chart – rendered in a canvas
export function MacroDonut({ protein = 30, carbs = 40, fats = 30 }) {
  const ref = useRef(null)

  useEffect(() => {
    if (typeof window === "undefined" || !ref.current) return
    import("d3").then(d3 => {
      const el = ref.current
      d3.select(el).selectAll("*").remove()

      const size = 160, r = 65, inner = 42
      const svg = d3.select(el)
        .append("svg").attr("width", size).attr("height", size)
        .append("g").attr("transform", `translate(${size/2},${size/2})`)

      const data = [
        { label: "Protein", value: protein, color: GREEN  },
        { label: "Carbs",   value: carbs,   color: BLUE   },
        { label: "Fats",    value: fats,    color: YELLOW },
      ]

      const pie   = d3.pie().value(d => d.value).sort(null)
      const arc   = d3.arc().innerRadius(inner).outerRadius(r).cornerRadius(3).padAngle(0.04)
      const arcHover = d3.arc().innerRadius(inner).outerRadius(r + 6).cornerRadius(3).padAngle(0.04)

      svg.selectAll("path").data(pie(data)).join("path")
        .attr("d", arc).attr("fill", d => d.data.color).attr("opacity", 0.88)
        .style("cursor", "pointer")
        .on("mouseover", function(e, d) { d3.select(this).transition().duration(180).attr("d", arcHover(d)) })
        .on("mouseout",  function(e, d) { d3.select(this).transition().duration(180).attr("d", arc(d)) })

      // centre label
      svg.append("text").attr("text-anchor", "middle").attr("dy", "-0.3em")
        .style("fill", "#fff").style("font-family", "Nunito").style("font-size", "11px").style("font-weight", "700").text("Macros")
      svg.append("text").attr("text-anchor", "middle").attr("dy", "1em")
        .style("fill", ACCENT).style("font-family", "Nunito").style("font-size", "9px").text("today")
    })
  }, [protein, carbs, fats])

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
      <div ref={ref} />
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
        {[["Protein", GREEN, protein], ["Carbs", BLUE, carbs], ["Fats", YELLOW, fats]].map(([l, c, v]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem" }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
            <span style={{ color: "rgba(255,255,255,0.7)" }}>{l}</span>
            <span style={{ color: c, fontWeight: 700 }}>{v}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChartSkeleton({ label }) {
  return (
    <div className="glass p-4" style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(79,195,247,0.3)", borderTopColor: "#4FC3F7", animation: "spin 1s linear infinite" }} />
      <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>{label}</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
