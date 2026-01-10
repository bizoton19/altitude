"""
Recalls API Router
==================
Endpoints for managing and querying product recalls.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional

from app.models.recall import Recall, RecallSummary, RiskLevel
from app.services import database as db
from app.skills.risk_classifier import classify_risk

router = APIRouter()


@router.get("/", response_model=List[RecallSummary])
async def list_recalls(
    risk_level: Optional[RiskLevel] = Query(None, description="Filter by risk level"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """
    List all recalls with optional filtering.
    Returns lightweight summaries for performance.
    """
    recalls = await db.get_all_recalls()
    
    # Filter by risk level if specified
    if risk_level:
        recalls = [r for r in recalls if r.risk_level == risk_level]
    
    # Sort by date (newest first) then by risk score
    recalls.sort(key=lambda r: (r.recall_date, r.risk_score), reverse=True)
    
    # Paginate
    recalls = recalls[offset:offset + limit]
    
    # Convert to summaries
    summaries = []
    for r in recalls:
        summaries.append(RecallSummary(
            recall_id=r.recall_id,
            recall_number=r.recall_number,
            title=r.title,
            risk_level=r.risk_level,
            risk_score=r.risk_score,
            recall_date=r.recall_date,
            injuries=r.injuries,
            deaths=r.deaths,
            image_url=r.images[0].url if r.images else None
        ))
    
    return summaries


@router.get("/summary")
async def get_risk_summary():
    """Get summary counts of recalls by risk level."""
    return await db.get_risk_summary()


@router.get("/search")
async def search_recalls(
    q: str = Query(..., min_length=1, description="Search query"),
    risk_level: Optional[RiskLevel] = Query(None)
):
    """
    Search recalls by text query.
    Searches title, description, product names, and model numbers.
    """
    recalls = await db.search_recalls(q, risk_level)
    
    # Convert to summaries
    return [RecallSummary(
        recall_id=r.recall_id,
        recall_number=r.recall_number,
        title=r.title,
        risk_level=r.risk_level,
        risk_score=r.risk_score,
        recall_date=r.recall_date,
        injuries=r.injuries,
        deaths=r.deaths,
        image_url=r.images[0].url if r.images else None
    ) for r in recalls]


@router.get("/{recall_id}", response_model=Recall)
async def get_recall(recall_id: str):
    """Get full details of a specific recall."""
    recall = await db.get_recall(recall_id)
    if not recall:
        raise HTTPException(status_code=404, detail="Recall not found")
    return recall


@router.get("/{recall_id}/listings")
async def get_recall_listings(recall_id: str):
    """Get all marketplace listings found for a recall."""
    recall = await db.get_recall(recall_id)
    if not recall:
        raise HTTPException(status_code=404, detail="Recall not found")
    
    listings = await db.get_listings_for_recall(recall_id)
    return listings


@router.post("/classify")
async def classify_recall_risk(
    units_sold: int = 0,
    injuries: int = 0,
    deaths: int = 0,
    incidents: int = 0,
    hazard_descriptions: List[str] = []
):
    """
    Classify risk level for given parameters.
    Useful for testing or manual classification.
    """
    level, score = await classify_risk(
        units_sold=units_sold,
        injuries=injuries,
        deaths=deaths,
        incidents=incidents,
        hazard_descriptions=hazard_descriptions
    )
    
    return {
        "risk_level": level.value,
        "risk_score": score,
        "factors": {
            "units_sold": units_sold,
            "injuries": injuries,
            "deaths": deaths,
            "incidents": incidents
        }
    }
