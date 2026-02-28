# backend/app/db/mongo.py
# mongodb is better for the unstructured session/activity logs
# postgres handles the structured relational stuff (users, plans)

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient = None
db = None


async def init_mongo():
    global client, db
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.MONGO_DB]
    # create indexes for common queries
    await db.sessions.create_index("user_id")
    await db.activity_logs.create_index([("user_id", 1), ("timestamp", -1)])
    await db.chat_history.create_index("session_id")
    logger.info("MongoDB connected")


def get_mongo():
    return db


# collection helpers - just cleaner than typing db['collection'] every time
def sessions_col():      return db["sessions"]
def activity_col():      return db["activity_logs"]
def chat_col():          return db["chat_history"]
def pose_results_col():  return db["pose_results"]
