from __future__ import annotations

import os
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import settings

# Extract DB path and create directory if using local SQLite file
if settings.database_url.startswith("sqlite+aiosqlite:///"):
    db_path = settings.database_url.replace("sqlite+aiosqlite:///", "")
    db_dir = os.path.dirname(db_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

# Build engine kwargs — disable asyncpg's prepared-statement cache
# when using PostgreSQL through Supabase's pgbouncer (transaction mode).
engine_kwargs: dict = {
    "echo": settings.log_level.upper() == "DEBUG",
    "future": True,
}
if "asyncpg" in settings.database_url:
    engine_kwargs["connect_args"] = {
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    }

engine = create_async_engine(settings.database_url, **engine_kwargs)

async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for providing a database session."""
    async with async_session_maker() as session:
        yield session
