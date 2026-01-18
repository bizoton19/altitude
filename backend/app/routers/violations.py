"""
Product Bans API Router
=====================
Endpoints for managing and querying product bans.
Supports banned products from any regulatory agency.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime

from app.models.product_ban import ProductBan, ProductBanSummary, ProductBanCreate, RiskLevel, BanType
from app.services import database as db
from app.skills.risk_classifier import classify_risk

router = APIRouter()


@router.get("/", response_model=List[ProductBanSummary])
async def list_product_bans(
    risk_level: Optional[RiskLevel] = Query(None, description="Filter by risk level"),
    agency_name: Optional[str] = Query(None, description="Filter by agency name"),
    country: Optional[str] = Query(None, description="Filter by country code (ISO 3166-1 alpha-2)"),
    ban_type: Optional[BanType] = Query(None, description="Filter by product ban type"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """
    List all product bans with optional filtering.
    Returns lightweight summaries for performance.
    """
    try:
        product_bans = await db.get_all_violations()  # TODO: Rename to get_all_product_bans
        
        # Filter by risk level if specified
        if risk_level:
            product_bans = [v for v in product_bans if v.risk_level == risk_level]
        
        # Filter by agency if specified
        if agency_name:
            product_bans = [v for v in product_bans if v.agency_name.lower() == agency_name.lower()]
        
        # Filter by country if specified
        if country:
            product_bans = [v for v in product_bans if v.country == country]
        
        # Filter by ban type if specified
        if ban_type:
            product_bans = [v for v in product_bans if v.ban_type == ban_type]
        
        # Sort by date (newest first) then by risk score
        product_bans.sort(key=lambda v: (v.ban_date or datetime.min, v.risk_score), reverse=True)
        
        # Paginate
        product_bans = product_bans[offset:offset + limit]
        
        # Convert to summaries
        summaries = []
        for v in product_bans:
            try:
                # Safely get image URL
                image_url = None
                if v.images and len(v.images) > 0 and hasattr(v.images[0], 'url'):
                    image_url = v.images[0].url
                
                summaries.append(ProductBanSummary(
                    product_ban_id=v.product_ban_id,
                    ban_number=v.ban_number,
                    title=v.title,
                    url=v.url,
                    agency_name=v.agency_name,
                    agency_acronym=v.agency_acronym,
                    ban_type=v.ban_type,
                    risk_level=v.risk_level,
                    risk_score=v.risk_score,
                    ban_date=v.ban_date or datetime.utcnow(),
                    injuries=v.injuries,
                    deaths=v.deaths,
                    country=v.country,
                    image_url=image_url
                ))
            except Exception as e:
                # Log error but continue processing other product bans
                print(f"Error creating summary for product ban {v.product_ban_id}: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        return summaries
    except Exception as e:
        print(f"Error in list_product_bans endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching product bans: {str(e)}")


@router.get("/summary")
async def get_risk_summary():
    """Get summary counts of product bans by risk level."""
    return await db.get_violations_risk_summary()  # TODO: Rename to get_product_bans_risk_summary


@router.get("/search")
async def search_product_bans(
    q: str = Query(..., min_length=1, description="Search query"),
    risk_level: Optional[RiskLevel] = Query(None),
    agency_name: Optional[str] = Query(None),
    country: Optional[str] = Query(None)
):
    """
    Search product bans by text query.
    Searches title, description, ban number, product names, and model numbers.
    """
    product_bans = await db.search_violations(q, risk_level, agency_name, country)  # TODO: Rename to search_product_bans
    
    # Convert to summaries
    summaries = []
    for v in product_bans:
        try:
            # Safely get image URL
            image_url = None
            if v.images and len(v.images) > 0 and hasattr(v.images[0], 'url'):
                image_url = v.images[0].url
            
            summaries.append(ProductBanSummary(
                product_ban_id=v.product_ban_id,
                ban_number=v.ban_number,
                title=v.title,
                url=v.url,
                agency_name=v.agency_name,
                agency_acronym=v.agency_acronym,
                ban_type=v.ban_type,
                risk_level=v.risk_level,
                risk_score=v.risk_score,
                ban_date=v.ban_date or datetime.utcnow(),
                injuries=v.injuries,
                deaths=v.deaths,
                country=v.country,
                image_url=image_url
            ))
        except Exception as e:
            # Log error but continue processing other product bans
            print(f"Error creating summary for product ban {v.product_ban_id}: {e}")
            continue
    
    return summaries


@router.get("/{product_ban_id}", response_model=ProductBan)
async def get_product_ban(product_ban_id: str):
    """Get full details of a specific product ban."""
    product_ban = await db.get_violation(product_ban_id)  # TODO: Rename to get_product_ban
    if not product_ban:
        raise HTTPException(status_code=404, detail="Product ban not found")
    return product_ban


@router.get("/{product_ban_id}/listings")
async def get_product_ban_listings(product_ban_id: str):
    """Get all marketplace listings found for a product ban."""
    product_ban = await db.get_violation(product_ban_id)  # TODO: Rename to get_product_ban
    if not product_ban:
        raise HTTPException(status_code=404, detail="Product ban not found")
    
    listings = await db.get_listings_for_violation(product_ban_id)  # TODO: Rename to get_listings_for_product_ban
    return listings


@router.post("/", response_model=ProductBan)
async def create_product_ban(
    product_ban_data: ProductBanCreate,
    auto_classify: bool = True,
    auto_investigate: bool = True
):
    """
    Create a new product ban with optional auto-classification and auto-investigation.
    Uses workflow service for complete processing.
    """
    from app.services.workflow_service import process_violation_import  # TODO: Rename to process_product_ban_import
    from app.models.import_models import ImportSource
    
    result = await process_violation_import(
        violation_data=product_ban_data,  # TODO: Update parameter name
        source=ImportSource.MANUAL,
        source_name="Manual Entry",
        auto_classify=auto_classify,
        auto_investigate=auto_investigate,
        created_by="system"
    )
    
    return result["violation"]  # TODO: Update key name to "product_ban"


@router.delete("/{product_ban_id}")
async def delete_product_ban(product_ban_id: str):
    """Delete a product ban and all associated data."""
    deleted = await db.delete_violation(product_ban_id)  # TODO: Rename to delete_product_ban
    if not deleted:
        raise HTTPException(status_code=404, detail="Product ban not found")
    return {"message": "Product ban deleted successfully", "product_ban_id": product_ban_id}


@router.delete("/", response_model=dict)
async def delete_all_product_bans():
    """Delete all product bans and their associated data. Use with caution!"""
    count = await db.delete_all_violations()  # TODO: Rename to delete_all_product_bans
    return {
        "message": f"Deleted {count} product bans and associated data",
        "count": count
    }


@router.post("/classify")
async def classify_product_ban_risk(
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
async def get_product_bans_by_agency(agency_name: str):
    """Get all product bans from a specific agency."""
    product_bans = await db.get_violations_by_agency(agency_name)  # TODO: Rename to get_product_bans_by_agency
    return product_bans

