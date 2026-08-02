import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

def build_outreach_block_kit(campaign_id: str, channel: str, draft_content: str, account_name: str) -> list[dict]:
    content = draft_content[:2900] + "..." if len(draft_content) > 2900 else draft_content
    return [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"{account_name} - {channel} Outreach",
                "emoji": True
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": content
            }
        }
    ]

async def send_draft_for_review(slack_user_id: str, campaign_id: str, channel: str, draft_content: str, account_name: str) -> dict | None:
    blocks = build_outreach_block_kit(campaign_id, channel, draft_content, account_name)
    headers = {
        "Authorization": f"Bearer {settings.slack_bot_token}",
        "Content-Type": "application/json; charset=utf-8"
    }
    payload = {
        "channel": slack_user_id,
        "blocks": blocks,
        "text": f"New outreach message for {account_name}"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post("https://slack.com/api/chat.postMessage", headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            if not data.get("ok"):
                logger.error(f"Slack API error: {data.get('error')}")
            return data
        except Exception as e:
            logger.error(f"Failed to send Slack message: {e}")
            return None

async def send_status_update(slack_user_id: str, message: str) -> dict | None:
    headers = {
        "Authorization": f"Bearer {settings.slack_bot_token}",
        "Content-Type": "application/json; charset=utf-8"
    }
    payload = {
        "channel": slack_user_id,
        "text": message
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post("https://slack.com/api/chat.postMessage", headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            if not data.get("ok"):
                logger.error(f"Slack API error: {data.get('error')}")
            return data
        except Exception as e:
            logger.error(f"Failed to send Slack status update: {e}")
            return None
