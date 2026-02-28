# backend/main.py  –  FitAI FastAPI entry point

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from routers import bmi, diet, workout, posture, chat, analytics
from services.db import connect_db, close_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="FitAI API",
    description="Smart gym assistant powered by ML and LLMs",
    version="1.0.0",
    lifespan=lifespan,
)

# TODO: tighten origins before production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://fitai.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bmi.router,       prefix="/api/bmi",       tags=["BMI"])
app.include_router(diet.router,      prefix="/api/diet",      tags=["Diet"])
app.include_router(workout.router,   prefix="/api/workout",   tags=["Workout"])
app.include_router(posture.router,   prefix="/api/posture",   tags=["Posture"])
app.include_router(chat.router,      prefix="/api/chat",      tags=["AI Chat"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])


@app.get("/")
async def root():
    return {"message": "FitAI API is running 💪", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}
