"""
Marketplaces API Router
=======================
Endpoints for managing marketplace configurations.
"""

from fastapi import APIRouter, HTTPException, Query, Body
from typing import List, Optional
from datetime import datetime

from app.models.marketplace import (
    Marketplace, 
    MarketplaceCreate, 
    MarketplaceUpdate, 
    MarketplaceListing,
    PlatformAgreement,
    PlatformAgreementCreate,
    PlatformAgreementUpdate,
    NotificationType
)
from app.services import database as db
from app.services.credential_encryption import credential_encryption
from app.services.marketplace_risk_calculator import risk_calculator

router = APIRouter()


@router.get("/", response_model=List[Marketplace])
async def list_marketplaces(enabled_only: bool = Query(False)):
    """List all configured marketplaces."""
    marketplaces = await db.get_all_marketplaces()
    
    if enabled_only:
        marketplaces = [m for m in marketplaces if m.enabled]
    
    return marketplaces


@router.get("/{marketplace_id}", response_model=Marketplace)
async def get_marketplace(marketplace_id: str):
    """Get details of a specific marketplace."""
    marketplace = await db.get_marketplace(marketplace_id)
    if not marketplace:
        raise HTTPException(status_code=404, detail="Marketplace not found")
    
    # Decrypt credentials before returning (if they exist)
    if marketplace.notification_portal_credentials:
        try:
            decrypted = credential_encryption.decrypt_credentials(
                marketplace.notification_portal_credentials
            )
            marketplace.notification_portal_credentials = decrypted
        except Exception:
            # If decryption fails, return as-is (might be plaintext or corrupted)
            pass
    
    return marketplace


@router.post("/", response_model=Marketplace)
async def add_marketplace(marketplace: MarketplaceCreate):
    """Add a new marketplace to monitor."""
    # Generate ID from name
    marketplace_id = marketplace.name.lower().replace(" ", "_")
    
    # Check if already exists
    existing = await db.get_marketplace(marketplace_id)
    if existing:
        raise HTTPException(status_code=400, detail="Marketplace already exists")
    
    new_marketplace = Marketplace(
        id=marketplace_id,
        name=marketplace.name,
        url=marketplace.url,
        search_url_template=marketplace.search_url_template,
        requires_api_key=marketplace.requires_api_key,
        enabled=True
    )
    
    return await db.add_marketplace(new_marketplace)


@router.patch("/{marketplace_id}", response_model=Marketplace)
async def update_marketplace(marketplace_id: str, updates: MarketplaceUpdate):
    """Update marketplace settings."""
    update_data = updates.model_dump(exclude_unset=True)
    
    # Encrypt portal credentials if provided
    if "notification_portal_credentials" in update_data and update_data["notification_portal_credentials"]:
        update_data["notification_portal_credentials"] = credential_encryption.encrypt_credentials(
            update_data["notification_portal_credentials"]
        )
    
    # Update timestamp
    update_data["updated_at"] = datetime.utcnow()
    
    updated = await db.update_marketplace(marketplace_id, update_data)
    if not updated:
        raise HTTPException(status_code=404, detail="Marketplace not found")
    
    # Decrypt credentials before returning (if they exist)
    if updated.notification_portal_credentials:
        try:
            decrypted = credential_encryption.decrypt_credentials(
                updated.notification_portal_credentials
            )
            updated.notification_portal_credentials = decrypted
        except Exception:
            # If decryption fails, return as-is (might be plaintext or corrupted)
            pass
    
    return updated


@router.post("/{marketplace_id}/toggle")
async def toggle_marketplace(marketplace_id: str):
    """Toggle marketplace enabled status."""
    marketplace = await db.get_marketplace(marketplace_id)
    if not marketplace:
        raise HTTPException(status_code=404, detail="Marketplace not found")
    
    updated = await db.update_marketplace(marketplace_id, {"enabled": not marketplace.enabled})
    return {"enabled": updated.enabled}


@router.get("/{marketplace_id}/listings", response_model=List[MarketplaceListing])
async def get_marketplace_listings(
    marketplace_id: str,
    recall_id: str = Query(None)
):
    """Get listings found on a specific marketplace."""
    marketplace = await db.get_marketplace(marketplace_id)
    if not marketplace:
        raise HTTPException(status_code=404, detail="Marketplace not found")
    
    # Get all listings for this marketplace
    all_listings = []
    if recall_id:
        listings = await db.get_listings_for_recall(recall_id)
        all_listings = [l for l in listings if l.marketplace_id == marketplace_id]
    
    return all_listings


@router.post("/{marketplace_id}/calculate-risk")
async def calculate_marketplace_risk(
    marketplace_id: str,
    lookback_days: int = Query(30, ge=1, le=365)
):
    """Calculate and update risk level for a marketplace."""
    marketplace = await db.get_marketplace(marketplace_id)
    if not marketplace:
        raise HTTPException(status_code=404, detail="Marketplace not found")
    
    risk_data = await risk_calculator.update_marketplace_risk(marketplace_id)
    return risk_data


@router.post("/{marketplace_id}/test-notification")
async def test_marketplace_notification(
    marketplace_id: str,
    notification_type: NotificationType = Body(...)
):
    """Test notification delivery for a marketplace."""
    marketplace = await db.get_marketplace(marketplace_id)
    if not marketplace:
        raise HTTPException(status_code=404, detail="Marketplace not found")
    
    # Check if notification type is enabled
    if notification_type not in marketplace.notification_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Notification type {notification_type} is not enabled for this marketplace"
        )
    
    # TODO: Implement actual notification sending
    # For now, return success
    return {
        "success": True,
        "notification_type": notification_type,
        "message": f"Test notification sent via {notification_type}",
        "timestamp": datetime.utcnow()
    }


@router.post("/{marketplace_id}/agreements", response_model=PlatformAgreement)
async def add_platform_agreement(
    marketplace_id: str,
    agreement: PlatformAgreementCreate
):
    """Add a platform agreement to a marketplace."""
    marketplace = await db.get_marketplace(marketplace_id)
    if not marketplace:
        raise HTTPException(status_code=404, detail="Marketplace not found")
    
    new_agreement = PlatformAgreement(
        agreement_id=f"agr-{datetime.utcnow().timestamp()}",
        agreement_type=agreement.agreement_type,
        agreement_date=agreement.agreement_date,
        agreement_url=agreement.agreement_url,
        email_attachments=agreement.email_attachments,
        metadata=agreement.metadata
    )
    
    # Add agreement to marketplace
    if not marketplace.platform_agreements:
        marketplace.platform_agreements = []
    marketplace.platform_agreements.append(new_agreement)
    
    # Update marketplace
    updated = await db.update_marketplace(marketplace_id, {
        "platform_agreements": marketplace.platform_agreements
    })
    
    return new_agreement


@router.patch("/{marketplace_id}/agreements/{agreement_id}", response_model=PlatformAgreement)
async def update_platform_agreement(
    marketplace_id: str,
    agreement_id: str,
    updates: PlatformAgreementUpdate
):
    """Update a platform agreement."""
    marketplace = await db.get_marketplace(marketplace_id)
    if not marketplace:
        raise HTTPException(status_code=404, detail="Marketplace not found")
    
    if not marketplace.platform_agreements:
        raise HTTPException(status_code=404, detail="Agreement not found")
    
    # Find and update agreement
    agreement_index = None
    for i, agr in enumerate(marketplace.platform_agreements):
        if agr.agreement_id == agreement_id:
            agreement_index = i
            break
    
    if agreement_index is None:
        raise HTTPException(status_code=404, detail="Agreement not found")
    
    # Update agreement
    update_data = updates.model_dump(exclude_unset=True)
    current_agreement = marketplace.platform_agreements[agreement_index]
    updated_agreement = PlatformAgreement(
        **{**current_agreement.model_dump(), **update_data}
    )
    
    marketplace.platform_agreements[agreement_index] = updated_agreement
    
    # Update marketplace
    await db.update_marketplace(marketplace_id, {
        "platform_agreements": marketplace.platform_agreements
    })
    
    return updated_agreement


@router.delete("/{marketplace_id}/agreements/{agreement_id}")
async def delete_platform_agreement(
    marketplace_id: str,
    agreement_id: str
):
    """Delete a platform agreement."""
    marketplace = await db.get_marketplace(marketplace_id)
    if not marketplace:
        raise HTTPException(status_code=404, detail="Marketplace not found")
    
    if not marketplace.platform_agreements:
        raise HTTPException(status_code=404, detail="Agreement not found")
    
    # Remove agreement
    marketplace.platform_agreements = [
        agr for agr in marketplace.platform_agreements 
        if agr.agreement_id != agreement_id
    ]
    
    if len(marketplace.platform_agreements) == len([a for a in marketplace.platform_agreements if a.agreement_id != agreement_id]):
        raise HTTPException(status_code=404, detail="Agreement not found")
    
    # Update marketplace
    await db.update_marketplace(marketplace_id, {
        "platform_agreements": marketplace.platform_agreements
    })
    
    return {"success": True, "message": "Agreement deleted"}
