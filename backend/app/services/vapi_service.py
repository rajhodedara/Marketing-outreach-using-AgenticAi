"""Vapi service — bootstraps the Julian assistant and provides tool-call helpers."""
from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

VAPI_BASE = "https://api.vapi.ai"

JULIAN_SYSTEM_PROMPT = """You are Armin, an AI voice agent making an outbound sales call to a prospect.

## CORE RULES (NEVER VIOLATE)
1. You have a VERIFIED BRIEF below containing ONLY facts that have been checked against real source data.
2. ONLY use information from the verified brief when making claims or answering questions.
3. If the prospect asks something NOT covered in your brief, NEVER guess or improvise. Instead say something like: "That's a great question. Let me confirm that detail with our research team and get back to you today." Then use the escalate_to_nova tool to flag it.
4. When you hear something unclear, ask the prospect to repeat rather than guessing what they said. Say: "I'm sorry, could you repeat that?" or "Just to make sure I heard you correctly..."

## CONVERSATION STYLE
- Be warm, natural, and conversational — NOT robotic or scripted
- Use short, punchy sentences. Avoid long monologues.
- Mirror the prospect's energy and pace
- Use verbal acknowledgments: "That makes sense", "Absolutely", "I hear you"
- Pause naturally between thoughts

## MEETING BOOKING FLOW
When the prospect shows interest in meeting:
1. First use check_calendar_availability to find open slots
2. Suggest 2-3 specific times: "I have openings on [day] at [time] or [day] at [time] — what works best?"
3. Once they pick a time, use book_meeting with their name and the chosen datetime.
4. IMPORTANT: The current local date and time is: {{current_datetime}}. Use this as your reference. ALWAYS resolve dates (e.g. "August 20th", "tomorrow") to the correct year and month based on this. Provide the datetime parameter in ISO 8601 format WITH the timezone offset included (e.g. '2026-08-20T14:00:00+05:30').
5. After booking, confirm: "Perfect, I've just sent you a calendar invite for [time]. You'll get a Google Calendar link shortly."
6. ALWAYS book the meeting through the tool — don't just say you'll "send an invite later"

## IF TOOLS FAIL OR ARE SLOW
- Do NOT repeat "hold on" or "one moment" more than once
- If a tool call takes too long or fails, say: "I'll have my team send you a calendar invite directly — what's the best email to reach you at?"
- Move the conversation forward naturally. Never get stuck in a loop.

## OBJECTION HANDLING
- Budget concerns: Acknowledge, then pivot to ROI from the brief
- Timing: "I completely understand. When would be a better time to revisit this?"
- Send email: "Happy to! But let me ask you one quick question first so I can tailor it..."
- Not interested: "I appreciate your honesty. Just curious — is it the timing or the solution itself?"

## ENDING THE CALL
- Always end warmly: "Thanks so much for your time, [name]. Have a great rest of your day."
- If a meeting was booked, remind them to check their calendar

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
        # Define the assistant payload
        payload: dict[str, Any] = {
            "name": "Armin v4",
            "firstMessage": "Hi, this is Armin calling. Am I speaking with the right person?",
            
            # ── Transcriber — Deepgram nova-3 for best accuracy ──
            "transcriber": {
                "provider": "deepgram",
                "model": "nova-3",
                "language": "en",
                "smartFormat": True,
            },
            
            # ── LLM ──
            "model": {
                "provider": "groq",
                "model": "llama-3.3-70b-versatile",
                "temperature": 0.6,
                "maxTokens": 300,
                "messages": [
                    {"role": "system", "content": JULIAN_SYSTEM_PROMPT}
                ],
                "tools": [
                    {
                        "type": "function",
                        "function": {
                            "name": "check_calendar_availability",
                            "description": "Check available calendar slots for booking a meeting. Call this BEFORE trying to book a meeting.",
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
                            "description": "Book a meeting with the prospect on Google Calendar. Always call check_calendar_availability first. After booking, tell the prospect they will receive a calendar invite.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "contact_name": {"type": "string", "description": "Full name of the prospect"},
                                    "datetime": {"type": "string", "description": "ISO 8601 datetime for the meeting, e.g. '2024-12-10T10:00:00'"},
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
                            "description": "Flag an unanswered question to Nova for research follow-up. Use this when the prospect asks something NOT covered in your verified brief. Never guess — always escalate.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "question": {"type": "string", "description": "The exact question the prospect asked that is not covered in the brief"},
                                    "call_id": {"type": "string", "description": "The current call ID"}
                                },
                                "required": ["question"]
                            }
                        },
                        "server": {"url": f"{settings.nova_backend_url}/api/julian/tools"}
                    }
                ]
            },
            
            # ── Voice — ElevenLabs with tuned settings ──
            "voice": {
                "provider": "11labs",
                "voiceId": "onwK4e9ZLuTAKqWW03F9",  # Daniel — professional male voice
                "stability": 0.7,
                "similarityBoost": 0.8,
            },
            
            # ── Server URL for webhooks ──
            "serverUrl": f"{settings.nova_backend_url}/api/julian/call-summary",
            
            # ── Silence and end-of-turn settings ──
            "silenceTimeoutSeconds": 15,
            "responseDelaySeconds": 0.5,
            "endCallMessage": "Thanks for your time. Have a great day!",
        }

        # Check existing assistants
        resp = await client.get(f"{VAPI_BASE}/assistant", headers=_headers())
        if resp.status_code == 200:
            assistants = resp.json()
            for a in assistants:
                if a.get("name") == "Armin v4":
                    logger.info(f"Found existing Armin v4 assistant: {a['id']}. Updating configuration.")
                    # Update to ensure ngrok webhook URLs are synchronized
                    patch_resp = await client.patch(f"{VAPI_BASE}/assistant/{a['id']}", headers=_headers(), json=payload)
                    if patch_resp.status_code in (200, 201):
                        logger.info("Successfully updated Julian v4 assistant.")
                    else:
                        logger.error(f"Failed to update Vapi assistant: {patch_resp.status_code} {patch_resp.text}")
                    return a["id"]

        # Create new assistant with improved config
        resp = await client.post(f"{VAPI_BASE}/assistant", headers=_headers(), json=payload)
        if resp.status_code in (200, 201):
            assistant_id = resp.json()["id"]
            logger.info(f"Created Julian v4 assistant: {assistant_id}")
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
