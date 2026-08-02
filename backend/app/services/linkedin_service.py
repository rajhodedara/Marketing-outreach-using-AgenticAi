"""LinkedIn outreach fallback service.

LinkedIn Direct Messaging via API is restricted for third-party applications.
This module provides a fallback stub service that logs API restrictions,
notifies callers of required manual send actions, and generates LinkedIn
messaging deep links for Account Executives (AEs).
"""
from __future__ import annotations

import logging
from typing import Any
from urllib.parse import quote

logger = logging.getLogger(__name__)


async def send_linkedin_message(profile_url: str, message_content: str) -> dict[str, Any]:
    """Fallback stub for LinkedIn direct messaging.

    Logs that LinkedIn direct messaging via API is restricted and returns a fallback
    dictionary signaling that the AE needs to send the message manually.

    Args:
        profile_url: The recipient's LinkedIn profile URL.
        message_content: The content of the outreach message.

    Returns:
        Dict containing fallback status, required action, profile URL, and message preview.
    """
    logger.warning(
        "LinkedIn direct messaging via API is restricted. Manual send required for profile: %s",
        profile_url,
    )
    return {
        "status": "fallback",
        "action": "manual_send_required",
        "profile_url": profile_url,
        "message_preview": message_content[:200],
    }


def generate_linkedin_deep_link(profile_url: str, message_content: str = "") -> str:
    """Generate a LinkedIn deep link to open the messaging compose window.

    Note: LinkedIn does not support pre-filling message body text via deep links,
    so this returns the compose URL with target recipient.

    Args:
        profile_url: The recipient's LinkedIn profile URL or handle.
        message_content: Optional message content (not supported by LinkedIn deep links).

    Returns:
        The LinkedIn compose deep link URL string.
    """
    encoded_url = quote(profile_url, safe="")
    return f"https://www.linkedin.com/messaging/compose/?to={encoded_url}"
