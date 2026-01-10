"""
Investigations API Router
=========================
Endpoints for managing scheduled investigations.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime
import uuid
import asyncio

from app.models.investigation import (
    Investigation,
    InvestigationCreate,
    InvestigationUpdate,
    InvestigationSummary,
    InvestigationStatus,
    InvestigationSchedule,
)
from app.services import database as db
from app.services.investigation_scheduler import schedule_investigation, remove_investigation_job, run_investigation_task

router = APIRouter()


@router.post("/", response_model=Investigation)
async def create_investigation(investigation_data: InvestigationCreate, created_by: str = "system"):
    """
    Create a new investigation.
    Note: In production, created_by should come from authenticated user.
    """
    investigation_id = f"inv-{uuid.uuid4().hex[:8]}"
    
    investigation = Investigation(
        investigation_id=investigation_id,
        name=investigation_data.name,
        description=investigation_data.description,
        schedule=investigation_data.schedule,
        scheduled_start_time=investigation_data.scheduled_start_time,
        violation_ids=investigation_data.violation_ids,
        marketplace_ids=investigation_data.marketplace_ids,
        region_ids=investigation_data.region_ids,
        agent_id=investigation_data.agent_id,
        status=InvestigationStatus.SCHEDULED,
        created_by=created_by,
    )
    
    investigation = await db.add_investigation(investigation)
    
    # Schedule the investigation
    if investigation.status == InvestigationStatus.SCHEDULED:
        await schedule_investigation(investigation)
    
    return investigation


@router.get("/", response_model=List[InvestigationSummary])
async def list_investigations(
    status: Optional[InvestigationStatus] = Query(None, description="Filter by status"),
    created_by: Optional[str] = Query(None, description="Filter by creator"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """List all investigations with optional filtering."""
    investigations = await db.get_all_investigations()
    
    # Filter by status if specified
    if status:
        investigations = [inv for inv in investigations if inv.status == status]
    
    # Filter by creator if specified
    if created_by:
        investigations = [inv for inv in investigations if inv.created_by == created_by]
    
    # Sort by scheduled_start_time (upcoming first)
    investigations.sort(key=lambda inv: inv.scheduled_start_time)
    
    # Paginate
    investigations = investigations[offset:offset + limit]
    
    # Convert to summaries
    return [
        InvestigationSummary(
            investigation_id=inv.investigation_id,
            name=inv.name,
            status=inv.status,
            schedule=inv.schedule,
            scheduled_start_time=inv.scheduled_start_time,
            violation_ids=inv.violation_ids,
            marketplace_ids=inv.marketplace_ids,
            listings_found=inv.listings_found,
            listings_queued=inv.listings_queued,
            created_at=inv.created_at,
            created_by=inv.created_by,
        )
        for inv in investigations
    ]


@router.get("/{investigation_id}", response_model=Investigation)
async def get_investigation(investigation_id: str):
    """Get full details of a specific investigation."""
    investigation = await db.get_investigation(investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return investigation


@router.patch("/{investigation_id}", response_model=Investigation)
async def update_investigation(
    investigation_id: str,
    update_data: InvestigationUpdate
):
    """Update an investigation."""
    investigation = await db.get_investigation(investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    
    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(investigation, field, value)
    
    investigation.updated_at = datetime.utcnow()
    investigation = await db.update_investigation(investigation)
    
    # Reschedule if status changed to SCHEDULED
    if investigation.status == InvestigationStatus.SCHEDULED:
        await schedule_investigation(investigation)
    
    return investigation


@router.post("/{investigation_id}/run", response_model=Investigation)
async def run_investigation(investigation_id: str):
    """
    Manually trigger an investigation to run immediately.
    This will start the investigation process asynchronously.
    """
    investigation = await db.get_investigation(investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    
    if investigation.status == InvestigationStatus.RUNNING:
        raise HTTPException(status_code=400, detail="Investigation is already running")
    
    # Update status to running
    investigation.status = InvestigationStatus.RUNNING
    investigation.start_time = datetime.utcnow()
    investigation.updated_at = datetime.utcnow()
    
    investigation = await db.update_investigation(investigation)
    
    # Trigger actual investigation execution asynchronously
    asyncio.create_task(run_investigation_task(investigation_id))
    
    return investigation


@router.delete("/{investigation_id}")
async def delete_investigation(investigation_id: str):
    """Cancel/delete an investigation."""
    investigation = await db.get_investigation(investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    
    # Cancel if running
    if investigation.status == InvestigationStatus.RUNNING:
        investigation.status = InvestigationStatus.CANCELLED
        investigation.end_time = datetime.utcnow()
        investigation.updated_at = datetime.utcnow()
        await db.update_investigation(investigation)
    else:
        await db.delete_investigation(investigation_id)
    
    # Remove scheduled job
    remove_investigation_job(investigation_id)
    
    return {"message": "Investigation deleted", "investigation_id": investigation_id}


@router.get("/{investigation_id}/listings")
async def get_investigation_listings(investigation_id: str):
    """Get all marketplace listings found by an investigation."""
    investigation = await db.get_investigation(investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    
    # TODO: Get listings associated with this investigation
    # For now, return empty list
    listings = await db.get_listings_for_investigation(investigation_id)
    return {"investigation_id": investigation_id, "listings": listings}


@router.get("/by-violation/{violation_id}", response_model=List[Investigation])
async def get_investigations_by_violation(violation_id: str):
    """Get all investigations that include a specific violation."""
    all_investigations = await db.get_all_investigations()
    
    # Filter investigations that include this violation
    matching_investigations = [
        inv for inv in all_investigations
        if violation_id in inv.violation_ids
    ]
    
    # Sort by created_at (most recent first)
    matching_investigations.sort(key=lambda inv: inv.created_at, reverse=True)
    
    return matching_investigations

