"""
Authentication router for user profile sync and management.
Note: Login/logout is handled by Firebase Auth on the frontend.
"""

from fastapi import APIRouter, Depends, HTTPException
from app.auth.dependencies import get_current_user, get_current_admin
from app.models.user import User, UserUpdate
from app.services import database as db

router = APIRouter()


@router.get("/me", response_model=User)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """Get current user's profile."""
    return current_user


@router.post("/sync")
async def sync_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Sync user profile from Firebase.
    Updates email and username from Firebase token.
    """
    # User is already synced in get_current_user dependency
    return {
        "message": "User profile synced",
        "user": current_user
    }


@router.patch("/me", response_model=User)
async def update_current_user_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update current user's profile (limited fields)."""
    # Users can only update their username
    if update_data.username is not None:
        current_user.username = update_data.username
    
    current_user = await db.update_user(current_user)
    return current_user


@router.patch("/users/{user_id}/role", response_model=User)
async def update_user_role(
    user_id: str,
    role: str,
    current_admin: User = Depends(get_current_admin)
):
    """Update a user's role (admin only)."""
    from app.models.user import UserRole
    
    try:
        user_role = UserRole(role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid role: {role}")
    
    user = await db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = user_role
    user = await db.update_user(user)
    return user


@router.patch("/users/{user_id}/assignments", response_model=User)
async def update_user_assignments(
    user_id: str,
    assigned_marketplaces: list[str] = None,
    assigned_regions: dict[str, list[str]] = None,
    current_admin: User = Depends(get_current_admin)
):
    """Update a user's marketplace/region assignments (admin only)."""
    user = await db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if assigned_marketplaces is not None:
        user.assigned_marketplaces = assigned_marketplaces
    if assigned_regions is not None:
        user.assigned_regions = assigned_regions
    
    user = await db.update_user(user)
    return user
















