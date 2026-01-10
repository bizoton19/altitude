"""
Organizations API Router
========================
Endpoints for managing organizations (Companies and Regulatory Agencies).
"""

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from uuid import uuid4

from app.models.organization import Organization, OrganizationCreate, OrganizationUpdate, OrganizationType, OrganizationStatus
from app.services import database as db

router = APIRouter()


# IMPORTANT: Place /me/current BEFORE /{organization_id} to avoid route conflict
@router.get("/me/current", response_model=Organization)
async def get_current_organization():
    """Get the current user's organization."""
    try:
        # TODO: Get from auth context
        organization = await db.get_current_user_organization()
        if not organization:
            raise HTTPException(status_code=404, detail="No organization found for current user")
        return organization
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[ERROR] Failed to get current organization: {e}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/", response_model=List[Organization])
async def list_organizations(
    organization_type: Optional[OrganizationType] = None,
    status: Optional[OrganizationStatus] = None,
    country: Optional[str] = None
):
    """List all organizations with optional filtering."""
    organizations = await db.get_organizations(
        organization_type=organization_type,
        status=status,
        country=country
    )
    return organizations


@router.get("/{organization_id}", response_model=Organization)
async def get_organization(organization_id: str):
    """Get a specific organization by ID."""
    organization = await db.get_organization(organization_id)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    return organization


@router.post("/", response_model=Organization, status_code=201)
async def create_organization(organization: OrganizationCreate):
    """Create a new organization (company or regulatory agency)."""
    try:
        new_org = await db.create_organization(organization)
        return new_org
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create organization: {str(e)}")


@router.put("/{organization_id}", response_model=Organization)
async def update_organization(organization_id: str, updates: OrganizationUpdate):
    """Update an organization."""
    updated_org = await db.update_organization(organization_id, updates)
    if not updated_org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return updated_org


@router.delete("/{organization_id}", status_code=204)
async def delete_organization(organization_id: str):
    """Delete an organization (soft delete - set to inactive)."""
    success = await db.delete_organization(organization_id)
    if not success:
        raise HTTPException(status_code=404, detail="Organization not found")

