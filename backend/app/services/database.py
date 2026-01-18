"""
Database service using SQLite with SQLAlchemy.
Replaces in-memory storage with persistent database.
"""

from typing import Dict, List, Optional
from datetime import datetime
import json
import os
from pathlib import Path
import uuid
import asyncio

from sqlalchemy import select, update, delete, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import OperationalError

from app.models.recall import Recall, RecallImage, RecallProduct, RecallHazard, RecallRemedy, RiskLevel
from app.models.product_ban import ProductBan, ProductBanImage, ProductBanProduct, ProductBanHazard, ProductBanRemedy, ProductBanCreate, BanType
from app.models.marketplace import Marketplace, MarketplaceListing, DEFAULT_MARKETPLACES
from app.models.agent import AgentConfig, SearchTask, ToolConfig, ToolType, LLMProvider, AgentSkill, SkillType
from app.models.investigation import Investigation
from app.models.investigation_listing import InvestigationListing
from app.models.import_models import ImportHistory, ImportSource
from app.models.organization import Organization, OrganizationCreate, OrganizationUpdate, OrganizationType, OrganizationStatus
from app.models.risk_classification import get_default_risk_classification_config, RiskClassificationConfig
from app.skills.risk_classifier import classify_recall, classify_violation, classify_risk
from app.config import settings

from app.db.session import AsyncSessionLocal, init_database
from app.db.models import (
    ProductBanDB, ProductBanProductDB, ProductBanHazardDB,
    ProductBanRemedyDB, ProductBanImageDB,
    MarketplaceDB, MarketplaceListingDB,
    InvestigationDB, InvestigationListingDB,
    ImportHistoryDB, AgentConfigDB, SearchTaskDB,
    OrganizationDB
)
from app.db.converters import (
    product_ban_to_db, db_to_product_ban,
    product_ban_product_to_db, product_ban_hazard_to_db,
    product_ban_remedy_to_db, product_ban_image_to_db,
    marketplace_to_db, db_to_marketplace,
    marketplace_listing_to_db, db_to_marketplace_listing,
    investigation_to_db, db_to_investigation,
    import_history_to_db, db_to_import_history,
    organization_to_db, db_to_organization,
)


async def get_db_session() -> AsyncSession:
    """Get database session."""
    async with AsyncSessionLocal() as session:
        return session


async def init_db():
    """Initialize the database with default data."""
    # Initialize database tables
    await init_database()
    
    # Initialize default marketplaces
    async with AsyncSessionLocal() as session:
        try:
            # Check if marketplaces already exist
            result = await session.execute(select(MarketplaceDB).limit(1))
            existing = result.scalar_one_or_none()
            
            if not existing:
                # Create default marketplaces
                for mp_data in DEFAULT_MARKETPLACES:
                    marketplace = Marketplace(**mp_data)
                    db_marketplace = marketplace_to_db(marketplace)
                    session.add(db_marketplace)
                
                await session.commit()
                print("Default marketplaces initialized")
            
            # Initialize default agent config
            result = await session.execute(select(AgentConfigDB).where(AgentConfigDB.id == "default"))
            existing_config = result.scalar_one_or_none()
            
            if not existing_config:
                from app.models.agent import AgentConfig
                agent_config = AgentConfig(
                    id="default",
                    llm_provider=LLMProvider.OPENAI,
                    llm_model="gpt-4o",
                    tools=[
                        ToolConfig(tool_type=ToolType.CUSTOM_WEBHOOK, enabled=False),
                    ],
                    skills=[
                        AgentSkill(
                            skill_id="risk_classifier",
                            skill_type=SkillType.RISK_CLASSIFICATION,
                            name="Risk Classification",
                            description="Classifies violations and recalls by risk level based on injuries, deaths, units affected, and hazard severity",
                            enabled=True,
                            priority=80,
                            settings=get_default_risk_classification_config().model_dump(mode='json')
                        ),
                    ]
                )
                db_config = AgentConfigDB(
                    id="default",
                    config_data=agent_config.model_dump(mode='json'),
                )
                session.add(db_config)
                await session.commit()
                print("Default agent config initialized")
            
            # Initialize default organization for local development
            if settings.DEBUG:
                await ensure_default_organization(session)
        except Exception as e:
            await session.rollback()
            print(f"Error initializing database: {e}")
            raise


# Violation operations
async def get_all_violations(limit: Optional[int] = None, offset: int = 0) -> List[ProductBan]:
    """Get all product bans (backward compatibility - function name kept for now)."""
    async with AsyncSessionLocal() as session:
        query = select(ProductBanDB).options(
            selectinload(ProductBanDB.products),
            selectinload(ProductBanDB.hazards),
            selectinload(ProductBanDB.remedies),
            selectinload(ProductBanDB.images),
        ).order_by(ProductBanDB.created_at.desc())
        
        if limit:
            query = query.limit(limit).offset(offset)
        
        result = await session.execute(query)
        db_product_bans = result.scalars().all()
        return [db_to_product_ban(v) for v in db_product_bans]


async def get_violation(violation_id: str) -> Optional[ProductBan]:
    """Get a specific product ban by ID (backward compatibility - function name kept for now)."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(ProductBanDB).options(
                selectinload(ProductBanDB.products),
                selectinload(ProductBanDB.hazards),
                selectinload(ProductBanDB.remedies),
                selectinload(ProductBanDB.images),
            ).where(ProductBanDB.product_ban_id == violation_id)
        )
        db_product_ban = result.scalar_one_or_none()
        if db_product_ban:
            return db_to_product_ban(db_product_ban)
        return None


async def search_violations(
    query: str,
    risk_level: Optional[RiskLevel] = None,
    agency_name: Optional[str] = None,
    country: Optional[str] = None
) -> List[ProductBan]:
    """Search product bans by text query and optional filters (backward compatibility - function name kept for now)."""
    async with AsyncSessionLocal() as session:
        stmt = select(ProductBanDB).options(
            selectinload(ProductBanDB.products),
            selectinload(ProductBanDB.hazards),
            selectinload(ProductBanDB.remedies),
            selectinload(ProductBanDB.images),
        )
        
        conditions = []
        query_lower = query.lower()
        
        # Text search
        conditions.append(
            or_(
                ProductBanDB.title.ilike(f"%{query}%"),
                ProductBanDB.description.ilike(f"%{query}%"),
                ProductBanDB.ban_number.ilike(f"%{query}%"),
            )
        )
        
        # Filters
        if risk_level:
            conditions.append(ProductBanDB.risk_level == risk_level)
        if agency_name:
            conditions.append(ProductBanDB.agency_name.ilike(f"%{agency_name}%"))
        if country:
            conditions.append(ProductBanDB.country == country)
        
        if conditions:
            stmt = stmt.where(*conditions)
        
        result = await session.execute(stmt)
        db_product_bans = result.scalars().all()
        
        product_bans = [db_to_product_ban(v) for v in db_product_bans]
        
        # Additional product-based filtering
        filtered = []
        for product_ban in product_bans:
            searchable = f"{product_ban.title} {product_ban.description or ''} {product_ban.ban_number}".lower()
            for product in product_ban.products:
                searchable += f" {product.name} {product.model_number or ''} {product.manufacturer or ''}".lower()
            
            if query_lower in searchable:
                filtered.append(product_ban)
        
        return filtered


async def add_violation(product_ban: ProductBan) -> ProductBan:
    """Add a new product ban with auto-classification (backward compatibility - function name kept for now)."""
    # Auto-classify risk
    product_ban = await classify_violation(product_ban)  # TODO: Rename to classify_product_ban
    
    async with AsyncSessionLocal() as session:
        try:
            # Check if product ban already exists
            existing = await session.get(ProductBanDB, product_ban.product_ban_id)
            if existing:
                # Update existing
                db_product_ban = product_ban_to_db(product_ban)
                for key, value in db_product_ban.__dict__.items():
                    if not key.startswith('_') and key != 'product_ban_id':
                        setattr(existing, key, value)
                existing.updated_at = datetime.utcnow()
            else:
                # Create new
                db_product_ban = product_ban_to_db(product_ban)
                session.add(db_product_ban)
            
            # Add related objects
            try:
                for product in product_ban.products:
                    db_product = product_ban_product_to_db(product, product_ban.product_ban_id)
                    session.add(db_product)
            except Exception as e:
                print(f"[ERROR] Failed to add products for {product_ban.product_ban_id}: {e}")
                raise
            
            try:
                for hazard in product_ban.hazards:
                    db_hazard = product_ban_hazard_to_db(hazard, product_ban.product_ban_id)
                    session.add(db_hazard)
            except Exception as e:
                print(f"[ERROR] Failed to add hazards for {product_ban.product_ban_id}: {e}")
                raise
            
            try:
                for remedy in product_ban.remedies:
                    db_remedy = product_ban_remedy_to_db(remedy, product_ban.product_ban_id)
                    session.add(db_remedy)
            except Exception as e:
                print(f"[ERROR] Failed to add remedies for {product_ban.product_ban_id}: {e}")
                raise
            
            try:
                for image in product_ban.images:
                    db_image = product_ban_image_to_db(image, product_ban.product_ban_id)
                    session.add(db_image)
            except Exception as e:
                print(f"[ERROR] Failed to add images for {product_ban.product_ban_id}: {e}")
                raise
            
            await session.commit()
            await session.refresh(db_product_ban if not existing else existing)
            
            return await get_violation(product_ban.product_ban_id)
        except Exception as e:
            await session.rollback()
            import traceback
            error_details = {
                'product_ban_id': product_ban.product_ban_id,
                'ban_number': product_ban.ban_number,
                'error_type': type(e).__name__,
                'error_message': str(e),
                'traceback': traceback.format_exc()
            }
            print(f"[ERROR] Failed to add product ban {product_ban.product_ban_id}:")
            print(f"[ERROR] Type: {error_details['error_type']}")
            print(f"[ERROR] Message: {error_details['error_message']}")
            print(f"[ERROR] Traceback:\n{error_details['traceback']}")
            # Log product ban data for debugging (truncated)
            print(f"[ERROR] Product ban data: product_ban_id={product_ban.product_ban_id}, title={product_ban.title[:50] if product_ban.title else None}")
            print(f"[ERROR] Products: {len(product_ban.products)}, Hazards: {len(product_ban.hazards)}, Remedies: {len(product_ban.remedies)}, Images: {len(product_ban.images)}")
            raise


async def delete_violation(violation_id: str) -> bool:
    """Delete a violation and all associated data (products, hazards, remedies, images, listings)."""
    from app.db.models import MarketplaceListingDB
    
    async with AsyncSessionLocal() as session:
        try:
            # Get product ban with all relationships loaded
            db_product_ban = await session.get(
                ProductBanDB,
                violation_id,
                options=[
                    selectinload(ProductBanDB.products),
                    selectinload(ProductBanDB.hazards),
                    selectinload(ProductBanDB.remedies),
                    selectinload(ProductBanDB.images),
                ]
            )
            
            if not db_product_ban:
                return False
            
            # Delete associated listings (listings don't have cascade delete)
            listings_result = await session.execute(
                select(MarketplaceListingDB).where(MarketplaceListingDB.product_ban_id == violation_id)
            )
            listings = listings_result.scalars().all()
            for listing in listings:
                await session.delete(listing)
            
            # Delete product ban (cascade will handle products, hazards, remedies, images)
            await session.delete(db_product_ban)
            
            await session.commit()
            return True
        except Exception as e:
            await session.rollback()
            print(f"Error deleting violation: {e}")
            raise


async def delete_all_violations() -> int:
    """Delete all violations and their associated data. Returns count of deleted violations."""
    from app.db.models import MarketplaceListingDB
    
    async with AsyncSessionLocal() as session:
        try:
            # Get all product ban IDs
            result = await session.execute(select(ProductBanDB.product_ban_id))
            product_ban_ids = [row[0] for row in result.all()]
            count = len(product_ban_ids)
            
            if count == 0:
                return 0
            
            # Delete all associated listings
            listings_result = await session.execute(
                select(MarketplaceListingDB).where(MarketplaceListingDB.product_ban_id.in_(product_ban_ids))
            )
            listings = listings_result.scalars().all()
            for listing in listings:
                await session.delete(listing)
            
            # Delete all product bans (cascade will handle related data)
            product_bans_result = await session.execute(select(ProductBanDB))
            product_bans = product_bans_result.scalars().all()
            for product_ban in product_bans:
                await session.delete(product_ban)
            
            await session.commit()
            return count
        except Exception as e:
            await session.rollback()
            print(f"Error deleting all violations: {e}")
            raise


async def get_violations_by_agency(agency_name: str) -> List[ProductBan]:
    """Get all product bans from a specific agency (backward compatibility - function name kept for now)."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(ProductBanDB).options(
                selectinload(ProductBanDB.products),
                selectinload(ProductBanDB.hazards),
                selectinload(ProductBanDB.remedies),
                selectinload(ProductBanDB.images),
            ).where(ProductBanDB.agency_name.ilike(f"%{agency_name}%"))
        )
        db_product_bans = result.scalars().all()
        return [db_to_product_ban(v) for v in db_product_bans]


async def get_violations_by_risk(risk_level: RiskLevel) -> List[ProductBan]:
    """Get product bans filtered by risk level (backward compatibility - function name kept for now)."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(ProductBanDB).options(
                selectinload(ProductBanDB.products),
                selectinload(ProductBanDB.hazards),
                selectinload(ProductBanDB.remedies),
                selectinload(ProductBanDB.images),
            ).where(ProductBanDB.risk_level == risk_level)
        )
        db_product_bans = result.scalars().all()
        return [db_to_product_ban(v) for v in db_product_bans]


async def get_violations_risk_summary() -> Dict[str, int]:
    """Get count of product bans by risk level (backward compatibility - function name kept for now)."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(
                ProductBanDB.risk_level,
                func.count(ProductBanDB.product_ban_id).label('count')
            ).group_by(ProductBanDB.risk_level)
        )
        counts = {row.risk_level.value: row.count for row in result}
        
        total_result = await session.execute(select(func.count(ProductBanDB.product_ban_id)))
        total = total_result.scalar() or 0
        
        return {
            "HIGH": counts.get("HIGH", 0),
            "MEDIUM": counts.get("MEDIUM", 0),
            "LOW": counts.get("LOW", 0),
            "total": total
        }


# Marketplace operations
async def get_all_marketplaces() -> List[Marketplace]:
    """Get all configured marketplaces."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(MarketplaceDB))
        db_marketplaces = result.scalars().all()
        return [db_to_marketplace(mp) for mp in db_marketplaces]


async def get_marketplace(marketplace_id: str) -> Optional[Marketplace]:
    """Get a specific marketplace."""
    async with AsyncSessionLocal() as session:
        db_marketplace = await session.get(MarketplaceDB, marketplace_id)
        if db_marketplace:
            return db_to_marketplace(db_marketplace)
        return None


async def save_marketplace(marketplace: Marketplace) -> Marketplace:
    """Save or update a marketplace."""
    async with AsyncSessionLocal() as session:
        try:
            existing = await session.get(MarketplaceDB, marketplace.id)
            if existing:
                db_marketplace = marketplace_to_db(marketplace)
                for key, value in db_marketplace.__dict__.items():
                    if not key.startswith('_') and key != 'id':
                        setattr(existing, key, value)
                existing.updated_at = datetime.utcnow()
                await session.commit()
                return db_to_marketplace(existing)
            else:
                db_marketplace = marketplace_to_db(marketplace)
                session.add(db_marketplace)
                await session.commit()
                await session.refresh(db_marketplace)
                return db_to_marketplace(db_marketplace)
        except Exception as e:
            await session.rollback()
            raise


async def add_marketplace(marketplace: Marketplace) -> Marketplace:
    """Add a new marketplace."""
    return await save_marketplace(marketplace)


async def update_marketplace(marketplace_id: str, updates: dict) -> Optional[Marketplace]:
    """Update marketplace settings."""
    async with AsyncSessionLocal() as session:
        try:
            db_marketplace = await session.get(MarketplaceDB, marketplace_id)
            if not db_marketplace:
                return None
            
            for key, value in updates.items():
                if hasattr(db_marketplace, key) and value is not None:
                    setattr(db_marketplace, key, value)
            db_marketplace.updated_at = datetime.utcnow()
            
            await session.commit()
            await session.refresh(db_marketplace)
            return db_to_marketplace(db_marketplace)
        except Exception as e:
            await session.rollback()
            raise


# Listing operations
async def save_listing(listing: MarketplaceListing) -> MarketplaceListing:
    """Save a marketplace listing (dedupes by listing_url)."""
    async with AsyncSessionLocal() as session:
        try:
            # Check for existing listing by URL
            result = await session.execute(
                select(MarketplaceListingDB).where(
                    MarketplaceListingDB.listing_url == listing.listing_url
                )
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                # Update existing
                if listing.title:
                    existing.title = listing.title
                if listing.description:
                    existing.description = listing.description
                if listing.image_url:
                    existing.image_url = listing.image_url
                if listing.seller_name:
                    existing.seller_name = listing.seller_name
                if listing.price is not None:
                    existing.price = listing.price
                if listing.match_score > existing.match_score:
                    existing.match_score = listing.match_score
                    existing.match_reasons = listing.match_reasons
                    existing.product_ban_id = listing.violation_id or listing.recall_id  # Support both old and new field names
                existing.updated_at = datetime.utcnow()
                await session.commit()
                await session.refresh(existing)
                return db_to_marketplace_listing(existing)
            else:
                # Create new
                db_listing = marketplace_listing_to_db(listing)
                session.add(db_listing)
                await session.commit()
                await session.refresh(db_listing)
                return db_to_marketplace_listing(db_listing)
        except Exception as e:
            await session.rollback()
            raise


async def get_listings_for_violation(violation_id: str) -> List[MarketplaceListing]:
    """Get all listings found for a product ban (backward compatibility - function name kept for now)."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(MarketplaceListingDB).where(
                MarketplaceListingDB.product_ban_id == violation_id
            )
        )
        db_listings = result.scalars().all()
        return [db_to_marketplace_listing(l) for l in db_listings]


async def get_listings_for_recall(recall_id: str) -> List[MarketplaceListing]:
    """Get all listings found for a recall (backward compatibility)."""
    return await get_listings_for_violation(recall_id)


async def get_listing(listing_id: str) -> Optional[MarketplaceListing]:
    """Get a specific listing by ID."""
    async with AsyncSessionLocal() as session:
        db_listing = await session.get(MarketplaceListingDB, listing_id)
        if db_listing:
            return db_to_marketplace_listing(db_listing)
        return None


async def get_all_listings() -> List[MarketplaceListing]:
    """Get all marketplace listings."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(MarketplaceListingDB))
        db_listings = result.scalars().all()
        return [db_to_marketplace_listing(l) for l in db_listings]


# Investigation operations
async def add_investigation(investigation: Investigation) -> Investigation:
    """Add a new investigation."""
    async with AsyncSessionLocal() as session:
        try:
            db_investigation = investigation_to_db(investigation)
            session.add(db_investigation)
            await session.commit()
            await session.refresh(db_investigation)
            return db_to_investigation(db_investigation)
        except Exception as e:
            await session.rollback()
            raise


async def get_all_investigations() -> List[Investigation]:
    """Get all investigations."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(InvestigationDB))
        db_investigations = result.scalars().all()
        return [db_to_investigation(inv) for inv in db_investigations]


async def get_investigation(investigation_id: str) -> Optional[Investigation]:
    """Get a specific investigation by ID."""
    async with AsyncSessionLocal() as session:
        db_investigation = await session.get(InvestigationDB, investigation_id)
        if db_investigation:
            return db_to_investigation(db_investigation)
        return None


async def update_investigation(investigation: Investigation) -> Investigation:
    """Update an existing investigation."""
    async with AsyncSessionLocal() as session:
        try:
            db_investigation = await session.get(InvestigationDB, investigation.investigation_id)
            if not db_investigation:
                raise ValueError(f"Investigation {investigation.investigation_id} not found")
            
            # Update fields
            updated_db = investigation_to_db(investigation)
            for key, value in updated_db.__dict__.items():
                if not key.startswith('_') and key != 'investigation_id':
                    setattr(db_investigation, key, value)
            
            db_investigation.updated_at = datetime.utcnow()
            await session.commit()
            await session.refresh(db_investigation)
            return db_to_investigation(db_investigation)
        except Exception as e:
            await session.rollback()
            raise


async def delete_investigation(investigation_id: str) -> bool:
    """Delete an investigation."""
    async with AsyncSessionLocal() as session:
        try:
            db_investigation = await session.get(InvestigationDB, investigation_id)
            if db_investigation:
                await session.delete(db_investigation)
                await session.commit()
                return True
            return False
        except Exception as e:
            await session.rollback()
            raise


async def get_listings_for_investigation(investigation_id: str) -> List[MarketplaceListing]:
    """Get all listings linked to a specific investigation."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(MarketplaceListingDB)
            .join(InvestigationListingDB, MarketplaceListingDB.id == InvestigationListingDB.listing_id)
            .where(InvestigationListingDB.investigation_id == investigation_id)
        )
        db_listings = result.scalars().all()
        return [db_to_marketplace_listing(l) for l in db_listings]


async def link_listing_to_investigation(
    investigation_id: str,
    listing_id: str,
    added_by: Optional[str] = None,
    source: Optional[str] = None,
    notes: Optional[str] = None,
    metadata: Optional[dict] = None
) -> InvestigationListing:
    """Create/update the join record linking an investigation to a listing."""
    async with AsyncSessionLocal() as session:
        try:
            # Check if link already exists
            result = await session.execute(
                select(InvestigationListingDB).where(
                    InvestigationListingDB.investigation_id == investigation_id,
                    InvestigationListingDB.listing_id == listing_id
                )
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                if added_by:
                    existing.added_by = added_by
                if source:
                    existing.source = source
                if metadata:
                    existing.meta_data = {**(existing.meta_data or {}), **metadata}
                existing.created_at = datetime.utcnow()
            else:
                db_link = InvestigationListingDB(
                    id=f"inv-list-{uuid.uuid4().hex[:12]}",
                    investigation_id=investigation_id,
                    listing_id=listing_id,
                    added_by=added_by,
                    source=source,
                    meta_data=metadata or {},
                )
                session.add(db_link)
            
            await session.commit()
            
            # Recalculate investigation counts
            await recalculate_investigation_counts(investigation_id)
            
            # Return InvestigationListing model
            return InvestigationListing(
                investigation_id=investigation_id,
                listing_id=listing_id,
                added_by=added_by,
                source=source,
                notes=notes,
                metadata=metadata or {},
            )
        except Exception as e:
            await session.rollback()
            raise


async def recalculate_investigation_counts(investigation_id: str) -> None:
    """Recalculate listings_found based on join records."""
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(func.count(InvestigationListingDB.id)).where(
                    InvestigationListingDB.investigation_id == investigation_id
                )
            )
            count = result.scalar() or 0
            
            db_investigation = await session.get(InvestigationDB, investigation_id)
            if db_investigation:
                db_investigation.listings_found = count
                db_investigation.listings_queued = count
                db_investigation.updated_at = datetime.utcnow()
                await session.commit()
        except Exception as e:
            await session.rollback()
            raise


# Agent config operations
async def get_agent_config() -> AgentConfig:
    """Get agent configuration."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(AgentConfigDB).where(AgentConfigDB.id == "default")
        )
        db_config = result.scalar_one_or_none()
        
        if db_config:
            return AgentConfig(**db_config.config_data)
        
        # Return default if not found
        return AgentConfig(
            id="default",
            llm_provider=LLMProvider.OPENAI,
            llm_model="gpt-4o",
            tools=[],
            skills=[],
        )


async def update_agent_config(updates: dict) -> AgentConfig:
    """Update agent configuration."""
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(AgentConfigDB).where(AgentConfigDB.id == "default")
            )
            db_config = result.scalar_one_or_none()
            
            if db_config:
                config_data = db_config.config_data
                config = AgentConfig(**config_data)
                
                # Apply updates
                for key, value in updates.items():
                    if hasattr(config, key) and value is not None:
                        setattr(config, key, value)
                
                config.updated_at = datetime.utcnow()
                db_config.config_data = config.model_dump(mode='json')
                db_config.updated_at = datetime.utcnow()
            else:
                # Create new config
                config = AgentConfig(id="default", **updates)
                db_config = AgentConfigDB(
                    id="default",
                    config_data=config.model_dump(mode='json'),
                )
                session.add(db_config)
            
            await session.commit()
            await session.refresh(db_config)
            return AgentConfig(**db_config.config_data)
        except Exception as e:
            await session.rollback()
            raise


# Task operations
async def create_task(task: SearchTask) -> SearchTask:
    """Create a new task."""
    async with AsyncSessionLocal() as session:
        try:
            db_task = SearchTaskDB(
                id=task.id,
                task_type=task.task_type,
                status=task.status,
                recall_id=task.recall_id,
                violation_id=task.recall_id,  # Support both
                marketplace_ids=task.marketplace_ids,
                search_query=task.search_query,
                result=task.result,
                error_message=task.error_message,
                progress=task.progress,
                items_processed=task.items_processed,
                items_total=task.items_total,
                created_at=task.created_at,
                started_at=task.started_at,
                completed_at=task.completed_at,
            )
            session.add(db_task)
            await session.commit()
            await session.refresh(db_task)
            
            # Convert back to Pydantic model
            return SearchTask(
                id=db_task.id,
                task_type=db_task.task_type,
                status=db_task.status,
                recall_id=db_task.recall_id,
                marketplace_ids=db_task.marketplace_ids or [],
                search_query=db_task.search_query,
                result=db_task.result,
                error_message=db_task.error_message,
                progress=db_task.progress,
                items_processed=db_task.items_processed,
                items_total=db_task.items_total,
                created_at=db_task.created_at,
                started_at=db_task.started_at,
                completed_at=db_task.completed_at,
            )
        except Exception as e:
            await session.rollback()
            raise


async def get_task(task_id: str) -> Optional[SearchTask]:
    """Get a task by ID."""
    async with AsyncSessionLocal() as session:
        db_task = await session.get(SearchTaskDB, task_id)
        if db_task:
            return SearchTask(
                id=db_task.id,
                task_type=db_task.task_type,
                status=db_task.status,
                recall_id=db_task.recall_id,
                marketplace_ids=db_task.marketplace_ids or [],
                search_query=db_task.search_query,
                result=db_task.result,
                error_message=db_task.error_message,
                progress=db_task.progress,
                items_processed=db_task.items_processed,
                items_total=db_task.items_total,
                created_at=db_task.created_at,
                started_at=db_task.started_at,
                completed_at=db_task.completed_at,
            )
        return None


async def get_pending_tasks() -> List[SearchTask]:
    """Get all pending tasks."""
    from app.models.agent import TaskStatus
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SearchTaskDB).where(SearchTaskDB.status == TaskStatus.PENDING)
        )
        db_tasks = result.scalars().all()
        return [
            SearchTask(
                id=t.id,
                task_type=t.task_type,
                status=t.status,
                recall_id=t.recall_id,
                marketplace_ids=t.marketplace_ids or [],
                search_query=t.search_query,
                result=t.result,
                error_message=t.error_message,
                progress=t.progress,
                items_processed=t.items_processed,
                items_total=t.items_total,
                created_at=t.created_at,
                started_at=t.started_at,
                completed_at=t.completed_at,
            )
            for t in db_tasks
        ]


# Import history operations
async def save_import_history(history: ImportHistory) -> ImportHistory:
    """Save or update import history record."""
    async with AsyncSessionLocal() as session:
        try:
            # Check if record exists
            result = await session.execute(
                select(ImportHistoryDB).where(ImportHistoryDB.import_id == history.import_id)
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                # Update existing record
                db_history = import_history_to_db(history)
                # Update all fields
                for key, value in db_history.__dict__.items():
                    if not key.startswith('_') and key != 'import_id':  # Don't update import_id
                        setattr(existing, key, value)
                await session.commit()
                await session.refresh(existing)
                return db_to_import_history(existing)
            else:
                # Insert new record
                db_history = import_history_to_db(history)
                session.add(db_history)
                await session.commit()
                await session.refresh(db_history)
                return db_to_import_history(db_history)
        except Exception as e:
            await session.rollback()
            raise


async def get_import_history(
    import_type: Optional[str] = None,
    source: Optional[ImportSource] = None,
    limit: int = 50,
    offset: int = 0
) -> List[ImportHistory]:
    """Get import history with optional filtering."""
    async with AsyncSessionLocal() as session:
        query = select(ImportHistoryDB)
    
    if import_type:
        query = query.where(ImportHistoryDB.import_type == import_type)
    if source:
        query = query.where(ImportHistoryDB.source == source)
    
    query = query.order_by(ImportHistoryDB.created_at.desc()).limit(limit).offset(offset)
    
    result = await session.execute(query)
    db_histories = result.scalars().all()
    return [db_to_import_history(h) for h in db_histories]


async def get_import_history_item(import_id: str) -> Optional[ImportHistory]:
    """Get a specific import history item by import_id."""
    async with AsyncSessionLocal() as session:
        db_history = await session.get(ImportHistoryDB, import_id)
        if not db_history:
            return None
        return db_to_import_history(db_history)


# Backward compatibility - Recall operations (map to violations)
async def get_all_recalls() -> List[Recall]:
    """Get all recalls (backward compatibility - returns violations)."""
    violations = await get_all_violations()
    # Convert violations to recalls for backward compatibility
    from app.models.recall import Recall
    recalls = []
    for v in violations:
        # Simple conversion - in practice, product bans and recalls are the same
        recall = Recall(
            recall_id=v.product_ban_id,
            recall_number=v.ban_number,
            title=v.title,
            description=v.description or "",
            recall_date=v.ban_date,
            units_sold=v.units_affected,
            injuries=v.injuries,
            deaths=v.deaths,
            incidents=v.incidents,
            products=[RecallProduct(**p.model_dump()) for p in v.products],
            images=[RecallImage(**i.model_dump()) for i in v.images],
            hazards=[RecallHazard(**h.model_dump()) for h in v.hazards],
            remedies=[RecallRemedy(**r.model_dump()) for r in v.remedies],
            source=v.agency_name,
            source_url=v.url,
            risk_level=v.risk_level,
            risk_score=v.risk_score,
        )
        recalls.append(recall)
    return recalls


async def get_recall(recall_id: str) -> Optional[Recall]:
    """Get a specific recall (backward compatibility)."""
    violation = await get_violation(recall_id)
    if not violation:
        return None
    
    from app.models.recall import Recall, RecallProduct, RecallImage, RecallHazard, RecallRemedy
    return Recall(
        recall_id=violation.violation_id,
        recall_number=violation.violation_number,
        title=violation.title,
        description=violation.description or "",
        recall_date=violation.violation_date,
        units_sold=violation.units_affected,
        injuries=violation.injuries,
        deaths=violation.deaths,
        incidents=violation.incidents,
        products=[RecallProduct(**p.model_dump()) for p in violation.products],
        images=[RecallImage(**i.model_dump()) for i in violation.images],
        hazards=[RecallHazard(**h.model_dump()) for h in violation.hazards],
        remedies=[RecallRemedy(**r.model_dump()) for r in violation.remedies],
        source=violation.agency_name,
        source_url=violation.url,
        risk_level=violation.risk_level,
        risk_score=violation.risk_score,
    )


async def search_recalls(query: str, risk_level: Optional[RiskLevel] = None) -> List[Recall]:
    """Search recalls (backward compatibility)."""
    violations = await search_violations(query, risk_level=risk_level)
    # Convert to recalls
    from app.models.recall import Recall, RecallProduct, RecallImage, RecallHazard, RecallRemedy
    recalls = []
    for v in violations:
        recall = Recall(
            recall_id=v.violation_id,
            recall_number=v.violation_number,
            title=v.title,
            description=v.description or "",
            recall_date=v.violation_date,
            units_sold=v.units_affected,
            injuries=v.injuries,
            deaths=v.deaths,
            incidents=v.incidents,
            products=[RecallProduct(**p.model_dump()) for p in v.products],
            images=[RecallImage(**i.model_dump()) for i in v.images],
            hazards=[RecallHazard(**h.model_dump()) for h in v.hazards],
            remedies=[RecallRemedy(**r.model_dump()) for r in v.remedies],
            source=v.agency_name,
            source_url=v.url,
            risk_level=v.risk_level,
            risk_score=v.risk_score,
        )
        recalls.append(recall)
    return recalls


async def add_recall(recall: Recall) -> Recall:
    """Add a new recall (backward compatibility)."""
    # Convert recall to product ban
    product_ban = ProductBan(
        product_ban_id=recall.recall_id,
        ban_number=recall.recall_number,
        title=recall.title,
        url=recall.source_url or "",
        agency_name=recall.source or "",
        description=recall.description,
        ban_date=recall.recall_date,
        units_affected=recall.units_sold,
        injuries=recall.injuries,
        deaths=recall.deaths,
        incidents=recall.incidents,
        products=[ProductBanProduct(**p.model_dump()) for p in recall.products],
        images=[ProductBanImage(**i.model_dump()) for i in recall.images],
        hazards=[ProductBanHazard(**h.model_dump()) for h in recall.hazards],
        remedies=[ProductBanRemedy(**r.model_dump()) for r in recall.remedies],
        risk_level=recall.risk_level,
        risk_score=recall.risk_score,
    )
    
    product_ban = await add_violation(product_ban)
    
    # Convert back to recall
    from app.models.recall import Recall, RecallProduct, RecallImage, RecallHazard, RecallRemedy
    return Recall(
        recall_id=product_ban.product_ban_id,
        recall_number=product_ban.ban_number,
        title=product_ban.title,
        description=product_ban.description or "",
        recall_date=product_ban.ban_date,
        units_sold=product_ban.units_affected,
        injuries=product_ban.injuries,
        deaths=product_ban.deaths,
        incidents=product_ban.incidents,
        products=[RecallProduct(**p.model_dump()) for p in product_ban.products],
        images=[RecallImage(**i.model_dump()) for i in product_ban.images],
        hazards=[RecallHazard(**h.model_dump()) for h in product_ban.hazards],
        remedies=[RecallRemedy(**r.model_dump()) for r in product_ban.remedies],
        source=product_ban.agency_name,
        source_url=product_ban.url,
        risk_level=product_ban.risk_level,
        risk_score=product_ban.risk_score,
    )


async def get_recalls_by_risk(risk_level: RiskLevel) -> List[Recall]:
    """Get recalls filtered by risk level (backward compatibility)."""
    violations = await get_violations_by_risk(risk_level)
    # Convert to recalls
    from app.models.recall import Recall, RecallProduct, RecallImage, RecallHazard, RecallRemedy
    recalls = []
    for v in violations:
        recall = Recall(
            recall_id=v.product_ban_id,
            recall_number=v.ban_number,
            title=v.title,
            description=v.description or "",
            recall_date=v.ban_date,
            units_sold=v.units_affected,
            injuries=v.injuries,
            deaths=v.deaths,
            incidents=v.incidents,
            products=[RecallProduct(**p.model_dump()) for p in v.products],
            images=[RecallImage(**i.model_dump()) for i in v.images],
            hazards=[RecallHazard(**h.model_dump()) for h in v.hazards],
            remedies=[RecallRemedy(**r.model_dump()) for r in v.remedies],
            source=v.agency_name,
            source_url=v.url,
            risk_level=v.risk_level,
            risk_score=v.risk_score,
        )
        recalls.append(recall)
    return recalls


async def get_recalls_risk_summary() -> Dict[str, int]:
    """Get count of recalls by risk level (backward compatibility)."""
    return await get_violations_risk_summary()


# Load from JSON functions (for initial data migration)
async def load_violations_from_json():
    """Load violations from JSON file (for migration)."""
    json_path = Path(__file__).parent.parent.parent.parent / "recalls.json"
    
    if not json_path.exists():
        print(f"recalls.json not found at {json_path}")
        return
    
    try:
        with open(json_path, 'r') as f:
            data = json.load(f)
        
        violations_data = data if isinstance(data, list) else data.get('recalls', [])
        
        for i, item in enumerate(violations_data[:100]):  # Limit to 100
            violation = parse_cpsc_to_violation(item, index=i)
            if violation:
                violation = await classify_violation(violation)
                await add_violation(violation)
        
        print(f"Loaded violations from JSON")
        
    except Exception as e:
        print(f"Error loading violations from JSON: {e}")


async def load_recalls_from_json():
    """Load recalls from JSON file (backward compatibility)."""
    await load_violations_from_json()


def parse_cpsc_to_violation(data: dict, index: int = 0) -> Optional[ProductBan]:
    """Convert CPSC recall data to a ProductBan."""
    try:
        recall_number = data.get('RecallNumber', data.get('recallNumber', f'RECALL-{index}'))
        product_ban_id = f"cpsc-{recall_number}"
        
        # Parse products
        products = []
        products_data = data.get('Products', data.get('products', []))
        if isinstance(products_data, list):
            for p in products_data:
                if isinstance(p, dict):
                    products.append(ProductBanProduct(
                        name=p.get('Name', p.get('name', 'Unknown Product')),
                        description=p.get('Description', p.get('description', '')),
                        model_number=p.get('ModelNumber', p.get('model', '')),
                        manufacturer=p.get('Manufacturer', p.get('manufacturer', '')),
                        identifiers={"UPC": p.get('UPC', '')} if p.get('UPC') else {}
                    ))
        
        # Parse images
        images = []
        images_data = data.get('Images', data.get('images', []))
        if isinstance(images_data, list):
            for img in images_data:
                if isinstance(img, dict):
                    url = img.get('URL', img.get('url', ''))
                    if url:
                        images.append(ProductBanImage(url=url))
                elif isinstance(img, str):
                    images.append(ProductBanImage(url=img))
        
        # Parse hazards
        hazards = []
        hazard_data = data.get('Hazards', data.get('hazards', []))
        if isinstance(hazard_data, list):
            for h in hazard_data:
                if isinstance(h, dict):
                    hazards.append(ProductBanHazard(
                        description=h.get('Name', h.get('description', '')),
                        hazard_type=h.get('HazardType', '')
                    ))
                elif isinstance(h, str):
                    hazards.append(ProductBanHazard(description=h))
        
        # Parse remedies
        remedies = []
        remedy_data = data.get('Remedies', data.get('remedies', []))
        if isinstance(remedy_data, list):
            for r in remedy_data:
                if isinstance(r, dict):
                    remedies.append(ProductBanRemedy(
                        description=r.get('Name', r.get('description', '')),
                        remedy_type=r.get('RemedyType', '')
                    ))
        
        # Parse date
        date_str = data.get('RecallDate', data.get('recallDate', ''))
        ban_date = datetime.now()
        if date_str:
            try:
                ban_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            except:
                try:
                    from dateutil import parser
                    ban_date = parser.parse(date_str)
                except:
                    pass
        
        # Parse numbers
        def safe_int(val, default=0):
            if val is None:
                return default
            try:
                return int(str(val).replace(',', ''))
            except:
                return default
        
        # Get title
        title = data.get('Title', data.get('title', ''))
        if not title and products:
            title = f"Recall: {products[0].name}"
        if not title:
            title = f"Recall {recall_number}"
        
        url = data.get('URL', data.get('url', ''))
        if not url:
            url = f"https://www.cpsc.gov/Recalls/{recall_number}"
        
        return ProductBan(
            product_ban_id=product_ban_id,
            ban_number=recall_number,
            title=title,
            description=data.get('Description', data.get('description', '')),
            ban_date=ban_date,
            units_affected=safe_int(data.get('NumberOfUnits', data.get('unitsAffected'))),
            injuries=safe_int(data.get('Injuries', data.get('injuries'))),
            deaths=safe_int(data.get('Deaths', data.get('deaths'))),
            incidents=safe_int(data.get('Incidents', data.get('incidents'))),
            products=products,
            images=images,
            hazards=hazards,
            remedies=remedies,
            agency_name="Consumer Product Safety Commission",
            agency_acronym="CPSC",
            url=url,
            ban_type=BanType.RECALL,
        )
        
    except Exception as e:
        print(f"Error parsing violation: {e}")
        return None


# Organization service functions
async def ensure_default_organization(session: AsyncSession):
    """Ensure a default organization exists for local development."""
    try:
        # Check if any organization exists
        result = await session.execute(select(OrganizationDB).limit(1))
        existing = result.scalar_one_or_none()
        
        if not existing:
            # Create a default development organization
            org_id = f"{OrganizationType.REGULATORY_AGENCY.value}-dev-{uuid.uuid4().hex[:8]}"
            default_org = Organization(
                organization_id=org_id,
                organization_type=OrganizationType.REGULATORY_AGENCY,
                name="Development Organization",
                legal_name="Development Organization",
                acronym="DEV",
                contact_email="dev@localhost",
                contact_name="Development Team",
                country="US",
                status=OrganizationStatus.ACTIVE,
                verified=True,
                import_methods=["file_upload", "api"],
                violations_count=0,
                voluntary_recalls_count=0,
                joint_recalls_count=0,
            )
            db_org = organization_to_db(default_org)
            session.add(db_org)
            await session.commit()
            print(f"Default development organization created: {org_id}")
        else:
            print(f"Organization already exists: {existing.organization_id}")
    except Exception as e:
        print(f"Error ensuring default organization: {e}")
        # Don't raise - this is optional initialization


async def get_organizations(
    organization_type: Optional[OrganizationType] = None,
    status: Optional[OrganizationStatus] = None,
    country: Optional[str] = None,
    limit: Optional[int] = None,
    offset: int = 0
) -> List[Organization]:
    """Get all organizations with optional filtering."""
    async with AsyncSessionLocal() as session:
        query = select(OrganizationDB)
        
        if organization_type:
            query = query.where(OrganizationDB.organization_type == organization_type)
        if status:
            query = query.where(OrganizationDB.status == status)
        if country:
            query = query.where(OrganizationDB.country == country)
        
        query = query.order_by(OrganizationDB.name)
        
        if limit:
            query = query.limit(limit).offset(offset)
        
        result = await session.execute(query)
        db_orgs = result.scalars().all()
        return [db_to_organization(db_org) for db_org in db_orgs]


async def get_organization(organization_id: str) -> Optional[Organization]:
    """Get a specific organization by ID."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(OrganizationDB).where(OrganizationDB.organization_id == organization_id)
        )
        db_org = result.scalar_one_or_none()
        if not db_org:
            return None
        return db_to_organization(db_org)


async def create_organization(organization: OrganizationCreate) -> Organization:
    """Create a new organization."""
    async with AsyncSessionLocal() as session:
        # Generate organization_id
        org_id = f"{organization.organization_type.value}-{uuid.uuid4().hex[:12]}"
        
        # Create Organization from OrganizationCreate
        org = Organization(
            organization_id=org_id,
            organization_type=organization.organization_type,
            name=organization.name,
            legal_name=organization.legal_name,
            acronym=organization.acronym,
            industry=organization.industry,
            business_type=organization.business_type,
            brands=organization.brands or [],
            contact_email=organization.contact_email,
            contact_name=organization.contact_name,
            contact_phone=organization.contact_phone,
            website=organization.website,
            country=organization.country,
            region=organization.region,
            address=organization.address,
            city=organization.city,
            state_province=organization.state_province,
            postal_code=organization.postal_code,
            status=OrganizationStatus.PENDING,
            verified=False,
            import_methods=organization.import_methods or [],
            api_endpoint=organization.api_endpoint,
            api_method=organization.api_method,
            api_auth_type=organization.api_auth_type,
            api_key=organization.api_key,
            api_headers=organization.api_headers or {},
            api_enabled='api' in (organization.import_methods or []),
            file_upload_method=organization.file_upload_method,
            blob_storage_provider=organization.blob_storage_provider,
            blob_storage_container=organization.blob_storage_container,
            blob_storage_path=organization.blob_storage_path,
            blob_storage_region=organization.blob_storage_region,
            blob_storage_endpoint=organization.blob_storage_endpoint,
            blob_storage_access_key=organization.blob_storage_access_key,
            blob_storage_secret_key=organization.blob_storage_secret_key,
            email_import_enabled='email' in (organization.import_methods or []),
            email_import_address=organization.email_import_address,
            metadata_schema=organization.metadata_schema,
            violations_count=0,
            last_violation_date=None,
            voluntary_recalls_count=0,
            joint_recalls_count=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            verified_at=None,
        )
        
        db_org = organization_to_db(org)
        session.add(db_org)
        await session.commit()
        await session.refresh(db_org)
        
        return db_to_organization(db_org)


async def update_organization(organization_id: str, updates: OrganizationUpdate) -> Optional[Organization]:
    """Update an organization."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(OrganizationDB).where(OrganizationDB.organization_id == organization_id)
        )
        db_org = result.scalar_one_or_none()
        if not db_org:
            return None
        
        # Update fields from OrganizationUpdate
        update_dict = updates.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            if hasattr(db_org, key):
                setattr(db_org, key, value)
        
        db_org.updated_at = datetime.utcnow()
        
        await session.commit()
        await session.refresh(db_org)
        
        return db_to_organization(db_org)


async def delete_organization(organization_id: str) -> bool:
    """Soft delete an organization (set status to inactive)."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(OrganizationDB).where(OrganizationDB.organization_id == organization_id)
        )
        db_org = result.scalar_one_or_none()
        if not db_org:
            return False
        
        db_org.status = OrganizationStatus.INACTIVE
        db_org.updated_at = datetime.utcnow()
        
        await session.commit()
        return True


async def get_current_user_organization() -> Optional[Organization]:
    """Get the current user's organization (placeholder - needs auth integration)."""
    # TODO: Get from auth context/session
    # For now, return the first/most recent organization (single-tenant mode)
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(OrganizationDB).order_by(OrganizationDB.created_at.desc()).limit(1)
            )
            db_org = result.scalar_one_or_none()
            if db_org:
                return db_to_organization(db_org)
            return None
    except Exception as e:
        import traceback
        print(f"[ERROR] get_current_user_organization failed: {e}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        raise

