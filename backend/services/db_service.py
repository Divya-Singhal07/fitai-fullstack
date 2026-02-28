# services/db_service.py
# MongoDB (user data, workout logs) + PostgreSQL (analytics, aggregates)

import os
from motor.motor_asyncio import AsyncIOMotorClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, String, Float, Integer, DateTime, func
from datetime import datetime
from typing import Optional

# ── MongoDB ───────────────────────────────────────────────────────

_mongo_client = None
_mongo_db = None


async def init_databases():
    global _mongo_client, _mongo_db

    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    _mongo_client = AsyncIOMotorClient(mongo_uri)
    _mongo_db = _mongo_client["fitai"]
    # create indexes
    await _mongo_db.users.create_index("email", unique=True)
    await _mongo_db.sessions.create_index("user_id")
    await _mongo_db.sessions.create_index("created_at")

    # PostgreSQL
    pg_uri = os.getenv("POSTGRES_URI", "postgresql+asyncpg://postgres:postgres@localhost/fitai")
    engine = create_async_engine(pg_uri, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ PostgreSQL tables ready")


def get_mongo():
    return _mongo_db


# ── PostgreSQL (SQLAlchemy async) ─────────────────────────────────

Base = declarative_base()


class WorkoutLog(Base):
    __tablename__ = "workout_logs"
    id            = Column(Integer, primary_key=True, autoincrement=True)
    user_id       = Column(String, nullable=False, index=True)
    exercise      = Column(String, nullable=False)
    reps          = Column(Integer, default=0)
    sets          = Column(Integer, default=0)
    form_score    = Column(Float, default=0.0)
    calories      = Column(Float, default=0.0)
    duration_secs = Column(Integer, default=0)
    created_at    = Column(DateTime, default=datetime.utcnow)


class WeightLog(Base):
    __tablename__ = "weight_logs"
    id         = Column(Integer, primary_key=True, autoincrement=True)
    user_id    = Column(String, nullable=False, index=True)
    weight_kg  = Column(Float, nullable=False)
    bmi        = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)


# ── Mongo helpers ─────────────────────────────────────────────────

async def save_user_profile(user_id: str, profile: dict):
    db = get_mongo()
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {**profile, "updated_at": datetime.utcnow()}},
        upsert=True,
    )


async def get_user_profile(user_id: str) -> Optional[dict]:
    db = get_mongo()
    return await db.users.find_one({"user_id": user_id}, {"_id": 0})


async def save_workout_session(session_data: dict):
    db = get_mongo()
    session_data["created_at"] = datetime.utcnow()
    result = await db.sessions.insert_one(session_data)
    return str(result.inserted_id)


async def get_workout_history(user_id: str, limit: int = 30) -> list:
    db = get_mongo()
    cursor = db.sessions.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit)
    return await cursor.to_list(length=limit)


async def save_chat_message(user_id: str, role: str, content: str):
    db = get_mongo()
    await db.chat_history.insert_one({
        "user_id": user_id,
        "role": role,
        "content": content,
        "created_at": datetime.utcnow(),
    })


async def get_chat_history(user_id: str, limit: int = 20) -> list:
    db = get_mongo()
    cursor = db.chat_history.find(
        {"user_id": user_id},
        {"_id": 0, "role": 1, "content": 1}
    ).sort("created_at", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    return list(reversed(docs))
