# backend/app/db/postgres.py
# using async sqlalchemy so we don't block the event loop
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

engine = create_async_engine(
    settings.POSTGRES_URL,
    echo=settings.DEBUG,
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def init_postgres():
    """create tables on startup if they don't exist"""
    async with engine.begin() as conn:
        # import all models so Base knows about them
        from app.models import user, workout_plan, diet_plan  # noqa
        await conn.run_sync(Base.metadata.create_all)
    logger.info("PostgreSQL connected and tables ready")


async def get_db():
    """dependency injection for route handlers"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
