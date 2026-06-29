"""
Authentication routes for PaperLens AI.

Flow:
  GET  /auth/google    -> redirect user to Google OAuth consent screen
  GET  /auth/callback  -> exchange code for tokens, upsert user, return JWT
  GET  /auth/me        -> return current user from JWT
  POST /auth/logout    -> clear session cookie
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from config import settings
from database.mongodb import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["auth"])

# ---------------------------------------------------------------------------
# Security helpers
# ---------------------------------------------------------------------------

_bearer = HTTPBearer(auto_error=False)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

GOOGLE_SCOPES = " ".join([
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
])




class UserPublic(BaseModel):
    userId: str
    email: str
    name: str
    picture: Optional[str] = None
    createdAt: datetime
    lastLoginAt: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


# ---------------------------------------------------------------------------
# JWT utilities
# ---------------------------------------------------------------------------

def _create_jwt(user_id: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "email": email,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def _decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc



async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    session_token: Optional[str] = Cookie(default=None, alias="paperlens_session"),
) -> dict:
    """
    Extract and validate the JWT from either the Authorization header (Bearer)
    or the paperlens_session cookie.  Returns the raw MongoDB user document.
    """
    token: Optional[str] = None

    if credentials and credentials.scheme.lower() == "bearer":
        token = credentials.credentials
    elif session_token:
        token = session_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = _decode_jwt(token)
    user_id: str = payload.get("sub", "")

    db = await get_db()
    user = await db["users"].find_one({"userId": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )

    return user


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/google", summary="Redirect to Google OAuth consent screen")
async def google_login() -> RedirectResponse:
    """
    Build the Google OAuth 2.0 authorization URL and redirect the browser there.
    """
    import urllib.parse

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": GOOGLE_SCOPES,
        "access_type": "offline",
        "prompt": "select_account",
    }
    url = f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"
    logger.info("Redirecting to Google OAuth: %s", url)
    return RedirectResponse(url=url)


@router.get("/callback", summary="Handle Google OAuth callback")
async def google_callback(code: str) -> RedirectResponse:
    """
    Exchange the authorization *code* for Google tokens, fetch user info,
    upsert the user record in MongoDB, and return a signed JWT.
    """
    # 1. Exchange code for Google tokens
    async with httpx.AsyncClient(timeout=15.0) as client:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )

    if token_response.status_code != 200:
        logger.error(
            "Google token exchange failed: %d %s",
            token_response.status_code,
            token_response.text[:300],
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to exchange authorization code with Google.",
        )

    google_tokens = token_response.json()
    access_token_google = google_tokens.get("access_token")
    if not access_token_google:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google did not return an access token.",
        )

    # 2. Fetch user info from Google
    async with httpx.AsyncClient(timeout=10.0) as client:
        userinfo_response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token_google}"},
        )

    if userinfo_response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to retrieve user information from Google.",
        )

    userinfo = userinfo_response.json()
    google_user_id: str = userinfo.get("sub", "")
    email: str = userinfo.get("email", "")
    name: str = userinfo.get("name", "")
    picture: Optional[str] = userinfo.get("picture")

    if not google_user_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google user info is incomplete.",
        )

    # 3. Upsert user in MongoDB
    db = await get_db()
    now = datetime.now(timezone.utc)

    existing = await db["users"].find_one({"email": email})

    if existing:
        user_id = existing["userId"]
        await db["users"].update_one(
            {"userId": user_id},
            {"$set": {"lastLoginAt": now, "name": name, "picture": picture}},
        )
        user_doc = {**existing, "lastLoginAt": now, "name": name, "picture": picture}
    else:
        user_id = google_user_id
        user_doc = {
            "userId": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "createdAt": now,
            "lastLoginAt": now,
            "savedPapers": [],
            "searchHistory": [],
        }
        await db["users"].insert_one(user_doc)
        logger.info("Created new user: %s (%s)", user_id, email)

    # 4. Issue JWT and redirect to frontend
    jwt_token = _create_jwt(user_id=user_id, email=email)
    logger.info("User authenticated: %s", email)

    frontend_url = settings.FRONTEND_URL.rstrip("/")
    return RedirectResponse(url=f"{frontend_url}/auth/callback?token={jwt_token}")


@router.get("/me", response_model=UserPublic, summary="Get current authenticated user")
async def get_me(current_user: dict = Depends(get_current_user)) -> UserPublic:
    """Return the profile of the currently authenticated user."""
    return UserPublic(
        userId=current_user["userId"],
        email=current_user["email"],
        name=current_user["name"],
        picture=current_user.get("picture"),
        createdAt=current_user["createdAt"],
        lastLoginAt=current_user["lastLoginAt"],
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Clear session")
async def logout(response: Response) -> None:
    """Delete the session cookie, effectively logging the user out."""
    response.delete_cookie(key="paperlens_session")
    logger.info("Session cookie cleared.")
