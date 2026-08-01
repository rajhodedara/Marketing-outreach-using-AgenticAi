"""WebSocket route for live call transcript streaming."""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)
router = APIRouter()

# call_id -> list of connected WebSocket clients
_connections: dict[str, list[WebSocket]] = {}


async def broadcast_to_call(call_id: str, message: str) -> None:
    """Broadcast a message to all WebSocket clients watching a specific call."""
    sockets = _connections.get(call_id, [])
    dead = []
    for ws in sockets:
        try:
            await ws.send_text(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        sockets.remove(ws)


@router.websocket("/ws/transcript/{call_id}")
async def transcript_websocket(websocket: WebSocket, call_id: str):
    """Frontend connects here to receive live transcript events for a specific call."""
    await websocket.accept()
    logger.info(f"WebSocket connected for call_id={call_id}")

    if call_id not in _connections:
        _connections[call_id] = []
    _connections[call_id].append(websocket)

    try:
        while True:
            # Keep connection alive; client sends pings, we send pongs
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for call_id={call_id}")
    finally:
        if call_id in _connections and websocket in _connections[call_id]:
            _connections[call_id].remove(websocket)
