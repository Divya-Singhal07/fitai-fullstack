# backend/app/main.py
# entry point for the FastAPI server
# TODO: add rate limiting middleware before prod

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import logging

from app.api import bmi, diet, workout, posture, chat, analytics, upload
from app.core.config import settings
from app.db.postgres import init_postgres
from app.db.mongo import init_mongo

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    logger.info("Starting FitAI backend...")
    await init_postgres()
    await init_mongo()
    yield
    # shutdown
    logger.info("Shutting down...")


app = FastAPI(
    title="FitAI API",
    version="1.0.0",
    description="AI-powered gym assistant backend",
    lifespan=lifespan,
)

# CORS - allow the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# register routers
app.include_router(bmi.router,      prefix="/api/bmi",      tags=["BMI"])
app.include_router(diet.router,     prefix="/api/diet",     tags=["Diet"])
app.include_router(workout.router,  prefix="/api/workout",  tags=["Workout"])
app.include_router(posture.router,  prefix="/api/posture",  tags=["Posture"])
app.include_router(chat.router,     prefix="/api/chat",     tags=["Chat"])
app.include_router(analytics.router,prefix="/api/analytics",tags=["Analytics"])
app.include_router(upload.router,   prefix="/api/upload",   tags=["Upload"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "fitai-api"}
