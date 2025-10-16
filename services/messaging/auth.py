# auth.py
# Authentication module for Messaging service
# Provides Clerk JWT token authentication for frontend requests

import os
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import Optional

# Initialize HTTPBearer security scheme
security = HTTPBearer(auto_error=False)

# Get Clerk secret key from environment variable
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")
# Check if auth is enabled (disabled by default for local development)
AUTH_ENABLED = os.getenv("ENABLE_AUTH", "false").lower() in ("true", "1", "yes")

if AUTH_ENABLED and not CLERK_SECRET_KEY:
    print("WARNING: AUTH_ENABLED is true but CLERK_SECRET_KEY is not set. API endpoints will reject all requests.")
elif not AUTH_ENABLED:
    print("INFO: Authentication is DISABLED (ENABLE_AUTH=false). API endpoints are unprotected.")


def verify_token(credentials: Optional[HTTPAuthorizationCredentials] = Security(security)) -> str:
    """
    Verify the Clerk JWT token from the Authorization header.

    If AUTH_ENABLED=false, this function always succeeds (no authentication required).
    If AUTH_ENABLED=true, validates the JWT token issued by Clerk.

    Args:
        credentials: The HTTP authorization credentials containing the JWT token

    Returns:
        The clerk_id from the verified token (or "no-auth" if auth is disabled)

    Raises:
        HTTPException: If auth is enabled and the token is invalid or missing
    """
    # If auth is disabled, allow all requests
    if not AUTH_ENABLED:
        return "no-auth"

    # Auth is enabled - require valid token
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not CLERK_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server authentication not configured"
        )

    token = credentials.credentials

    try:
        from clerk_backend_api import authenticate_request
        from clerk_backend_api.security.types import AuthenticateRequestOptions

        # Create a mock request object with the Authorization header
        class MockRequest:
            def __init__(self, token: str):
                self.headers = {"Authorization": f"Bearer {token}"}
                self.cookies = {}
                self.url = ""

        # Verify the token using Clerk's authenticate_request
        request = MockRequest(token)
        options = AuthenticateRequestOptions(secret_key=CLERK_SECRET_KEY)
        request_state = authenticate_request(request, options)

        if not request_state.is_signed_in:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Extract clerk_id from the authenticated state
        clerk_id = request_state.user_id

        if not clerk_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user identifier",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return clerk_id

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )