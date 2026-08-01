"""Julian API routes — receive-brief, call-summary, tool-call handler, escalation."""
from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.config import settings
from app.services import calendar as calendar_service
from app.services.vapi_service import get_assistant_id
from app.api.routes.ws import broadcast_to_call

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory store for briefs and call summaries (use DB in production)
_briefs: dict[str, Any] = {}
_call_summaries: dict[str, Any] = {}


# ─── Models ─────────────────────────────────────────────────────────────────

class BriefPayload(BaseModel):
    account_id: str
    company_name: str
    target_persona: str
    pain_points: list[str]
    buying_signals: list[str]
    suggested_angle: str = ""


class EscalatePayload(BaseModel):
    question: str
    call_id: str
    account_id: str = ""


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/julian/receive-brief", tags=["Julian"])
async def receive_brief(payload: BriefPayload):
    """Nova POSTs a verified brief here. Returns assistant ID + brief token for frontend."""
    assistant_id = await get_assistant_id()
    brief_text = (
        f"Company: {payload.company_name}\n"
        f"Target Persona: {payload.target_persona}\n"
        f"Pain Points:\n" + "\n".join(f"- {p}" for p in payload.pain_points) + "\n"
        f"Buying Signals:\n" + "\n".join(f"- {s}" for s in payload.buying_signals) + "\n"
        f"Suggested Angle: {payload.suggested_angle}"
    )
    _briefs[payload.account_id] = {
        **payload.model_dump(),
        "brief_text": brief_text,
        "created_at": datetime.utcnow().isoformat(),
    }
    return {
        "assistant_id": assistant_id,
        "account_id": payload.account_id,
        "brief_text": brief_text,
    }


@router.get("/julian/assistant-id", tags=["Julian"])
async def get_julian_assistant_id():
    """Frontend fetches this to get the Vapi assistant ID before starting a call."""
    assistant_id = await get_assistant_id()
    if not assistant_id:
        raise HTTPException(status_code=503, detail="Julian assistant not available. Check VAPI_PRIVATE_KEY.")
    return {"assistant_id": assistant_id}


@router.get("/julian/brief/{account_id}", tags=["Julian"])
async def get_brief(account_id: str):
    """Return the stored brief for a given account."""
    brief = _briefs.get(account_id)
    if not brief:
        raise HTTPException(status_code=404, detail="No brief found for this account.")
    return brief


@router.post("/julian/call-summary", tags=["Julian"])
async def call_summary(request: Request):
    """Vapi webhook — receives call transcript and outcome after the call ends."""
    try:
        body = await request.json()
    except Exception:
        body = {}

    msg_type = body.get("message", {}).get("type", body.get("type", ""))
    call = body.get("message", {}).get("call", body.get("call", {}))
    call_id = call.get("id", "unknown")

    logger.info(f"Vapi webhook received: type={msg_type} call_id={call_id}")

    if msg_type in ("end-of-call-report", "call-ended"):
        summary_data = {
            "call_id": call_id,
            "type": msg_type,
            "transcript": body.get("message", {}).get("transcript", body.get("transcript", "")),
            "summary": body.get("message", {}).get("summary", body.get("summary", "")),
            "ended_reason": call.get("endedReason", ""),
            "duration": call.get("duration", 0),
            "received_at": datetime.utcnow().isoformat(),
        }
        _call_summaries[call_id] = summary_data

        # Broadcast to any connected WebSocket clients
        await broadcast_to_call(call_id, json.dumps({
            "type": "call_ended",
            "data": summary_data
        }))

    elif msg_type == "transcript":
        # Mid-call transcript event — broadcast to frontend in real time
        transcript_data = {
            "type": "transcript",
            "role": body.get("message", {}).get("role", ""),
            "text": body.get("message", {}).get("transcript", ""),
            "call_id": call_id,
        }
        await broadcast_to_call(call_id, json.dumps(transcript_data))

    return JSONResponse({"status": "ok"})


@router.get("/julian/summary/{call_id}", tags=["Julian"])
async def get_call_summary(call_id: str):
    """Retrieve stored call summary by call ID."""
    summary = _call_summaries.get(call_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Call summary not found.")
    return summary


@router.post("/julian/tools", tags=["Julian"])
async def handle_tool_call(request: Request):
    """Vapi calls this endpoint when Julian invokes a function tool during the call."""
    body = await request.json()

    # Vapi sends: { message: { type: "tool-calls", toolCallList: [...], call: { id: "..." } } }
    tool_calls = body.get("message", {}).get("toolCallList", [])
    call_id = body.get("message", {}).get("call", {}).get("id", "unknown")
    results = []

    for tool_call in tool_calls:
        fn_name = tool_call.get("function", {}).get("name", "")
        fn_args = tool_call.get("function", {}).get("arguments", {})
        tool_call_id = tool_call.get("id", "")

        if fn_name == "check_calendar_availability":
            slots = await calendar_service.check_availability(fn_args.get("date_range", "next week"))
            result_text = "Available slots:\n" + "\n".join(f"- {s['label']}" for s in slots)
            results.append({"toolCallId": tool_call_id, "result": result_text})

        elif fn_name == "book_meeting":
            booking = await calendar_service.book_meeting(
                contact_name=fn_args.get("contact_name", "Prospect"),
                contact_email=fn_args.get("contact_email", ""),
                meeting_datetime=fn_args.get("datetime", ""),
                duration=fn_args.get("duration", 30),
            )
            if booking.get("success"):
                link = booking.get('link', 'N/A')
                result_text = f"Meeting booked successfully! Calendar link: {link}"
                # Broadcast the link to the frontend
                await broadcast_to_call(call_id, json.dumps({
                    "type": "meeting_booked",
                    "link": link,
                    "summary": booking.get("summary")
                }))
            else:
                result_text = booking.get("fallback", "Meeting noted, calendar booking failed.")
            results.append({"toolCallId": tool_call_id, "result": result_text})

        elif fn_name == "escalate_to_nova":
            question = fn_args.get("question", "")
            call_id = fn_args.get("call_id", "unknown")

            # Fire-and-forget POST to Nova backend
            try:
                async with httpx.AsyncClient(timeout=5) as client:
                    await client.post(
                        f"{settings.nova_backend_url}/api/nova/escalation",
                        json={"question": question, "call_id": call_id, "source": "julian"},
                    )
            except Exception as e:
                logger.warning(f"Could not reach Nova backend for escalation: {e}")

            # Broadcast escalation to frontend
            await broadcast_to_call(call_id, json.dumps({
                "type": "escalation",
                "question": question
            }))

            result_text = "Noted. I'll confirm that with our research team and follow up with you today."
            results.append({"toolCallId": tool_call_id, "result": result_text})

        else:
            results.append({"toolCallId": tool_call_id, "result": f"Unknown tool: {fn_name}"})

    return {"results": results}


@router.post("/julian/escalate", tags=["Julian"])
async def escalate_to_nova(payload: EscalatePayload):
    """Direct escalation endpoint — logs an unanswered question."""
    logger.info(f"Escalation logged: call={payload.call_id} question='{payload.question}'")
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(
                f"{settings.nova_backend_url}/api/nova/escalation",
                json=payload.model_dump(),
            )
    except Exception as e:
        logger.warning(f"Nova backend unreachable: {e}")
    return {"status": "escalated", "question": payload.question}
