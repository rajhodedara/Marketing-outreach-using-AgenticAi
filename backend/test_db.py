import asyncio
from sqlalchemy import select
from app.db.session import async_session_maker
from app.db.models import Account
from app.config import settings
import logging

logging.basicConfig(level="DEBUG")

async def test():
    print(f"Testing DB connection to {settings.database_url}...")
    async with async_session_maker() as db:
        print("Got session. Executing query...")
        result = await db.execute(select(Account))
        print("Query complete. Results:")
        print(result.all())

asyncio.run(test())
