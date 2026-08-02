
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    db_url = 'postgresql+asyncpg://postgres.qnxwsomkluxkyhmuiuxz:Rajodedara_123@aws-1-ap-south-1.pooler.supabase.com:6543/postgres'
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        await conn.execute(text('CREATE INDEX IF NOT EXISTS idx_analysis_sessions_account_started_desc ON analysis_sessions(account_id, started_at DESC);'))
        print('Index created successfully!')
    await engine.dispose()

if __name__ == '__main__':
    asyncio.run(main())

