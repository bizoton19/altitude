"""
Listings API Router
====================
Endpoints for managing marketplace listings.
"""

from fastapi import APIRouter, Query
from typing import List, Optional

from app.models.marketplace import MarketplaceListing
from app.services import database as db

router = APIRouter()


@router.get("/", response_model=List[MarketplaceListing])
async def get_all_listings(
    marketplace_id: Optional[str] = Query(None, description="Filter by marketplace"),
    min_match_score: Optional[float] = Query(None, ge=0, le=1, description="Minimum match score"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """
    Get all marketplace listings across all recalls.
    """
    listings = await db.get_all_listings()
    
    # Filter by marketplace
    if marketplace_id:
        listings = [l for l in listings if l.marketplace_id == marketplace_id]
    
    # Filter by match score
    if min_match_score is not None:
        listings = [l for l in listings if (l.match_score or 0) >= min_match_score]
    
    # Sort by found_at (newest first)
    listings.sort(key=lambda l: l.found_at or "", reverse=True)
    
    # Paginate
    return listings[offset:offset + limit]


@router.get("/stats")
async def get_listings_stats():
    """
    Get statistics about all listings.
    """
    listings = await db.get_all_listings()
    recalls = await db.get_all_recalls()
    
    # Build recall risk map
    recall_risk = {r.recall_id: r.risk_level.value for r in recalls}
    
    stats = {
        "total": len(listings),
        "by_risk": {"HIGH": 0, "MEDIUM": 0, "LOW": 0},
        "by_marketplace": {},
        "high_confidence": 0  # match_score >= 0.7
    }
    
    for listing in listings:
        # Count by risk
        risk = recall_risk.get(listing.recall_id, "LOW")
        stats["by_risk"][risk] = stats["by_risk"].get(risk, 0) + 1
        
        # Count by marketplace
        mp = listing.marketplace_name or listing.marketplace_id or "Unknown"
        stats["by_marketplace"][mp] = stats["by_marketplace"].get(mp, 0) + 1
        
        # Count high confidence
        if (listing.match_score or 0) >= 0.7:
            stats["high_confidence"] += 1
    
    return stats
