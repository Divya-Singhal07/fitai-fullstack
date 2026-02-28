// frontend/src/components/posture/WebcamPoseDetector.tsx
"use client";
// this component uses the webcam to capture frames and sends them
// to the fastapi backend which runs mediapipe on the server side.
// we draw the keypoint overlay on the canvas ourselves here.

import { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import { motion, AnimatePresence } from "framer-motion";
import { analyzePostureB64 } from "@/lib/api";

const EXERCISES = [
  { id: "squat",    label: "Squat",           emoji: "🏋️" },
  { id: "pushup",   label: "Push-up",          emoji: "💪" },
  { id: "curl",     label: "Arm Curl",         emoji: "🏋️‍♂️" },
  { id: "plank",    label: "Plank",            emoji: "🪨" },
];

interface PoseResult {
  exercise: string;
  score: number;
  errors: string[];
  suggestions: string[];
  angles: Record<string, number>;
  keypoints: { name: string; x: number; y: number; visibility: number }[];
}

export default function WebcamPoseDetector() {
  const webcamRef  = useRef<Webcam>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [exercise, setExercise]   = useState("squat");
  const [result, setResult]       = useState<PoseResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [live, setLive]           = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const drawKeypoints = useCallback((keypoints: PoseResult["keypoints"], w: number, h: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, w, h);

    keypoints.forEach(kp => {
      if (kp.visibility < 0.4) return;
      const x = kp.x * w;
      const y = kp.y * h;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#00E5FF";
      ctx.shadowColor = "#00E5FF";
      ctx.shadowBlur = 8;
      ctx.fill();
    });

    // draw some connecting lines (simplified skeleton)
    const pairs = [
      ["shoulder", "elbow"], ["elbow", "wrist"],
      ["r_shoulder", "r_elbow"], ["r_elbow", "r_wrist"],
      ["shoulder", "hip"], ["r_shoulder", "r_hip"],
      ["hip", "knee"], ["knee", "ankle"],
      ["r_hip", "r_knee"], ["r_knee", "r_ankle"],
    ];

    const kpMap: Record<string, { x: number; y: number; visibility: number }> = {};
    keypoints.forEach(k => { kpMap[k.name] = k; });

    ctx.strokeStyle = "rgba(79,195,247,0.6)";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 0;

    pairs.forEach(([a, b]) => {
      const kpA = kpMap[a];
      const kpB = kpMap[b];
      if (kpA && kpB && kpA.visibility > 0.4 && kpB.visibility > 0.4) {
        ctx.beginPath();
        ctx.moveTo(kpA.x * w, kpA.y * h);
        ctx.lineTo(kpB.x * w, kpB.y * h);
        ctx.stroke();
      }
    });
  }, []);

  const captureAndAnalyze = useCallback(async () => {
    const cam = webcamRef.current;
    if (!cam || analyzing) return;

    const screenshot = cam.getScreenshot();
    if (!screenshot) return;

    setAnalyzing(true);
    setError(null);

    try {
      const res = await analyzePostureB64(screenshot, exercise);
      setResult(res);
      // draw overlay
      const video = cam.video;
      if (video && canvasRef.current) {
        drawKeypoints(res.keypoints, video.videoWidth, video.videoHeight);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Analysis failed — make sure you're fully visible.");
    } finally {
      setAnalyzing(false);
    }
  }, [exercise, analyzing, drawKeypoints]);

  function toggleLive() {
    if (live) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setLive(false);
    } else {
      setLive(true);
      intervalRef.current = setInterval(captureAndAnalyze, 2000);
    }
  }

  const scoreColor = result
    ? result.score >= 80 ? "#69F0AE"
    : result.score >= 60 ? "#FFD740"
    : "#FF6B9D"
    : "#4FC3F7";

  return (
    <div>
      {/* exercise selector */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {EXERCISES.map(ex => (
          <button
            key={ex.id}
            onClick={() => { setExercise(ex.id); setResult(null); }}
            style={{
              padding: "0.4rem 1rem",
              borderRadius: 20,
              border: `1px solid ${exercise === ex.id ? "var(--accent)" : "rgba(79,195,247,0.25)"}`,
              background: exercise === ex.id ? "rgba(0,229,255,0.15)" : "transparent",
              color: exercise === ex.id ? "var(--accent)" : "rgba(255,255,255,0.6)",
              cursor: "pointer",
              fontSize: "0.82rem",
              fontFamily: "Poppins",
              fontWeight: exercise === ex.id ? 700 : 400,
              transition: "all 0.2s",
            }}
          >
            {ex.emoji} {ex.label}
          </button>
        ))}
      </div>

      {/* webcam + canvas overlay */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "#000" }}>
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            width="100%"
            videoConstraints={{ facingMode: "user", width: 640, height: 480 }}
            style={{ display: "block", width: "100%", borderRadius: 16 }}
          />
          <canvas
            ref={canvasRef}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          />
          {/* live indicator */}
          {live && (
            <div style={{
              position: "absolute", top: 10, left: 10,
              background: "rgba(255,107,157,0.9)",
              borderRadius: 20,
              padding: "0.2rem 0.6rem",
              fontSize: "0.75rem",
              fontWeight: 700,
              display: "flex", alignItems: "center", gap: "0.3rem",
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", display: "inline-block", animation: "pulse 1s infinite" }} />
              LIVE
            </div>
          )}
        </div>

        {/* feedback panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass"
                style={{ padding: "1rem" }}
              >
                {/* score ring */}
                <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
                  <div style={{
                    width: 80, height: 80,
                    borderRadius: "50%",
                    border: `4px solid ${scoreColor}`,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    margin: "0 auto",
                    color: scoreColor,
                  }}>
                    <div style={{ fontFamily: "var(--font-nunito)", fontSize: "1.6rem", fontWeight: 900, lineHeight: 1 }}>{result.score}</div>
                    <div style={{ fontSize: "0.65rem" }}>score</div>
                  </div>
                </div>

                {/* joint angles */}
                {Object.keys(result.angles).length > 0 && (
                  <div style={{ marginBottom: "0.75rem" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--sky)", marginBottom: "0.3rem" }}>📐 Joint Angles</div>
                    {Object.entries(result.angles).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "0.2rem" }}>
                        <span style={{ color: "rgba(255,255,255,0.65)" }}>{k.replace("_", " ")}</span>
                        <span style={{ fontWeight: 700, color: "var(--accent)" }}>{v}°</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* errors */}
                {result.errors.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--pink)", marginBottom: "0.3rem" }}>⚠️ Fix These</div>
                    {result.errors.map((e, i) => (
                      <div key={i} style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", padding: "0.3rem 0.5rem", background: "rgba(255,107,157,0.08)", borderRadius: 8, marginBottom: "0.25rem", borderLeft: "3px solid var(--pink)" }}>
                        {e}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div style={{ padding: "0.75rem", background: "rgba(255,107,157,0.1)", border: "1px solid rgba(255,107,157,0.3)", borderRadius: 12, fontSize: "0.8rem", color: "var(--pink)" }}>
              {error}
            </div>
          )}

          {/* buttons */}
          <button
            onClick={captureAndAnalyze}
            disabled={analyzing || live}
            style={{
              padding: "0.7rem", borderRadius: 50, border: "none",
              background: "linear-gradient(135deg, var(--ocean), var(--accent))",
              color: "#0A1929", fontFamily: "var(--font-nunito)", fontWeight: 800,
              cursor: analyzing ? "wait" : "pointer",
              opacity: (analyzing || live) ? 0.6 : 1,
              fontSize: "0.9rem",
            }}
          >
            {analyzing ? "⏳ Analysing..." : "📸 Analyse Posture"}
          </button>

          <button
            onClick={toggleLive}
            style={{
              padding: "0.7rem", borderRadius: 50,
              border: `1px solid ${live ? "var(--pink)" : "rgba(79,195,247,0.3)"}`,
              background: live ? "rgba(255,107,157,0.15)" : "transparent",
              color: live ? "var(--pink)" : "var(--sky)",
              fontFamily: "var(--font-nunito)", fontWeight: 800,
              cursor: "pointer", fontSize: "0.9rem",
            }}
          >
            {live ? "⏹ Stop Live Mode" : "▶ Live Analysis (every 2s)"}
          </button>
        </div>
      </div>
    </div>
  );
}
