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

SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/gmail.send"
]
REDIRECT_URI = f"{settings.nova_backend_url}/api/google/callback"


import urllib.parse
import httpx

@router.get("/google/auth", tags=["Google OAuth"])
async def google_auth():
    """Step 1 — Redirect user to Google's OAuth consent screen."""
    
    # Manually construct URL to avoid google-auth-oauthlib injecting PKCE code_challenge
    # which we can't easily verify in a stateless FastAPI callback.
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
    }
    
    url_params = urllib.parse.urlencode(params)
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{url_params}"
    
    return RedirectResponse(auth_url)


@router.get("/google/callback", tags=["Google OAuth"])
async def google_callback(code: str):
    """Step 2 — Exchange auth code for tokens via HTTP POST."""
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": REDIRECT_URI,
                }
            )
            resp.raise_for_status()
            token_data = resp.json()
            
    except Exception as e:
        logger.error(f"OAuth fetch_token failed: {e}")
        error_details = str(e)
        if hasattr(e, 'response') and e.response:
            error_details += f" | {e.response.text}"
            
        return HTMLResponse(
            f"<h2>❌ Google OAuth Error</h2>"
            f"<p>Failed to exchange code for token: <b>{error_details}</b></p>"
            f"<p>This usually happens if you wait too long, reuse an old link, or if the redirect URI hasn't fully propagated in Google Cloud.</p>"
            f"<p>Please try again: <a href='/api/google/auth'>/api/google/auth</a></p>",
            status_code=400,
        )

    refresh_token = token_data.get("refresh_token")
    
    if not refresh_token:
        return HTMLResponse(
            "<h2>❌ No refresh token received.</h2>"
            "<p>Try visiting <a href='/api/google/auth'>/api/google/auth</a> again — "
            "make sure to click 'Allow' on the consent screen and revoke old access first if needed.</p>",
            status_code=400,
        )

    # Note: On deployed Render, this .env write will fail, but the screen output below will succeed!
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
        logger.info("Google refresh token saved to .env (if writable)")
    except Exception as e:
        logger.warning(f"Could not save refresh token to .env (expected on Render): {e}")

    return HTMLResponse(
        f"<h2>✅ Google Connected Successfully!</h2>"
        f"<p>Since this is a deployed server, we cannot save to .env automatically.</p>"
        f"<p><strong>Please copy the FULL refresh token below and add it to your Render Environment Variables as <code>GOOGLE_REFRESH_TOKEN</code>:</strong></p>"
        f"<p><code style='background:#eee;padding:10px;display:block;word-break:break-all;'>{refresh_token}</code></p>"
        f"<p>After saving it in Render, you can close this tab.</p>"
    )
