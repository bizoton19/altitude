"""
Violations API Router
=====================
Endpoints for managing and querying product violations.
Supports violations from any regulatory agency.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime

from app.models.violation import ProductViolation, ViolationSummary, ViolationCreate, RiskLevel, ViolationType
from app.services import database as db
from app.skills.risk_classifier import classify_risk

router = APIRouter()


@router.get("/", response_model=List[ViolationSummary])
async def list_violations(
    risk_level: Optional[RiskLevel] = Query(None, description="Filter by risk level"),
    agency_name: Optional[str] = Query(None, description="Filter by agency name"),
    country: Optional[str] = Query(None, description="Filter by country code (ISO 3166-1 alpha-2)"),
    violation_type: Optional[ViolationType] = Query(None, description="Filter by violation type"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """
    List all violations with optional filtering.
    Returns lightweight summaries for performance.
    """
    try:
        violations = await db.get_all_violations()
        
        # Filter by risk level if specified
        if risk_level:
            violations = [v for v in violations if v.risk_level == risk_level]
        
        # Filter by agency if specified
        if agency_name:
            violations = [v for v in violations if v.agency_name.lower() == agency_name.lower()]
        
        # Filter by country if specified
        if country:
            violations = [v for v in violations if v.country == country]
        
        # Filter by violation type if specified
        if violation_type:
            violations = [v for v in violations if v.violation_type == violation_type]
        
        # Sort by date (newest first) then by risk score
        violations.sort(key=lambda v: (v.violation_date or datetime.min, v.risk_score), reverse=True)
        
        # Paginate
        violations = violations[offset:offset + limit]
        
        # Convert to summaries
        summaries = []
        for v in violations:
            try:
                # Safely get image URL
                image_url = None
                if v.images and len(v.images) > 0 and hasattr(v.images[0], 'url'):
                    image_url = v.images[0].url
                
                summaries.append(ViolationSummary(
                    violation_id=v.violation_id,
                    violation_number=v.violation_number,
                    title=v.title,
                    url=v.url,
                    agency_name=v.agency_name,
                    agency_acronym=v.agency_acronym,
                    violation_type=v.violation_type,
                    risk_level=v.risk_level,
                    risk_score=v.risk_score,
                    violation_date=v.violation_date or datetime.utcnow(),
                    injuries=v.injuries,
                    deaths=v.deaths,
                    country=v.country,
                    image_url=image_url
                ))
            except Exception as e:
                # Log error but continue processing other violations
                print(f"Error creating summary for violation {v.violation_id}: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        return summaries
    except Exception as e:
        print(f"Error in list_violations endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching violations: {str(e)}")


@router.get("/summary")
async def get_risk_summary():
    """Get summary counts of violations by risk level."""
    return await db.get_violations_risk_summary()


@router.get("/search")
async def search_violations(
    q: str = Query(..., min_length=1, description="Search query"),
    risk_level: Optional[RiskLevel] = Query(None),
    agency_name: Optional[str] = Query(None),
    country: Optional[str] = Query(None)
):
    """
    Search violations by text query.
    Searches title, description, violation number, product names, and model numbers.
    """
    violations = await db.search_violations(q, risk_level, agency_name, country)
    
    # Convert to summaries
    summaries = []
    for v in violations:
        try:
            # Safely get image URL
            image_url = None
            if v.images and len(v.images) > 0 and hasattr(v.images[0], 'url'):
                image_url = v.images[0].url
            
            summaries.append(ViolationSummary(
        violation_id=v.violation_id,
        violation_number=v.violation_number,
        title=v.title,
        url=v.url,
        agency_name=v.agency_name,
        agency_acronym=v.agency_acronym,
        violation_type=v.violation_type,
        risk_level=v.risk_level,
        risk_score=v.risk_score,
        violation_date=v.violation_date or datetime.utcnow(),
        injuries=v.injuries,
        deaths=v.deaths,
        country=v.country,
                image_url=image_url
            ))
        except Exception as e:
            # Log error but continue processing other violations
            print(f"Error creating summary for violation {v.violation_id}: {e}")
            continue
    
    return summaries


@router.get("/{violation_id}", response_model=ProductViolation)
async def get_violation(violation_id: str):
    """Get full details of a specific violation."""
    violation = await db.get_violation(violation_id)
    if not violation:
        raise HTTPException(status_code=404, detail="Violation not found")
    return violation


@router.get("/{violation_id}/listings")
async def get_violation_listings(violation_id: str):
    """Get all marketplace listings found for a violation."""
    violation = await db.get_violation(violation_id)
    if not violation:
        raise HTTPException(status_code=404, detail="Violation not found")
    
    listings = await db.get_listings_for_violation(violation_id)
    return listings


@router.post("/", response_model=ProductViolation)
async def create_violation(
    violation_data: ViolationCreate,
    auto_classify: bool = True,
    auto_investigate: bool = True
):
    """
    Create a new violation with optional auto-classification and auto-investigation.
    Uses workflow service for complete processing.
    """
    from app.services.workflow_service import process_violation_import
    from app.models.import_models import ImportSource
    
    result = await process_violation_import(
        violation_data=violation_data,
        source=ImportSource.MANUAL,
        source_name="Manual Entry",
        auto_classify=auto_classify,
        auto_investigate=auto_investigate,
        created_by="system"
    )
    
    return result["violation"]


@router.delete("/{violation_id}")
async def delete_violation(violation_id: str):
    """Delete a violation and all associated data."""
    deleted = await db.delete_violation(violation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Violation not found")
    return {"message": "Violation deleted successfully", "violation_id": violation_id}


@router.delete("/", response_model=dict)
async def delete_all_violations():
    """Delete all violations and their associated data. Use with caution!"""
    count = await db.delete_all_violations()
    return {
        "message": f"Deleted {count} violations and associated data",
        "count": count
    }


@router.post("/classify")
async def classify_violation_risk(
    units_affected: int = 0,
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
        units_sold=units_affected,
        injuries=injuries,
        deaths=deaths,
        incidents=incidents,
        hazard_descriptions=hazard_descriptions
    )
    
    return {
        "risk_level": level.value,
        "risk_score": score,
        "factors": {
            "units_affected": units_affected,
            "injuries": injuries,
            "deaths": deaths,
            "incidents": incidents
        }
    }


@router.get("/by-agency/{agency_name}")
async def get_violations_by_agency(agency_name: str):
    """Get all violations from a specific agency."""
    violations = await db.get_violations_by_agency(agency_name)
    return violations

