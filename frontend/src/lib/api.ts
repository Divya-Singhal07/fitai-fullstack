// frontend/src/lib/api.ts
import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// ── BMI ──────────────────────────────────────────────────────────────────
export async function calculateBMI(payload: {
  height_cm: number;
  weight_kg: number;
  age: number;
  gender: string;
  activity_lvl: number;
  goal: string;
}) {
  const { data } = await api.post("/api/bmi/calculate", payload);
  return data;
}

// ── Diet ─────────────────────────────────────────────────────────────────
export async function getDietPlan(profile: Record<string, unknown>) {
  const { data } = await api.post("/api/diet/recommend", profile);
  return data;
}

// ── Workout plan ──────────────────────────────────────────────────────────
export async function getWeeklyPlan(profile: Record<string, unknown>) {
  const { data } = await api.post("/api/workout/weekly", profile);
  return data;
}

// ── Posture analysis ──────────────────────────────────────────────────────
export async function analyzePostureB64(image_b64: string, exercise: string) {
  const { data } = await api.post("/api/posture/analyze-base64", {
    image: image_b64,
    exercise,
  });
  return data;
}

// ── Analytics ─────────────────────────────────────────────────────────────
export async function getAnalytics(userId: number) {
  const { data } = await api.get(`/api/analytics/overview/${userId}`);
  return data;
}

export async function getHeatmapData(userId: number, year: number) {
  const { data } = await api.get(`/api/analytics/d3/heatmap/${userId}?year=${year}`);
  return data;
}

// ── File upload ────────────────────────────────────────────────────────────
export async function uploadFile(file: File, folder = "uploads") {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  const { data } = await api.post("/api/upload/file", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// ── Streaming chat ─────────────────────────────────────────────────────────
export function streamChat(
  messages: { role: string; content: string }[],
  sessionId: string,
  userContext: Record<string, unknown>,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (e: string) => void
) {
  const body = JSON.stringify({ messages, session_id: sessionId, user_context: userContext });

  fetch(`${BASE}/api/chat/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      function pump() {
        reader.read().then(({ done, value }) => {
          if (done) { onDone(); return; }
          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n").filter((l) => l.startsWith("data: "));
          for (const line of lines) {
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") { onDone(); return; }
            try {
              const parsed = JSON.parse(payload);
              if (parsed.text) onChunk(parsed.text);
              if (parsed.error) onError(parsed.error);
            } catch {}
          }
          pump();
        });
      }
      pump();
    })
    .catch((e) => onError(e.message));
}
