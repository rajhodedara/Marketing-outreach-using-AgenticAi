"""Slack interaction webhook — receives button clicks from Block Kit messages."""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import time

from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_db
from app.db.models import OutreachCampaign
from app.services import gmail_service, slack_service, linkedin_service

logger = logging.getLogger(__name__)
router = APIRouter()


def _verify_slack_signature(timestamp: str, body: bytes, signature: str) -> bool:
    """Verify the request actually came from Slack using the signing secret."""
    if abs(time.time() - int(timestamp)) > 300:
        return False  # Request is too old
    sig_basestring = f"v0:{timestamp}:{body.decode('utf-8')}"
    my_signature = "v0=" + hmac.new(
        settings.slack_signing_secret.encode(),
        sig_basestring.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(my_signature, signature)


@router.post("/webhooks/slack/interaction")
async def slack_interaction(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Slack interactive component payloads (button clicks)."""
    raw_body = await request.body()

    # --- Signature verification ---
    timestamp = request.headers.get("X-Slack-Request-Timestamp", "")
    signature = request.headers.get("X-Slack-Signature", "")
    if settings.slack_signing_secret and not _verify_slack_signature(timestamp, raw_body, signature):
        logger.warning("Slack signature verification failed")
        raise HTTPException(status_code=401, detail="Invalid Slack signature")

    # --- Parse payload ---
    from urllib.parse import parse_qs
    form = parse_qs(raw_body.decode("utf-8"))
    payload_str = form.get("payload", [None])[0]
    if not payload_str:
        raise HTTPException(status_code=400, detail="Missing payload")

    payload = json.loads(payload_str)
    actions = payload.get("actions", [])
    if not actions:
        return {"ok": True}

    action = actions[0]
    action_id = action.get("action_id", "")
    campaign_id = action.get("value", "")
    slack_user_id = payload.get("user", {}).get("id", "")

    # --- Look up the campaign ---
    result = await db.execute(
        select(OutreachCampaign).where(OutreachCampaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        logger.error(f"Campaign {campaign_id} not found for Slack action")
        await slack_service.send_status_update(slack_user_id, f"❌ Campaign not found (ID: {campaign_id})")
        return {"ok": True}

    # --- Handle actions ---
    if action_id == "approve_outreach":
        campaign.status = "APPROVED"
        await db.commit()

        # Dispatch to the right channel
        success = False
        if campaign.channel == "email":
            success = await gmail_service.send_email(
                to_email="odedararaj456@gmail.com",  # Testing with your own email
                subject=f"NOVA Outreach — Personalized Pitch",
                body_html=campaign.draft_content,
            )
        elif campaign.channel == "linkedin":
            result_data = await linkedin_service.send_linkedin_message(
                profile_url="",  # TODO: pull from campaign metadata
                message_content=campaign.draft_content,
            )
            if result_data.get("status") == "fallback":
                deep_link = linkedin_service.generate_linkedin_deep_link("")
                await slack_service.send_status_update(
                    slack_user_id,
                    f"✅ Approved! LinkedIn requires manual send.\n<{deep_link}|Open LinkedIn Messaging>"
                )
                campaign.status = "SENT"
                await db.commit()
                return {"ok": True}

        if success:
            campaign.status = "SENT"
            await db.commit()
            await slack_service.send_status_update(slack_user_id, f"✅ {campaign.channel.title()} sent successfully!")
        else:
            campaign.status = "FAILED"
            await db.commit()
            await slack_service.send_status_update(
                slack_user_id,
                f"❌ Failed to send {campaign.channel}. Please check your OAuth connection in the NOVA dashboard."
            )

    elif action_id == "reject_outreach":
        campaign.status = "REJECTED"
        await db.commit()
        await slack_service.send_status_update(slack_user_id, f"🚫 Outreach rejected for campaign {campaign_id[:8]}...")

    elif action_id == "edit_outreach":
        dashboard_url = f"{settings.nova_backend_url.replace('/api', '')}/outreach/{campaign_id}/edit"
        await slack_service.send_status_update(
            slack_user_id,
            f"📝 Edit your outreach in the dashboard:\n<{dashboard_url}|Open in NOVA>"
        )

    return {"ok": True}
