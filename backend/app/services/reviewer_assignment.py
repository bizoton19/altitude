"""
Reviewer assignment service.
Assigns reviewers to listings based on marketplace and region preferences.
"""

from typing import Optional, Dict, List
from app.models.user import User
from app.models.marketplace import MarketplaceListing
from app.models.review import ListingReview
from app.services import database as db


async def assign_reviewer_to_listing(
    listing: MarketplaceListing,
    available_reviewers: List[User]
) -> Optional[str]:
    """
    Assign a reviewer to a listing based on:
    1. Marketplace match
    2. Region match (if marketplace supports regions)
    3. Workload balancing
    
    Returns reviewer_id or None if no match.
    """
    from app.models.user import UserRole
    
    # Filter to only reviewers
    reviewers = [r for r in available_reviewers if r.role == UserRole.REVIEWER]
    
    if not reviewers:
        return None
    
    # Filter reviewers by marketplace
    marketplace_reviewers = [
        r for r in reviewers
        if not r.assigned_marketplaces or listing.marketplace_id in r.assigned_marketplaces
    ]
    
    # Filter by region if applicable
    if listing.region_id:
        region_reviewers = [
            r for r in marketplace_reviewers
            if not r.assigned_regions.get(listing.marketplace_id) or 
               listing.region_id in r.assigned_regions.get(listing.marketplace_id, [])
        ]
        if region_reviewers:
            marketplace_reviewers = region_reviewers
    
    # If no specific match, use all marketplace reviewers
    if not marketplace_reviewers:
        marketplace_reviewers = reviewers
    
    # Workload balancing: assign to reviewer with least pending reviews
    if marketplace_reviewers:
        # Get pending review counts for each reviewer
        reviewer_loads = []
        for reviewer in marketplace_reviewers:
            pending_reviews = await db.get_pending_reviews_for_reviewer(
                reviewer_id=reviewer.user_id,
                status=None  # Get all pending/in_review
            )
            reviewer_loads.append((reviewer, len(pending_reviews)))
        
        # Sort by load (least busy first)
        reviewer_loads.sort(key=lambda x: x[1])
        return reviewer_loads[0][0].user_id
    
    return None


async def assign_reviewers_to_investigation(
    investigation_id: str,
    listings: List[MarketplaceListing]
) -> Dict[str, str]:  # {listing_id: reviewer_id}
    """
    Assign reviewers to all listings from an investigation.
    Respects marketplace and region preferences.
    """
    from app.models.user import UserRole
    
    reviewers = await db.get_users_by_role(UserRole.REVIEWER)
    assignments = {}
    
    for listing in listings:
        reviewer_id = await assign_reviewer_to_listing(listing, reviewers)
        if reviewer_id:
            assignments[listing.id] = reviewer_id
    
    return assignments
















