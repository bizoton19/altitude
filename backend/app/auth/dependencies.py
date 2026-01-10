"""
Authentication dependencies for FastAPI routes.
"""

from typing import Optional
from fastapi import Depends, HTTPException, Header
from app.auth.firebase import verify_firebase_token
from app.models.user import User
from app.services import database as db


async def get_current_user(
    authorization: Optional[str] = Header(None)
) -> User:
    """
    Dependency to get current authenticated user from Firebase token.
    In dev mode, creates a dev user if no authorization header is provided.
    
    Usage:
        @router.get("/protected")
        async def protected_route(current_user: User = Depends(get_current_user)):
            ...
    """
    import os
    
    # Dev mode: allow requests without auth
    dev_mode = os.getenv("ENVIRONMENT") == "development" or os.getenv("DEV_MODE") == "true" or not os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY_PATH")
    
    if not authorization:
        if dev_mode:
            # Create/return dev user
            firebase_uid = "dev-user"
            email = "dev@localhost"
        else:
            raise HTTPException(status_code=401, detail="Authorization header required")
    else:
        # Verify Firebase token
        decoded_token = await verify_firebase_token(authorization)
        firebase_uid = decoded_token.get("uid")
        email = decoded_token.get("email", "")
    
    if not firebase_uid:
        raise HTTPException(status_code=401, detail="Invalid token: missing user ID")
    
    # Get or create user in our database
    user = await db.get_user_by_firebase_uid(firebase_uid)
    
    if not user:
        # Auto-create user on first login (with default VIEWER role, ADMIN in dev mode)
        from app.models.user import UserRole
        role = UserRole.ADMIN if dev_mode else UserRole.VIEWER
        user = await db.create_user_from_firebase(
            firebase_uid=firebase_uid,
            email=email,
            username=decoded_token.get("name") if authorization else "Dev User",
            role=role
        )
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is inactive")
    
    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Dependency to ensure user is an admin."""
    from app.models.user import UserRole
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


async def get_current_investigator(
    current_user: User = Depends(get_current_user)
) -> User:
    """Dependency to ensure user is an investigator or admin."""
    from app.models.user import UserRole
    if current_user.role not in [UserRole.ADMIN, UserRole.INVESTIGATOR]:
        raise HTTPException(status_code=403, detail="Investigator access required")
    return current_user


async def get_current_reviewer(
    current_user: User = Depends(get_current_user)
) -> User:
    """Dependency to ensure user is a reviewer or admin."""
    from app.models.user import UserRole
    if current_user.role not in [UserRole.ADMIN, UserRole.REVIEWER]:
        raise HTTPException(status_code=403, detail="Reviewer access required")
    return current_user

