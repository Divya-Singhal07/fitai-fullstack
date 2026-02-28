# services/llm_chat.py  –  Conversational AI via OpenAI + HuggingFace fallback

import os
from openai import AsyncOpenAI
from transformers import pipeline   # HuggingFace fallback

openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# HuggingFace local fallback – useful when OpenAI quota runs out
# using a small model so it doesn't eat all the RAM
hf_pipeline = None

def get_hf_pipeline():
    global hf_pipeline
    if hf_pipeline is None:
        # lazy-load so startup is fast
        hf_pipeline = pipeline(
            "text-generation",
            model="microsoft/DialoGPT-medium",
            device=-1,  # CPU, change to 0 for GPU
        )
    return hf_pipeline


SYSTEM_PROMPT = """You are FitAI, a friendly and knowledgeable gym assistant.
You help users with:
- Workout plans tailored to their fitness level and goals
- Diet advice based on their BMI and dietary preferences
- Exercise technique and posture corrections
- Motivation and accountability

Keep responses concise, friendly, and actionable.
Always remind users to consult a doctor before starting new exercise routines if they mention health conditions.
"""


async def chat_with_gpt(messages: list, user_context: dict = None) -> str:
    """Send a conversation to GPT-4 and return the reply."""
    system = SYSTEM_PROMPT
    if user_context:
        system += f"\n\nUser context: BMI={user_context.get('bmi')}, Goal={user_context.get('goal')}, Level={user_context.get('level')}"

    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",   # cheaper than gpt-4, still good enough here
            messages=[{"role": "system", "content": system}] + messages,
            max_tokens=500,
            temperature=0.7,
        )
        return response.choices[0].message.content

    except Exception as e:
        print(f"OpenAI error, falling back to HuggingFace: {e}")
        # fallback to local model
        pipe = get_hf_pipeline()
        prompt = messages[-1]["content"] if messages else "Hello"
        result = pipe(prompt, max_new_tokens=200, do_sample=True, temperature=0.8)
        return result[0]["generated_text"]


async def extract_intent(text: str) -> dict:
    """Use NLP to figure out what the user is asking about."""
    # quick keyword-based NLP before hitting the LLM
    # TODO: replace with a proper intent classifier (sklearn or HuggingFace)
    text_lower = text.lower()
    intent = "general"
    if any(w in text_lower for w in ["squat", "pushup", "exercise", "form", "posture"]):
        intent = "posture"
    elif any(w in text_lower for w in ["eat", "diet", "meal", "calor", "food", "protein"]):
        intent = "diet"
    elif any(w in text_lower for w in ["plan", "week", "schedule", "routine", "workout"]):
        intent = "workout_plan"
    elif any(w in text_lower for w in ["bmi", "weight", "height", "fat", "muscle"]):
        intent = "bmi"
    return {"intent": intent, "raw": text}
