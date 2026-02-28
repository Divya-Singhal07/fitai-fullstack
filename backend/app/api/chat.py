# backend/app/api/chat.py
# conversational AI endpoint - streams responses back to the client
# uses openai gpt-4o for the main chat and huggingface for intent classification

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import openai
import json
import logging

from app.core.config import settings
from app.db.mongo import chat_col
from app.services.nlp_service import classify_intent
from datetime import datetime

router = APIRouter()
logger = logging.getLogger(__name__)

openai.api_key = settings.OPENAI_API_KEY

SYSTEM_PROMPT = """You are FitAI, a friendly and knowledgeable AI gym and nutrition coach.
You help users with:
- Workout planning and exercise form corrections
- Diet and nutrition advice based on their BMI and goals
- Motivation and mental wellness tips
- Injury prevention and recovery guidance

Keep responses concise, warm and encouraging. Use emojis occasionally.
Always recommend consulting a doctor for medical concerns.
You know the user's fitness data when provided in the context."""


class Message(BaseModel):
    role: str   # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    session_id: str
    user_context: Optional[dict] = None   # bmi, goal, age etc injected here


class ChatRequest(BaseModel):
    messages: List[Message]
    session_id: str
    user_context: Optional[dict] = None


@router.post("/message")
async def chat_message(req: ChatRequest):
    """streams gpt-4 response back as server-sent events"""
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")

    # classify intent first with huggingface (lightweight)
    last_msg = req.messages[-1].content if req.messages else ""
    intent = await classify_intent(last_msg)

    # build context string if user data provided
    context_str = ""
    if req.user_context:
        ctx = req.user_context
        context_str = (
            f"\nUser context: BMI={ctx.get('bmi','?')}, "
            f"Goal={ctx.get('goal','?')}, Age={ctx.get('age','?')}, "
            f"Level={ctx.get('fitness_level','?')}"
        )

    system_msg = SYSTEM_PROMPT + context_str

    messages_for_api = [{"role": "system", "content": system_msg}]
    for m in req.messages[-10:]:   # keep last 10 messages for context window
        messages_for_api.append({"role": m.role, "content": m.content})

    async def stream_response():
        full_response = ""
        try:
            client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            stream = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=messages_for_api,
                stream=True,
                max_tokens=600,
                temperature=0.7,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                full_response += delta
                yield f"data: {json.dumps({'text': delta, 'intent': intent})}\n\n"

        except Exception as e:
            logger.error(f"OpenAI stream error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            # persist to mongodb
            try:
                await chat_col().insert_one({
                    "session_id": req.session_id,
                    "user_message": last_msg,
                    "ai_response": full_response,
                    "intent": intent,
                    "timestamp": datetime.utcnow(),
                })
            except Exception as e:
                logger.warning(f"Failed to save chat to mongo: {e}")

            yield "data: [DONE]\n\n"

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
