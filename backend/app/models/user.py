"""
User data models for authentication and authorization.
Users are authenticated via Firebase Auth, but roles and assignments are stored in our database.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """User roles for access control."""
    ADMIN = "admin"
    INVESTIGATOR = "investigator"
    REVIEWER = "reviewer"
    VIEWER = "viewer"


class User(BaseModel):
    """User model with Firebase Auth integration."""
    user_id: str  # Maps to Firebase UID
    firebase_uid: str  # Firebase user ID (same as user_id, kept for clarity)
    email: str
    username: Optional[str] = None  # Optional display name
    role: UserRole
    is_active: bool = True
    
    # Reviewer assignment preferences
    assigned_marketplaces: List[str] = []  # Marketplaces reviewer handles
    assigned_regions: Dict[str, List[str]] = Field(default_factory=dict)  # {marketplace_id: [region_ids]}
    # Example: {"craigslist": ["dc", "seattle"], "facebook": []}  # Empty = all regions
    
    assigned_investigations: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    # Note: Password management handled by Firebase Auth

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    """Schema for creating a new user (sync from Firebase)."""
    firebase_uid: str
    email: str
    username: Optional[str] = None
    role: UserRole = UserRole.VIEWER  # Default role


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    username: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    assigned_marketplaces: Optional[List[str]] = None
    assigned_regions: Optional[Dict[str, List[str]]] = None
















