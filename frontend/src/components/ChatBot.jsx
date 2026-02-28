// components/ChatBot.jsx  –  floating AI chat window
// uses the LLM hook from useFitAI

import { useState, useRef, useEffect } from "react"

const SUGGESTIONS = [
  "What should I eat for weight loss?",
  "How do I do a proper squat?",
  "Can you make me a 3-day workout plan?",
  "What's a good protein target for my BMI?",
]

export default function ChatBot({ onChat, chatHistory, loading }) {
  const [open,  setOpen]  = useState(false)
  const [input, setInput] = useState("")
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatHistory, open])

  const send = () => {
    if (!input.trim() || loading) return
    onChat(input.trim())
    setInput("")
  }

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() }
  }

  const INTENT_COLOR = {
    posture: "#4FC3F7", diet: "#69F0AE", workout_plan: "#FF6B9D",
    bmi: "#FFD740", general: "rgba(255,255,255,0.7)", error: "#FF6B9D",
  }

  return (
    <>
      {/* chat window */}
      {open && (
        <div style={{
          position: "fixed", bottom: "5rem", right: "1.5rem", width: 340, maxHeight: "70vh",
          background: "#0d2137", border: "1px solid rgba(79,195,247,0.25)", borderRadius: 20,
          display: "flex", flexDirection: "column", zIndex: 200, boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
          animation: "fadeSlide 0.28s ease",
        }}>
          {/* header */}
          <div style={{ padding: "0.9rem 1.2rem", borderBottom: "1px solid rgba(79,195,247,0.15)", display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#0288D1,#00E5FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>🤖</div>
            <div>
              <div style={{ fontFamily: "Nunito", fontWeight: 800, fontSize: "0.95rem" }}>FitAI Assistant</div>
              <div style={{ fontSize: "0.7rem", color: "#69F0AE", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#69F0AE", display: "inline-block" }} />
                Powered by GPT-4 + HuggingFace
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ marginLeft: "auto", background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", fontSize: "0.9rem" }}>✕</button>
          </div>

          {/* messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.7rem" }}>
            {chatHistory.length === 0 && (
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "0.82rem", paddingTop: "1rem" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>👋</div>
                Ask me anything about fitness, diet, or workouts!
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "82%", padding: "0.6rem 0.9rem", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: msg.role === "user" ? "linear-gradient(135deg,#0288D1,#01579B)" : "rgba(255,255,255,0.07)",
                  border: msg.role === "assistant" ? "1px solid rgba(79,195,247,0.18)" : "none",
                  fontSize: "0.83rem", lineHeight: 1.6,
                }}>
                  {msg.intent && msg.role === "assistant" && (
                    <div style={{ fontSize: "0.68rem", color: INTENT_COLOR[msg.intent] || "var(--sky)", marginBottom: "0.25rem", fontWeight: 700 }}>
                      #{msg.intent}
                    </div>
                  )}
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: "0.3rem", padding: "0.6rem 0.9rem", background: "rgba(255,255,255,0.07)", borderRadius: "16px 16px 16px 4px", width: "fit-content" }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#4FC3F7", animation: `bounce 1s ${i*0.15}s ease-in-out infinite` }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* suggestions */}
          {chatHistory.length === 0 && (
            <div style={{ padding: "0 1rem 0.75rem", display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => { setInput(s); }} className="pill-btn" style={{ fontSize: "0.72rem" }}>{s}</button>
              ))}
            </div>
          )}

          {/* input */}
          <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid rgba(79,195,247,0.12)", display: "flex", gap: "0.5rem" }}>
            <input
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder="Ask FitAI anything..." style={{ flex: 1, padding: "0.55rem 0.9rem", borderRadius: 12 }}
            />
            <button onClick={send} disabled={loading || !input.trim()} style={{
              background: "linear-gradient(135deg,#0288D1,#00E5FF)", border: "none", color: "#0A1929",
              width: 36, height: 36, borderRadius: "50%", cursor: "pointer", fontSize: "1rem", fontWeight: 800,
              opacity: (!input.trim() || loading) ? 0.5 : 1,
            }}>➤</button>
          </div>
        </div>
      )}

      {/* fab button */}
      <button onClick={() => setOpen(o => !o)} style={{
        position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 201,
        width: 54, height: 54, borderRadius: "50%",
        background: "linear-gradient(135deg,#0288D1,#00E5FF)", border: "none",
        fontSize: "1.6rem", cursor: "pointer",
        boxShadow: "0 4px 20px rgba(0,229,255,0.45)",
        transition: "transform 0.28s", animation: "pulse-ring-anim 3s infinite",
      }}
        className="pulse-ring-anim"
        onMouseOver={e => e.currentTarget.style.transform = "scale(1.1)"}
        onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
      >
        {open ? "✕" : "🤖"}
      </button>

      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
      `}</style>
    </>
  )
}
