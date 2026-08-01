from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from qdrant_client import AsyncQdrantClient

from app.config import settings
from app.db.session import engine
from app.db.models import create_tables
from app.db import chunk_model  # noqa: F401 — register table with metadata
from app.api.routes import upload, accounts, analysis, nova

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

# Global Qdrant client
qdrant_client: AsyncQdrantClient | None = None

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup and shutdown events."""
    global qdrant_client
    
    logger.info("Starting up ABM Orchestrator...")
    
    # Initialize SQLite tables
    logger.info("Creating database tables if not exist...")
    await create_tables(engine)
    
    # Initialize Qdrant Client
    logger.info("Initializing Qdrant client...")
    if settings.qdrant_in_memory:
        import os
        os.makedirs("./data/qdrant", exist_ok=True)
        qdrant_client = AsyncQdrantClient(path="./data/qdrant")
    else:
        qdrant_client = AsyncQdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
    
    yield
    
    logger.info("Shutting down ABM Orchestrator...")
    await engine.dispose()
    if qdrant_client:
        await qdrant_client.close()

app = FastAPI(
    title="ABM Orchestrator API",
    description="Backend API for ABM Strategy Orchestrator",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred. Please try again later."},
    )

@app.get("/api/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}

app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(accounts.router, prefix="/api", tags=["Accounts"])
app.include_router(analysis.router, prefix="/api", tags=["Analysis"])
app.include_router(nova.router, prefix="/api", tags=["Nova SDR"])
