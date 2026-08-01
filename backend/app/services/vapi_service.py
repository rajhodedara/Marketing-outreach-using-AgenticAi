"""Vapi service — bootstraps the Julian assistant and provides tool-call helpers."""
from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

VAPI_BASE = "https://api.vapi.ai"

JULIAN_SYSTEM_PROMPT = """You are Julian, an AI voice agent making an outbound call to a sales prospect.
You have been given a verified brief containing ONLY claims that have already
been fact-checked against real source data. Use only the information in this
brief when answering questions or making claims. If the prospect asks
something not covered in your verified brief, do NOT improvise, guess, or
make up an answer — respond naturally that you'll confirm that detail and
follow up, then flag the question for escalation. Stay warm, consultative,
and adaptive in tone — this should feel like a real conversation, not a
scripted read-through. Your goal is to build interest and, where
appropriate, book a meeting on the calendar.

Verified brief for this call:
{{verified_brief}}"""


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.vapi_private_key}",
        "Content-Type": "application/json",
    }


async def get_or_create_assistant() -> str:
    """Return the Julian assistant ID, creating it on Vapi if it doesn't exist yet."""
    if not settings.vapi_private_key:
        logger.warning("VAPI_PRIVATE_KEY not set — cannot bootstrap Julian assistant.")
        return ""

    async with httpx.AsyncClient(timeout=30) as client:
        # Check existing assistants
        resp = await client.get(f"{VAPI_BASE}/assistant", headers=_headers())
        if resp.status_code == 200:
            assistants = resp.json()
            for a in assistants:
                if a.get("name") == "Julian v3":
                    logger.info(f"Found existing Julian v3 assistant: {a['id']}")
                    return a["id"]

        # Create new assistant
        payload: dict[str, Any] = {
            "name": "Julian v3",
            "firstMessage": "Hi, this is Julian calling. Am I speaking with the right person?",
            "model": {
                "provider": "groq",
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": JULIAN_SYSTEM_PROMPT}
                ],
                "tools": [
                    {
                        "type": "function",
                        "function": {
                            "name": "check_calendar_availability",
                            "description": "Check available calendar slots for booking a meeting.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "date_range": {
                                        "type": "string",
                                        "description": "Date range to check, e.g. 'next week' or '2024-12-10 to 2024-12-14'"
                                    }
                                },
                                "required": ["date_range"]
                            }
                        },
                        "server": {"url": f"{settings.nova_backend_url}/api/julian/tools"}
                    },
                    {
                        "type": "function",
                        "function": {
                            "name": "book_meeting",
                            "description": "Book a meeting with the prospect on the calendar.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "contact_name": {"type": "string", "description": "Name of the prospect"},
                                    "datetime": {"type": "string", "description": "ISO 8601 datetime for the meeting"},
                                    "duration": {"type": "integer", "description": "Duration in minutes", "default": 30}
                                },
                                "required": ["contact_name", "datetime"]
                            }
                        },
                        "server": {"url": f"{settings.nova_backend_url}/api/julian/tools"}
                    },
                    {
                        "type": "function",
                        "function": {
                            "name": "escalate_to_nova",
                            "description": "Flag an unanswered question to Nova for research follow-up.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "question": {"type": "string", "description": "The question the prospect asked that is not covered in the brief"},
                                    "call_id": {"type": "string", "description": "The current call ID"}
                                },
                                "required": ["question"]
                            }
                        },
                        "server": {"url": f"{settings.nova_backend_url}/api/julian/tools"}
                    }
                ]
            },
            "voice": {
                "provider": "11labs",
                "voiceId": "onwK4e9ZLuTAKqWW03F9",  # Daniel — professional male voice
                "stability": 0.5,
                "similarityBoost": 0.75,
            },
            "serverUrl": f"{settings.nova_backend_url}/api/julian/call-summary",
        }

        resp = await client.post(f"{VAPI_BASE}/assistant", headers=_headers(), json=payload)
        if resp.status_code in (200, 201):
            assistant_id = resp.json()["id"]
            logger.info(f"Created Julian assistant: {assistant_id}")
            return assistant_id
        else:
            logger.error(f"Failed to create Vapi assistant: {resp.status_code} {resp.text}")
            return ""


# In-memory store for assistant ID (avoids re-fetching on every call)
_assistant_id: str = ""


async def get_assistant_id() -> str:
    global _assistant_id
    if not _assistant_id:
        _assistant_id = await get_or_create_assistant()
    return _assistant_id
