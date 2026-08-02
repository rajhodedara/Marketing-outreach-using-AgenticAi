import logging
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

import httpx
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google.auth.exceptions import GoogleAuthError

from app.config import settings

logger = logging.getLogger(__name__)

async def get_gmail_credentials() -> Optional[Credentials]:
    """
    Build credentials from the refresh token in settings and refresh if needed.
    """
    try:
        creds = Credentials(
            token=None,
            refresh_token=settings.google_refresh_token,
            client_id=settings.google_client_id,
            client_secret=settings.google_client_secret,
            token_uri="https://oauth2.googleapis.com/token"
        )
        if not creds.valid:
            creds.refresh(Request())
        return creds
    except GoogleAuthError as e:
        logger.error(f"Failed to get/refresh Gmail credentials: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error getting Gmail credentials: {e}")
        return None

async def send_email(to_email: str, subject: str, body_html: str) -> bool:
    """
    Send an email via the Gmail API.
    """
    creds = await get_gmail_credentials()
    if not creds:
        logger.error("Could not obtain Gmail credentials. Email not sent.")
        return False
    
    try:
        # Build a MIME message
        message = MIMEMultipart()
        message["To"] = to_email
        message["Subject"] = subject
        
        # Attach HTML body
        msg_body = MIMEText(body_html, "html")
        message.attach(msg_body)
        
        # Encode as base64url
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        # Send via Gmail API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                headers={
                    "Authorization": f"Bearer {creds.token}",
                    "Content-Type": "application/json"
                },
                json={
                    "raw": raw_message
                }
            )
            response.raise_for_status()
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error sending email: {e.response.text}")
        return False
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False
