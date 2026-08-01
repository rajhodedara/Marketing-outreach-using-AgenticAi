from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from app.config import settings

security = HTTPBearer()

def verify_supabase_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Verify the JWT token from Supabase.
    Requires SUPABASE_JWT_SECRET to be set in the environment.
    """
    token = credentials.credentials
    if not settings.supabase_jwt_secret or settings.supabase_jwt_secret == "[YOUR_SUPABASE_JWT_SECRET]":
        # If secret is not set, reject.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_JWT_SECRET is not configured on the server.",
        )

    try:
        # Decode the token using the Supabase JWT secret
        # Supabase uses HS256 for signing tokens
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated"
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
