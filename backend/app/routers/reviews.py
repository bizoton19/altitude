"""
Reviews API Router
==================
Endpoints for managing listing reviews.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from datetime import datetime
import uuid

from app.models.review import ListingReview, ReviewCreate, ReviewUpdate, ReviewStatus
from app.models.user import User
from app.auth.dependencies import get_current_user, get_current_reviewer
from app.services import database as db

router = APIRouter()


@router.post("/", response_model=ListingReview)
async def create_review(review_data: ReviewCreate):
    """Create a new review (usually auto-created from investigation)."""
    review_id = f"rev-{uuid.uuid4().hex[:8]}"
    
    review = ListingReview(
        review_id=review_id,
        listing_id=review_data.listing_id,
        investigation_id=review_data.investigation_id,
        violation_id=review_data.violation_id,
        marketplace_id=review_data.marketplace_id,
        marketplace_name=review_data.marketplace_name,
        region_id=review_data.region_id,
        region_name=review_data.region_name,
        ai_confidence_score=review_data.ai_confidence_score,
        ai_match_reasons=review_data.ai_match_reasons,
    )
    
    review = await db.add_review(review)
    return review


@router.get("/queue", response_model=List[ListingReview])
async def get_reviewer_queue(
    current_user: User = Depends(get_current_reviewer),
    marketplace_id: Optional[str] = Query(None, description="Filter by marketplace"),
    region_id: Optional[str] = Query(None, description="Filter by region"),
    status: Optional[ReviewStatus] = Query(ReviewStatus.PENDING, description="Filter by status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """
    Get reviewer's queue filtered by:
    - Assigned marketplace preferences
    - Assigned region preferences
    - Optional query filters
    """
    # Get listings matching reviewer's assignments
    reviews = await db.get_pending_reviews_for_reviewer(
        reviewer_id=current_user.user_id,
        marketplace_id=marketplace_id,
        region_id=region_id,
        status=status
    )
    
    # Paginate
    reviews = reviews[offset:offset + limit]
    return reviews


@router.get("/{review_id}", response_model=ListingReview)
async def get_review(
    review_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get review details."""
    review = await db.get_review(review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Check if user has access (reviewer assigned or admin)
    from app.models.user import UserRole
    if review.reviewer_id != current_user.user_id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return review


@router.patch("/{review_id}", response_model=ListingReview)
async def update_review(
    review_id: str,
    update_data: ReviewUpdate,
    current_user: User = Depends(get_current_reviewer)
):
    """Update review (approve/reject)."""
    review = await db.get_review(review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Check if user is assigned reviewer or admin
    from app.models.user import UserRole
    if review.reviewer_id != current_user.user_id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only assigned reviewer can update this review")
    
    # Update fields
    if update_data.review_status is not None:
        review.review_status = update_data.review_status
        if update_data.review_status != ReviewStatus.PENDING:
            review.reviewed_at = datetime.utcnow()
    
    if update_data.human_confidence_score is not None:
        review.human_confidence_score = update_data.human_confidence_score
    
    if update_data.reviewer_notes is not None:
        review.reviewer_notes = update_data.reviewer_notes
    
    # Assign reviewer if not already assigned
    if review.reviewer_id is None:
        review.reviewer_id = current_user.user_id
    
    review = await db.update_review(review)
    return review


@router.post("/{review_id}/assign")
async def assign_review(
    review_id: str,
    reviewer_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Manually assign review to a reviewer."""
    from app.models.user import UserRole
    
    # Only admin can manually assign, or reviewer can self-assign
    if current_user.role != UserRole.ADMIN and reviewer_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only admin can assign to other reviewers")
    
    review = await db.get_review(review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    target_reviewer_id = reviewer_id or current_user.user_id
    review.reviewer_id = target_reviewer_id
    review.review_status = ReviewStatus.IN_REVIEW
    
    review = await db.update_review(review)
    return review


@router.get("/stats/summary")
async def get_review_stats(
    current_user: User = Depends(get_current_user)
):
    """Get reviewer statistics."""
    from app.models.user import UserRole
    
    if current_user.role == UserRole.ADMIN:
        # Admin sees all stats
        stats = await db.get_all_review_stats()
    else:
        # Reviewer sees only their stats
        stats = await db.get_reviewer_stats(current_user.user_id)
    
    return stats
















