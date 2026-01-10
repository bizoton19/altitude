"""
Review data models for listing review queue.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class ReviewStatus(str, Enum):
    """Status of a listing review."""
    PENDING = "pending"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    FLAGGED = "flagged"


class ListingReview(BaseModel):
    """Review record for a marketplace listing."""
    review_id: str
    listing_id: str
    investigation_id: str
    violation_id: str
    
    # Marketplace/Region context
    marketplace_id: str
    marketplace_name: str
    region_id: Optional[str] = None
    region_name: Optional[str] = None
    
    # AI-generated
    ai_confidence_score: float = Field(0.0, ge=0.0, le=1.0)
    ai_match_reasons: List[str] = []
    
    # Human review
    reviewer_id: Optional[str] = None
    review_status: ReviewStatus = ReviewStatus.PENDING
    human_confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    reviewer_notes: Optional[str] = None
    
    # Timestamps
    found_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True


class ReviewCreate(BaseModel):
    """Schema for creating a review (usually auto-created from investigation)."""
    listing_id: str
    investigation_id: str
    violation_id: str
    marketplace_id: str
    marketplace_name: str
    region_id: Optional[str] = None
    region_name: Optional[str] = None
    ai_confidence_score: float
    ai_match_reasons: List[str] = []


class ReviewUpdate(BaseModel):
    """Schema for updating a review."""
    review_status: Optional[ReviewStatus] = None
    human_confidence_score: Optional[float] = None
    reviewer_notes: Optional[str] = None
















