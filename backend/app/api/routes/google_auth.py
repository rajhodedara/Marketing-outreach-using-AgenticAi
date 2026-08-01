"""Google OAuth flow — run once to generate and save a refresh token."""
from __future__ import annotations

import logging
import os
import re

from fastapi import APIRouter
from fastapi.responses import HTMLResponse, RedirectResponse

from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

SCOPES = ["https://www.googleapis.com/auth/calendar"]
REDIRECT_URI = f"{settings.nova_backend_url}/api/google/callback"


@router.get("/google/auth", tags=["Google OAuth"])
async def google_auth():
    """Step 1 — Redirect user to Google's OAuth consent screen."""
    from google_auth_oauthlib.flow import Flow

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uris": [REDIRECT_URI],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
    )
    flow.redirect_uri = REDIRECT_URI
    auth_url, _ = flow.authorization_url(access_type="offline", prompt="consent")
    return RedirectResponse(auth_url)


@router.get("/google/callback", tags=["Google OAuth"])
async def google_callback(code: str):
    """Step 2 — Exchange auth code for tokens, save refresh token to .env."""
    from google_auth_oauthlib.flow import Flow

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uris": [REDIRECT_URI],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
    )
    flow.redirect_uri = REDIRECT_URI
    try:
        flow.fetch_token(code=code)
    except Exception as e:
        logger.error(f"OAuth fetch_token failed: {e}")
        return HTMLResponse(
            f"<h2>❌ Google OAuth Error</h2>"
            f"<p>Failed to exchange code for token: <b>{e}</b></p>"
            f"<p>This usually happens if you wait too long, reuse an old link, or if the redirect URI hasn't fully propagated in Google Cloud.</p>"
            f"<p>Please try again: <a href='/api/google/auth'>/api/google/auth</a></p>",
            status_code=400,
        )

    refresh_token = flow.credentials.refresh_token
    if not refresh_token:
        return HTMLResponse(
            "<h2>❌ No refresh token received.</h2>"
            "<p>Try visiting <a href='/api/google/auth'>/api/google/auth</a> again — "
            "make sure to click 'Allow' on the consent screen and revoke old access first if needed.</p>",
            status_code=400,
        )

    # Persist to .env file
    env_path = os.path.join(os.path.dirname(__file__), "../../../../.env")
    env_path = os.path.abspath(env_path)

    try:
        with open(env_path, "r") as f:
            content = f.read()

        if "GOOGLE_REFRESH_TOKEN=" in content:
            content = re.sub(r"GOOGLE_REFRESH_TOKEN=.*", f"GOOGLE_REFRESH_TOKEN={refresh_token}", content)
        else:
            content += f"\nGOOGLE_REFRESH_TOKEN={refresh_token}\n"

        with open(env_path, "w") as f:
            f.write(content)

        logger.info("Google refresh token saved to .env")
    except Exception as e:
        logger.error(f"Could not save refresh token to .env: {e}")

    return HTMLResponse(
        f"<h2>✅ Google Calendar Connected!</h2>"
        f"<p>Your refresh token has been saved. Julian can now book meetings.</p>"
        f"<p><strong>Refresh token:</strong> <code>{refresh_token[:20]}...</code></p>"
        f"<p>You can close this tab and return to the app.</p>"
    )
