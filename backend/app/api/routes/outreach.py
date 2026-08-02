"""Outreach campaign CRUD endpoints."""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import OutreachCampaign, Account
from app.services import slack_service

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------- Schemas ----------

class OutreachCreateRequest(BaseModel):
    account_id: str
    channel: str  # "email" or "linkedin"
    draft_content: str
    ae_user_id: Optional[str] = None
    slack_user_id: Optional[str] = None  # If provided, auto-send to Slack for review


class OutreachResponse(BaseModel):
    id: str
    account_id: str
    channel: str
    draft_content: str
    status: str
    ae_user_id: Optional[str] = None

    class Config:
        from_attributes = True


class OutreachUpdateRequest(BaseModel):
    draft_content: Optional[str] = None
    status: Optional[str] = None


# ---------- Endpoints ----------

@router.post("/outreach", response_model=OutreachResponse)
async def create_outreach(req: OutreachCreateRequest, db: AsyncSession = Depends(get_db)):
    """Create a new outreach campaign draft and optionally send to Slack for review."""
    # Validate account exists
    result = await db.execute(select(Account).where(Account.id == req.account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail=f"Account {req.account_id} not found")

    campaign = OutreachCampaign(
        account_id=req.account_id,
        channel=req.channel,
        draft_content=req.draft_content,
        ae_user_id=req.ae_user_id,
        status="PENDING",
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)

    logger.info(f"Created outreach campaign {campaign.id} for account {account.company_name}")

    # Auto-send to Slack for review if slack_user_id is provided
    if req.slack_user_id:
        await slack_service.send_draft_for_review(
            slack_user_id=req.slack_user_id,
            campaign_id=campaign.id,
            channel=campaign.channel,
            draft_content=campaign.draft_content,
            account_name=account.company_name,
        )
        logger.info(f"Sent outreach {campaign.id} to Slack user {req.slack_user_id} for review")

    return campaign


@router.get("/outreach", response_model=list[OutreachResponse])
async def list_outreach(
    account_id: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List outreach campaigns with optional filters."""
    query = select(OutreachCampaign)
    if account_id:
        query = query.where(OutreachCampaign.account_id == account_id)
    if status:
        query = query.where(OutreachCampaign.status == status)
    query = query.order_by(OutreachCampaign.created_at.desc())

    result = await db.execute(query)
    campaigns = result.scalars().all()
    return campaigns


@router.get("/outreach/{campaign_id}", response_model=OutreachResponse)
async def get_outreach(campaign_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific outreach campaign."""
    result = await db.execute(
        select(OutreachCampaign).where(OutreachCampaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Outreach campaign not found")
    return campaign


@router.patch("/outreach/{campaign_id}", response_model=OutreachResponse)
async def update_outreach(
    campaign_id: str,
    req: OutreachUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update an outreach campaign (e.g., edit draft content or change status)."""
    result = await db.execute(
        select(OutreachCampaign).where(OutreachCampaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Outreach campaign not found")

    if req.draft_content is not None:
        campaign.draft_content = req.draft_content
    if req.status is not None:
        campaign.status = req.status

    await db.commit()
    await db.refresh(campaign)
    logger.info(f"Updated outreach campaign {campaign_id}")
    return campaign


@router.post("/outreach/{campaign_id}/send-to-slack")
async def send_to_slack(campaign_id: str, slack_user_id: str, db: AsyncSession = Depends(get_db)):
    """Manually send an existing outreach campaign to Slack for review."""
    result = await db.execute(
        select(OutreachCampaign).where(OutreachCampaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Outreach campaign not found")

    # Get the account name
    acct_result = await db.execute(select(Account).where(Account.id == campaign.account_id))
    account = acct_result.scalar_one_or_none()
    account_name = account.company_name if account else "Unknown Account"

    response = await slack_service.send_draft_for_review(
        slack_user_id=slack_user_id,
        campaign_id=campaign.id,
        channel=campaign.channel,
        draft_content=campaign.draft_content,
        account_name=account_name,
    )

    if response and response.get("ok"):
        return {"status": "sent", "message": f"Draft sent to Slack user {slack_user_id}"}
    else:
        raise HTTPException(status_code=502, detail="Failed to send to Slack")
