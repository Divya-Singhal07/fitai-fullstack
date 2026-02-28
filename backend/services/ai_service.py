# services/ai_service.py
# conversational AI using OpenAI GPT-4 + HuggingFace as fallback

import os
from openai import AsyncOpenAI
from transformers import pipeline
from typing import Optional
import json

openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# HuggingFace fallback — loaded lazily so startup stays fast
_hf_pipeline = None


def get_hf_pipeline():
    global _hf_pipeline
    if _hf_pipeline is None:
        # using a small instruction-tuned model as fallback
        # swap for a larger model if you have GPU resources
        _hf_pipeline = pipeline(
            "text-generation",
            model="microsoft/phi-2",
            device_map="auto",
            max_new_tokens=512,
        )
    return _hf_pipeline


SYSTEM_PROMPT = """You are FitAI, an enthusiastic, knowledgeable, and supportive personal fitness coach.
You have expertise in:
- Exercise science, proper form, and injury prevention
- Nutrition, macronutrient planning, and diet strategies
- BMI interpretation and healthy weight management
- Motivation, habit building, and progressive overload principles

Respond in a friendly, encouraging tone. Keep answers concise but thorough.
When the user shares their BMI or goals, tailor your advice specifically to them.
Always end responses with 2-3 short quick-reply suggestions the user might want to ask next.
Format these as JSON at the end: {"suggestions": ["...", "...", "..."]}
"""


def build_context_message(user_context: dict) -> str:
    """Inject user profile data into the conversation context."""
    if not user_context:
        return ""
    parts = []
    if bmi := user_context.get("bmi"):
        parts.append(f"BMI: {bmi:.1f} ({user_context.get('bmi_category','unknown')})")
    if goal := user_context.get("goal"):
        parts.append(f"Goal: {goal}")
    if diet := user_context.get("diet_type"):
        parts.append(f"Diet: {diet}")
    if age := user_context.get("age"):
        parts.append(f"Age: {age}")
    return "User profile — " + ", ".join(parts) if parts else ""


async def chat_with_gpt(messages: list, user_context: dict) -> dict:
    """Call OpenAI GPT-4o with conversation history."""
    context_msg = build_context_message(user_context)

    system = SYSTEM_PROMPT
    if context_msg:
        system += f"\n\nCurrent user: {context_msg}"

    openai_messages = [{"role": "system", "content": system}]
    for m in messages:
        openai_messages.append({"role": m["role"], "content": m["content"]})

    response = await openai_client.chat.completions.create(
        model="gpt-4o",
        messages=openai_messages,
        temperature=0.7,
        max_tokens=600,
    )

    raw_reply = response.choices[0].message.content

    # parse out the suggestions JSON if present
    suggestions = []
    reply_text = raw_reply
    if '{"suggestions":' in raw_reply:
        try:
            json_start = raw_reply.rfind('{"suggestions":')
            json_str = raw_reply[json_start:]
            data = json.loads(json_str)
            suggestions = data.get("suggestions", [])
            reply_text = raw_reply[:json_start].strip()
        except json.JSONDecodeError:
            pass

    if not suggestions:
        suggestions = ["Tell me about proper squat form", "What should I eat today?", "Build me a workout plan"]

    return {
        "reply": reply_text,
        "suggestions": suggestions[:3],
        "model_used": "gpt-4o",
    }


async def chat_with_huggingface(messages: list, user_context: dict) -> dict:
    """HuggingFace fallback when OpenAI is unavailable."""
    pipe = get_hf_pipeline()
    context = build_context_message(user_context)

    # flatten conversation to a prompt
    prompt_parts = [f"You are FitAI, a helpful fitness coach. {context}\n\n"]
    for m in messages[-4:]:   # last 4 messages to keep context window manageable
        role = "User" if m["role"] == "user" else "FitAI"
        prompt_parts.append(f"{role}: {m['content']}\n")
    prompt_parts.append("FitAI:")
    prompt = "".join(prompt_parts)

    result = pipe(prompt, do_sample=True, temperature=0.7)[0]["generated_text"]
    # extract just the new response
    reply = result[len(prompt):].split("User:")[0].strip()

    return {
        "reply": reply or "I'm here to help with your fitness journey! What would you like to know?",
        "suggestions": ["What's my ideal calorie intake?", "Show me beginner exercises", "How do I improve my form?"],
        "model_used": "phi-2 (local)",
    }


async def get_chat_response(messages: list, user_context: dict) -> dict:
    """Try OpenAI first, fall back to HuggingFace if unavailable."""
    try:
        return await chat_with_gpt(messages, user_context)
    except Exception as e:
        print(f"OpenAI unavailable ({e}), falling back to HuggingFace")
        return await chat_with_huggingface(messages, user_context)


async def generate_diet_with_ai(goal: str, diet_type: str, calories: float, allergies: list) -> str:
    """Use GPT-4 to generate a personalised meal plan narrative."""
    prompt = (
        f"Create a brief, friendly daily meal plan for someone with these specs:\n"
        f"- Goal: {goal}\n- Diet type: {diet_type}\n"
        f"- Daily calories: {calories:.0f} kcal\n- Allergies/avoid: {', '.join(allergies) or 'none'}\n\n"
        "Give 4 meals (breakfast, lunch, snack, dinner) with rough calorie counts. "
        "Keep it practical and tasty. Use a warm encouraging tone."
    )
    response = await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=400,
    )
    return response.choices[0].message.content
