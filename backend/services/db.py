# services/db.py  –  MongoDB + PostgreSQL connection helpers

import os
from motor.motor_asyncio import AsyncIOMotorClient   # async MongoDB driver
import asyncpg                                         # async PostgreSQL driver

# ── MongoDB ──────────────────────────────────────────────────────────────────
mongo_client: AsyncIOMotorClient = None
mongo_db = None

async def connect_db():
    global mongo_client, mongo_db
    uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    mongo_client = AsyncIOMotorClient(uri)
    mongo_db = mongo_client["fitai"]
    print("✅ MongoDB connected")

async def close_db():
    if mongo_client:
        mongo_client.close()

def get_mongo():
    return mongo_db

# ── PostgreSQL ────────────────────────────────────────────────────────────────
# used for structured analytics / workout logs where SQL is cleaner
pg_pool = None

async def connect_pg():
    global pg_pool
    pg_pool = await asyncpg.create_pool(
        dsn=os.getenv("POSTGRES_DSN", "postgresql://user:pass@localhost/fitai"),
        min_size=2,
        max_size=10,
    )
    print("✅ PostgreSQL connected")

async def get_pg():
    return pg_pool
