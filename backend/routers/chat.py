# routers/chat.py  –  conversational AI endpoint
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from services.llm_chat import chat_with_gpt, extract_intent

router = APIRouter()

class Message(BaseModel):
    role: str   # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    user_context: Optional[dict] = None

@router.post("/message")
async def chat(req: ChatRequest):
    # extract intent first for routing / analytics
    last_msg = req.messages[-1].content if req.messages else ""
    intent = await extract_intent(last_msg)

    msgs = [{"role": m.role, "content": m.content} for m in req.messages]
    reply = await chat_with_gpt(msgs, req.user_context)

    return {"reply": reply, "intent": intent["intent"]}
