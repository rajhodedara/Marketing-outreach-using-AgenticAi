import asyncio
from urllib.parse import urlsplit, urlunsplit
from sqlalchemy import select
from app.db.session import async_session_maker
from app.db.models import Account
from app.config import settings
import logging

logging.basicConfig(level="DEBUG")

def redact_url(url: str) -> str:
    parsed = urlsplit(url)
    if not parsed.password:
        return url

    username = parsed.username or ""
    hostname = parsed.hostname or ""
    port = f":{parsed.port}" if parsed.port else ""
    netloc = f"{username}:***@{hostname}{port}"
    return urlunsplit((parsed.scheme, netloc, parsed.path, parsed.query, parsed.fragment))

async def test():
    print(f"Testing DB connection to {redact_url(settings.database_url)}...")
    async with async_session_maker() as db:
        print("Got session. Executing query...")
        result = await db.execute(select(Account))
        print("Query complete. Results:")
        print(result.all())

asyncio.run(test())
