// frontend/src/components/charts/D3Heatmap.tsx
"use client";
// D3 calendar heatmap - github-style activity grid
// runs entirely client-side, SSR would break d3 DOM operations

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface HeatmapDay { date: string; value: 0 | 1 | 2 | 3; }

const COLORS = {
  0: "rgba(79,195,247,0.05)",
  1: "rgba(79,195,247,0.3)",
  2: "rgba(0,229,255,0.6)",
  3: "#00E5FF",
};

const LABELS = { 0: "Rest", 1: "Light", 2: "Moderate", 3: "Intense" };
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["","Mon","","Wed","","Fri",""];

export default function D3Heatmap({ year = 2024 }: { year?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  // generate mock data - replace with api call in prod
  const mockData: HeatmapDay[] = (() => {
    const start = new Date(year, 0, 1);
    const days: HeatmapDay[] = [];
    for (let i = 0; i < 365; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const r = Math.random();
      days.push({
        date: d.toISOString().split("T")[0],
        value: (r < (isWeekend ? 0.35 : 0.55) ? (r < 0.2 ? 3 : r < 0.4 ? 2 : 1) : 0) as 0|1|2|3,
      });
    }
    return days;
  })();

  useEffect(() => {
    if (!svgRef.current) return;

    const cellSize  = 12;
    const cellGap   = 2;
    const cellStep  = cellSize + cellGap;
    const leftPad   = 28;
    const topPad    = 32;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const parseDate = d3.timeParse("%Y-%m-%d");
    const data = mockData.map(d => ({ ...d, dateObj: parseDate(d.date)! }));

    // week columns
    const firstDay = new Date(year, 0, 1);
    const firstWeekDay = firstDay.getDay();

    const tooltip = d3.select("body").select(".heatmap-tooltip");
    const tip = tooltip.empty()
      ? d3.select("body").append("div")
          .attr("class", "heatmap-tooltip")
          .style("position", "fixed")
          .style("background", "#0d2137")
          .style("border", "1px solid rgba(79,195,247,0.3)")
          .style("border-radius", "8px")
          .style("padding", "0.4rem 0.75rem")
          .style("font-size", "0.75rem")
          .style("color", "#fff")
          .style("pointer-events", "none")
          .style("opacity", "0")
          .style("z-index", "999")
      : tooltip;

    // draw cells
    svg.selectAll("rect.day")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "day")
      .attr("width", cellSize)
      .attr("height", cellSize)
      .attr("rx", 2)
      .attr("x", (d) => {
        const weekNum = d3.timeWeek.count(d3.timeYear(d.dateObj), d.dateObj);
        return leftPad + weekNum * cellStep;
      })
      .attr("y", (d) => topPad + d.dateObj.getDay() * cellStep)
      .attr("fill", (d) => COLORS[d.value])
      .style("cursor", "pointer")
      .on("mousemove", (event, d) => {
        tip
          .style("opacity", "1")
          .style("left", (event.clientX + 12) + "px")
          .style("top",  (event.clientY - 28) + "px")
          .html(`<strong>${d.date}</strong><br/>${LABELS[d.value]} workout`);
      })
      .on("mouseleave", () => tip.style("opacity", "0"));

    // month labels
    const months = d3.timeMonths(new Date(year, 0, 1), new Date(year + 1, 0, 1));
    svg.selectAll("text.month")
      .data(months)
      .enter()
      .append("text")
      .attr("class", "month")
      .attr("x", (d) => leftPad + d3.timeWeek.count(d3.timeYear(d), d) * cellStep)
      .attr("y", topPad - 8)
      .text((d) => MONTHS[d.getMonth()])
      .attr("fill", "rgba(255,255,255,0.5)")
      .style("font-size", "10px")
      .style("font-family", "Poppins");

    // day-of-week labels
    DAYS.forEach((label, i) => {
      if (!label) return;
      svg.append("text")
        .attr("x", leftPad - 5)
        .attr("y", topPad + i * cellStep + cellSize * 0.8)
        .text(label)
        .attr("fill", "rgba(255,255,255,0.4)")
        .style("font-size", "9px")
        .style("text-anchor", "end")
        .style("font-family", "Poppins");
    });

    // set svg dimensions
    const totalWeeks = 53;
    svg
      .attr("width", leftPad + totalWeeks * cellStep + 10)
      .attr("height", topPad + 7 * cellStep + 20);

  }, [year]);

  return (
    <div>
      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--sky)", marginBottom: "0.75rem", fontFamily: "var(--font-nunito)" }}>
        📅 {year} Activity Heatmap
      </div>
      <div style={{ overflowX: "auto" }}>
        <svg ref={svgRef} />
      </div>
      {/* legend */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem", fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }}>
        <span>Less</span>
        {([0,1,2,3] as const).map(v => (
          <div key={v} style={{ width: 12, height: 12, borderRadius: 2, background: COLORS[v] }} title={LABELS[v]} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
