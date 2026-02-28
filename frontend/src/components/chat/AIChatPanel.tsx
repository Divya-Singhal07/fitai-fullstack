// frontend/src/components/chat/AIChatPanel.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { streamChat } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

interface Msg { role: "user" | "assistant"; content: string; }

const SUGGESTIONS = [
  "What should I eat before a workout? 🥗",
  "How do I fix my squat form? 🏋️",
  "Build me a 4-day workout plan 📅",
  "I feel unmotivated today 😔",
  "How many calories should I eat to lose weight?",
];

export default function AIChatPanel() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: "Hey! 👋 I'm FitAI, your personal gym and nutrition coach. Ask me anything about workouts, diet, or form!" }
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { sessionId, profile, bmiResult } = useAppStore();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  function send(text: string) {
    if (!text.trim() || streaming) return;

    const userMsg: Msg = { role: "user", content: text };
    const newMsgs = [...msgs, userMsg];
    setMsgs(newMsgs);
    setInput("");

    // add empty assistant message to stream into
    setMsgs(prev => [...prev, { role: "assistant", content: "" }]);
    setStreaming(true);

    const context = {
      bmi: bmiResult?.bmi,
      goal: profile.goal,
      age: profile.age,
      fitness_level: profile.fitness_level,
    };

    streamChat(
      newMsgs,
      sessionId,
      context,
      (chunk) => {
        setMsgs(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      },
      () => setStreaming(false),
      (err) => {
        setMsgs(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: `Sorry, I ran into an error: ${err}. Please try again!`,
          };
          return updated;
        });
        setStreaming(false);
      }
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 500 }}>
      {/* messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <AnimatePresence initial={false}>
          {msgs.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div style={{
                maxWidth: "80%",
                padding: "0.75rem 1rem",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: msg.role === "user"
                  ? "linear-gradient(135deg, var(--ocean), var(--accent))"
                  : "rgba(79,195,247,0.1)",
                border: msg.role === "assistant" ? "1px solid rgba(79,195,247,0.2)" : "none",
                fontSize: "0.875rem",
                lineHeight: 1.65,
                color: msg.role === "user" ? "#0A1929" : "#fff",
                fontWeight: msg.role === "user" ? 600 : 400,
              }}>
                {msg.role === "assistant" && (
                  <span style={{ marginRight: "0.4rem" }}>🤖</span>
                )}
                {msg.content}
                {streaming && i === msgs.length - 1 && msg.role === "assistant" && (
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", marginLeft: 4, animation: "pulse 1s infinite" }} />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* suggestions */}
      {msgs.length <= 1 && (
        <div style={{ padding: "0 1rem 0.75rem", display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => send(s)}
              style={{
                padding: "0.3rem 0.8rem",
                borderRadius: 20,
                border: "1px solid rgba(79,195,247,0.3)",
                background: "rgba(79,195,247,0.08)",
                color: "var(--sky)",
                fontSize: "0.78rem",
                cursor: "pointer",
                fontFamily: "Poppins",
                transition: "all 0.2s",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* input bar */}
      <div style={{
        padding: "0.75rem 1rem",
        borderTop: "1px solid rgba(79,195,247,0.15)",
        display: "flex",
        gap: "0.6rem",
        alignItems: "center",
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send(input)}
          placeholder="Ask me anything about fitness..."
          disabled={streaming}
          style={{
            flex: 1,
            padding: "0.65rem 1rem",
            borderRadius: 50,
            border: "1px solid rgba(79,195,247,0.25)",
            background: "rgba(255,255,255,0.05)",
            color: "#fff",
            fontFamily: "Poppins",
            fontSize: "0.875rem",
            outline: "none",
          }}
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || streaming}
          style={{
            width: 42, height: 42,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--ocean), var(--accent))",
            border: "none",
            cursor: "pointer",
            fontSize: "1.1rem",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: (!input.trim() || streaming) ? 0.5 : 1,
            transition: "opacity 0.2s",
          }}
        >
          {streaming ? "⏳" : "➤"}
        </button>
      </div>
    </div>
  );
}
