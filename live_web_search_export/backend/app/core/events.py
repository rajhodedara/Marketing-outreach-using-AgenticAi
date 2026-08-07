import asyncio
from typing import Dict

# Dictionary mapping session_id to an asyncio.Queue of event strings
_event_queues: Dict[str, asyncio.Queue] = {}

def get_queue(session_id: str) -> asyncio.Queue:
    if session_id not in _event_queues:
        _event_queues[session_id] = asyncio.Queue()
    return _event_queues[session_id]

async def publish_event(session_id: str, event_data: str):
    queue = get_queue(session_id)
    await queue.put(event_data)

def close_queue(session_id: str):
    if session_id in _event_queues:
        # Push a None to signal the end of the stream
        _event_queues[session_id].put_nowait(None)
        # We don't delete it immediately to allow consumers to drain it
