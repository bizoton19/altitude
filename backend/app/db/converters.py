"""
Conversion utilities between Pydantic models and SQLAlchemy ORM models.
"""

from typing import List, Optional
from datetime import datetime
import uuid

from app.models.violation import (
    ProductViolation, ViolationProduct, ViolationHazard,
    ViolationRemedy, ViolationImage, ViolationCreate
)
from app.models.marketplace import Marketplace, MarketplaceListing
from app.models.investigation import Investigation, InvestigationCreate
from app.models.import_models import ImportHistory
from app.models.agent import AgentConfig, SearchTask
from app.models.organization import Organization

from app.db.models import (
    ViolationDB, ViolationProductDB, ViolationHazardDB,
    ViolationRemedyDB, ViolationImageDB,
    MarketplaceDB, MarketplaceListingDB,
    InvestigationDB, InvestigationListingDB,
    ImportHistoryDB, AgentConfigDB, SearchTaskDB,
    OrganizationDB
)


# Violation conversions
def violation_to_db(violation: ProductViolation) -> ViolationDB:
    """Convert Pydantic ProductViolation to SQLAlchemy ViolationDB."""
    return ViolationDB(
        violation_id=violation.violation_id,
        violation_number=violation.violation_number,
        title=violation.title,
        url=violation.url,
        # Organization fields
        organization_name=violation.organization_name,
        organization_id=violation.organization_id,
        organization_type=violation.organization_type,
        # Legacy agency fields
        agency_name=violation.agency_name,
        agency_acronym=violation.agency_acronym,
        agency_id=violation.agency_id,
        # Joint recall fields
        joint_organization_name=violation.joint_organization_name,
        joint_organization_id=violation.joint_organization_id,
        is_voluntary_recall=getattr(violation, 'is_voluntary_recall', False),
        is_joint_recall=getattr(violation, 'is_joint_recall', False),
        description=violation.description,
        violation_date=violation.violation_date,
        violation_type=violation.violation_type,
        country=violation.country,
        region=violation.region,
        risk_level=violation.risk_level,
        risk_score=violation.risk_score,
        units_affected=violation.units_affected,
        injuries=violation.injuries,
        deaths=violation.deaths,
        incidents=violation.incidents,
        illnesses=violation.illnesses,
        source_reference=violation.source_reference,
        source_language=violation.source_language,
        agency_metadata=violation.agency_metadata,
        created_at=violation.created_at,
        updated_at=violation.updated_at,
    )


def db_to_violation(db_violation: ViolationDB) -> ProductViolation:
    """Convert SQLAlchemy ViolationDB to Pydantic ProductViolation."""
    return ProductViolation(
        violation_id=db_violation.violation_id,
        violation_number=db_violation.violation_number,
        title=db_violation.title,
        url=db_violation.url,
        # Organization fields
        organization_name=db_violation.organization_name,
        organization_id=db_violation.organization_id,
        organization_type=db_violation.organization_type,
        # Legacy agency fields
        agency_name=db_violation.agency_name,
        agency_acronym=db_violation.agency_acronym,
        agency_id=db_violation.agency_id,
        # Joint recall fields
        joint_organization_name=db_violation.joint_organization_name,
        joint_organization_id=db_violation.joint_organization_id,
        is_voluntary_recall=getattr(db_violation, 'is_voluntary_recall', False),
        is_joint_recall=getattr(db_violation, 'is_joint_recall', False),
        description=db_violation.description,
        violation_date=db_violation.violation_date,
        violation_type=db_violation.violation_type,
        country=db_violation.country,
        region=db_violation.region,
        risk_level=db_violation.risk_level,
        risk_score=db_violation.risk_score,
        units_affected=db_violation.units_affected,
        injuries=db_violation.injuries,
        deaths=db_violation.deaths,
        incidents=db_violation.incidents,
        illnesses=db_violation.illnesses,
        products=[db_to_violation_product(p) for p in db_violation.products],
        hazards=[db_to_violation_hazard(h) for h in db_violation.hazards],
        remedies=[db_to_violation_remedy(r) for r in db_violation.remedies],
        images=[db_to_violation_image(i) for i in db_violation.images],
        source_reference=db_violation.source_reference,
        source_language=db_violation.source_language,
        agency_metadata=db_violation.agency_metadata or {},
        created_at=db_violation.created_at,
        updated_at=db_violation.updated_at,
    )


def violation_product_to_db(product: ViolationProduct, violation_id: str) -> ViolationProductDB:
    """Convert ViolationProduct to ViolationProductDB."""
    return ViolationProductDB(
        id=f"prod-{uuid.uuid4().hex[:12]}",
        violation_id=violation_id,
        name=product.name,
        description=product.description,
        model_number=product.model_number,
        serial_number=product.serial_number,
        manufacturer=product.manufacturer,
        brand=product.brand,
        distributor=product.distributor,
        importer=product.importer,
        identifiers=product.identifiers,
        product_metadata=product.product_metadata,
    )


def db_to_violation_product(db_product: ViolationProductDB) -> ViolationProduct:
    """Convert ViolationProductDB to ViolationProduct."""
    return ViolationProduct(
        name=db_product.name,
        description=db_product.description,
        model_number=db_product.model_number,
        serial_number=db_product.serial_number,
        manufacturer=db_product.manufacturer,
        brand=db_product.brand,
        distributor=db_product.distributor,
        importer=db_product.importer,
        identifiers=db_product.identifiers or {},
        product_metadata=db_product.product_metadata or {},
    )


def violation_hazard_to_db(hazard: ViolationHazard, violation_id: str) -> ViolationHazardDB:
    """Convert ViolationHazard to ViolationHazardDB."""
    return ViolationHazardDB(
        id=f"haz-{uuid.uuid4().hex[:12]}",
        violation_id=violation_id,
        description=hazard.description,
        hazard_type=hazard.hazard_type,
        severity=hazard.severity,
    )


def db_to_violation_hazard(db_hazard: ViolationHazardDB) -> ViolationHazard:
    """Convert ViolationHazardDB to ViolationHazard."""
    return ViolationHazard(
        description=db_hazard.description,
        hazard_type=db_hazard.hazard_type,
        severity=db_hazard.severity,
    )


def violation_remedy_to_db(remedy: ViolationRemedy, violation_id: str) -> ViolationRemedyDB:
    """Convert ViolationRemedy to ViolationRemedyDB."""
    return ViolationRemedyDB(
        id=f"rem-{uuid.uuid4().hex[:12]}",
        violation_id=violation_id,
        description=remedy.description,
        remedy_type=remedy.remedy_type,
        action_required=remedy.action_required,
    )


def db_to_violation_remedy(db_remedy: ViolationRemedyDB) -> ViolationRemedy:
    """Convert ViolationRemedyDB to ViolationRemedy."""
    return ViolationRemedy(
        description=db_remedy.description,
        remedy_type=db_remedy.remedy_type,
        action_required=db_remedy.action_required,
    )


def violation_image_to_db(image: ViolationImage, violation_id: str) -> ViolationImageDB:
    """Convert ViolationImage to ViolationImageDB."""
    return ViolationImageDB(
        id=f"img-{uuid.uuid4().hex[:12]}",
        violation_id=violation_id,
        url=image.url,
        caption=image.caption,
        alt_text=image.alt_text,
    )


def db_to_violation_image(db_image: ViolationImageDB) -> ViolationImage:
    """Convert ViolationImageDB to ViolationImage."""
    return ViolationImage(
        url=db_image.url,
        caption=db_image.caption,
        alt_text=db_image.alt_text,
    )


# Marketplace conversions
def marketplace_to_db(marketplace: Marketplace) -> MarketplaceDB:
    """Convert Marketplace to MarketplaceDB."""
    return MarketplaceDB(
        id=marketplace.id,
        name=marketplace.name,
        url=marketplace.url,
        enabled=marketplace.enabled,
        status=marketplace.status,
        supports_regions=marketplace.supports_regions,
        regions=[r.model_dump() for r in marketplace.regions] if marketplace.regions else [],
        search_url_template=marketplace.search_url_template,
        api_config={
            "requires_api_key": marketplace.requires_api_key,
            "api_key": marketplace.api_key,  # Note: In production, encrypt this
            "rate_limit_per_minute": marketplace.rate_limit_per_minute,
        },
        priority=getattr(marketplace, 'priority', 50),
        monitoring_frequency=marketplace.monitoring_frequency.value if marketplace.monitoring_frequency else None,
        last_searched=marketplace.last_search_at,
        search_count=marketplace.total_searches,
        meta_data=marketplace.metadata if hasattr(marketplace, 'metadata') else (getattr(marketplace, 'meta_data', None) or {}),
        created_at=marketplace.created_at,
        updated_at=marketplace.updated_at,
    )


def db_to_marketplace(db_marketplace: MarketplaceDB) -> Marketplace:
    """Convert MarketplaceDB to Marketplace."""
    from app.models.marketplace import MarketplaceRegion, MonitoringFrequency
    
    api_config = db_marketplace.api_config or {}
    regions_data = db_marketplace.regions or []
    
    # Safely convert monitoring_frequency
    monitoring_freq = MonitoringFrequency.DAILY  # Default
    if db_marketplace.monitoring_frequency:
        try:
            # Try to convert string to enum
            if isinstance(db_marketplace.monitoring_frequency, str):
                monitoring_freq = MonitoringFrequency(db_marketplace.monitoring_frequency.lower())
            else:
                monitoring_freq = db_marketplace.monitoring_frequency
        except (ValueError, AttributeError):
            # If conversion fails, use default
            monitoring_freq = MonitoringFrequency.DAILY
    
    return Marketplace(
        id=db_marketplace.id,
        name=db_marketplace.name,
        url=db_marketplace.url,
        enabled=db_marketplace.enabled,
        status=db_marketplace.status,
        supports_regions=db_marketplace.supports_regions,
        regions=[MarketplaceRegion(**r) for r in regions_data],
        search_url_template=db_marketplace.search_url_template,
        requires_api_key=api_config.get("requires_api_key", False),
        api_key=api_config.get("api_key"),
        rate_limit_per_minute=api_config.get("rate_limit_per_minute", 10),
        monitoring_frequency=monitoring_freq,
        last_search_at=db_marketplace.last_searched,
        total_searches=db_marketplace.search_count,
        metadata=db_marketplace.meta_data or {},
        created_at=db_marketplace.created_at,
        updated_at=db_marketplace.updated_at,
    )


def marketplace_listing_to_db(listing: MarketplaceListing) -> MarketplaceListingDB:
    """Convert MarketplaceListing to MarketplaceListingDB."""
    return MarketplaceListingDB(
        id=listing.id,
        marketplace_id=listing.marketplace_id,
        violation_id=listing.violation_id or listing.recall_id,  # Support both
        title=listing.title,
        description=listing.description,
        listing_url=listing.listing_url,
        image_url=listing.image_url,
        price=listing.price,
        currency=listing.currency,
        match_score=listing.match_score,
        match_reasons=listing.match_reasons,
        seller_name=listing.seller_name,
        seller_location=getattr(listing, 'seller_location', None),
        status="active" if not getattr(listing, 'is_flagged', False) else "flagged",
        found_at=listing.found_at,
        last_checked=getattr(listing, 'last_checked', None),
        meta_data={
            "region_id": getattr(listing, 'region_id', None),
            "region_name": getattr(listing, 'region_name', None),
            "seller_rating": getattr(listing, 'seller_rating', None),
            "is_verified": getattr(listing, 'is_verified', False),
        },
    )


def db_to_marketplace_listing(db_listing: MarketplaceListingDB) -> MarketplaceListing:
    """Convert MarketplaceListingDB to MarketplaceListing."""
    metadata = db_listing.meta_data or {}
    
    return MarketplaceListing(
        id=db_listing.id,
        marketplace_id=db_listing.marketplace_id or "",
        marketplace_name=db_listing.marketplace.name if db_listing.marketplace else "Unknown",
        region_id=metadata.get("region_id"),
        region_name=metadata.get("region_name"),
        title=db_listing.title,
        description=db_listing.description,
        listing_url=db_listing.listing_url,
        image_url=db_listing.image_url,
        price=db_listing.price,
        currency=db_listing.currency,
        recall_id=db_listing.violation_id or "",  # Backward compatibility
        violation_id=db_listing.violation_id,
        match_score=db_listing.match_score,
        match_reasons=db_listing.match_reasons or [],
        seller_name=db_listing.seller_name,
        seller_rating=metadata.get("seller_rating"),
        is_verified=metadata.get("is_verified", False),
        is_flagged=db_listing.status == "flagged",
        found_at=db_listing.found_at,
        listing_date=db_listing.last_checked,
    )


# Investigation conversions
def investigation_to_db(investigation: Investigation) -> InvestigationDB:
    """Convert Investigation to InvestigationDB."""
    return InvestigationDB(
        investigation_id=investigation.investigation_id,
        name=investigation.name,
        description=investigation.description,
        schedule=investigation.schedule,
        scheduled_start_time=investigation.scheduled_start_time,
        start_time=investigation.start_time,
        end_time=investigation.end_time,
        violation_ids=investigation.violation_ids,
        marketplace_ids=investigation.marketplace_ids,
        region_ids=investigation.region_ids or {},
        agent_id=investigation.agent_id,
        status=investigation.status,
        listings_found=investigation.listings_found,
        listings_queued=investigation.listings_queued,
        assigned_reviewer_ids=investigation.assigned_reviewer_ids,
        created_at=investigation.created_at,
        updated_at=investigation.updated_at,
        created_by=investigation.created_by,
        # New fields for agent-driven investigations
        agent_instructions=getattr(investigation, 'agent_instructions', None),
        execution_strategy=getattr(investigation, 'execution_strategy', 'hybrid'),
        priority_order=getattr(investigation, 'priority_order', ['HIGH', 'MEDIUM', 'LOW']),
        autonomous=getattr(investigation, 'autonomous', True),
        execution_metadata=getattr(investigation, 'execution_metadata', {}),
    )


def db_to_investigation(db_investigation: InvestigationDB) -> Investigation:
    """Convert InvestigationDB to Investigation."""
    return Investigation(
        investigation_id=db_investigation.investigation_id,
        name=db_investigation.name,
        description=db_investigation.description,
        schedule=db_investigation.schedule,
        scheduled_start_time=db_investigation.scheduled_start_time,
        start_time=db_investigation.start_time,
        end_time=db_investigation.end_time,
        violation_ids=db_investigation.violation_ids or [],
        marketplace_ids=db_investigation.marketplace_ids or [],
        region_ids=db_investigation.region_ids or {},
        agent_id=db_investigation.agent_id,
        status=db_investigation.status,
        listings_found=db_investigation.listings_found,
        listings_queued=db_investigation.listings_queued,
        assigned_reviewer_ids=db_investigation.assigned_reviewer_ids or [],
        created_at=db_investigation.created_at,
        updated_at=db_investigation.updated_at,
        created_by=db_investigation.created_by,
    )


# Import history conversions
def import_history_to_db(history: ImportHistory) -> ImportHistoryDB:
    """Convert ImportHistory to ImportHistoryDB."""
    return ImportHistoryDB(
        import_id=history.import_id,
        import_type=history.import_type,
        source=history.source,
        source_name=history.source_name,
        status=history.status,
        total_items=history.total_items,
        successful=history.successful,
        failed=history.failed,
        skipped=getattr(history, 'skipped', 0),
        items_processed=getattr(history, 'items_processed', 0),
        progress=getattr(history, 'progress', 0.0),
        created_by=history.created_by,
        created_at=history.created_at,
        completed_at=history.completed_at,
        error_summary=getattr(history, 'error_summary', None),
        meta_data=getattr(history, 'metadata', getattr(history, 'meta_data', {})),
    )


def organization_to_db(organization: Organization) -> OrganizationDB:
    """Convert Organization to OrganizationDB."""
    return OrganizationDB(
        organization_id=organization.organization_id,
        organization_type=organization.organization_type,
        name=organization.name,
        legal_name=organization.legal_name,
        acronym=organization.acronym,
        industry=organization.industry,
        business_type=organization.business_type,
        brands=organization.brands,
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
        status=organization.status,
        verified=organization.verified,
        import_methods=organization.import_methods,
        api_endpoint=organization.api_endpoint,
        api_method=organization.api_method,
        api_auth_type=organization.api_auth_type,
        api_key=organization.api_key,
        api_headers=organization.api_headers,
        api_enabled=organization.api_enabled,
        file_upload_method=organization.file_upload_method,
        blob_storage_provider=organization.blob_storage_provider,
        blob_storage_container=organization.blob_storage_container,
        blob_storage_path=organization.blob_storage_path,
        blob_storage_region=organization.blob_storage_region,
        blob_storage_endpoint=organization.blob_storage_endpoint,
        blob_storage_access_key=organization.blob_storage_access_key,
        blob_storage_secret_key=organization.blob_storage_secret_key,
        email_import_enabled=organization.email_import_enabled,
        email_import_address=organization.email_import_address,
        metadata_schema=organization.metadata_schema,
        violations_count=organization.violations_count,
        last_violation_date=organization.last_violation_date,
        voluntary_recalls_count=organization.voluntary_recalls_count,
        joint_recalls_count=organization.joint_recalls_count,
        created_at=organization.created_at,
        updated_at=organization.updated_at,
        verified_at=organization.verified_at,
    )


def db_to_organization(db_org: OrganizationDB) -> Organization:
    """Convert OrganizationDB to Organization."""
    return Organization(
        organization_id=db_org.organization_id,
        organization_type=db_org.organization_type,
        name=db_org.name,
        legal_name=db_org.legal_name,
        acronym=db_org.acronym,
        industry=db_org.industry,
        business_type=db_org.business_type,
        brands=db_org.brands or [],
        contact_email=db_org.contact_email,
        contact_name=db_org.contact_name,
        contact_phone=db_org.contact_phone,
        website=db_org.website,
        country=db_org.country,
        region=db_org.region,
        address=db_org.address,
        city=db_org.city,
        state_province=db_org.state_province,
        postal_code=db_org.postal_code,
        status=db_org.status,
        verified=db_org.verified,
        import_methods=db_org.import_methods or [],
        api_endpoint=db_org.api_endpoint,
        api_method=db_org.api_method,
        api_auth_type=db_org.api_auth_type,
        api_key=db_org.api_key,
        api_headers=db_org.api_headers or {},
        api_enabled=db_org.api_enabled,
        file_upload_method=db_org.file_upload_method,
        blob_storage_provider=db_org.blob_storage_provider,
        blob_storage_container=db_org.blob_storage_container,
        blob_storage_path=db_org.blob_storage_path,
        blob_storage_region=db_org.blob_storage_region,
        blob_storage_endpoint=db_org.blob_storage_endpoint,
        blob_storage_access_key=db_org.blob_storage_access_key,
        blob_storage_secret_key=db_org.blob_storage_secret_key,
        email_import_enabled=db_org.email_import_enabled,
        email_import_address=db_org.email_import_address,
        metadata_schema=db_org.metadata_schema,
        violations_count=db_org.violations_count,
        last_violation_date=db_org.last_violation_date,
        voluntary_recalls_count=db_org.voluntary_recalls_count,
        joint_recalls_count=db_org.joint_recalls_count,
        created_at=db_org.created_at,
        updated_at=db_org.updated_at,
        verified_at=db_org.verified_at,
    )


def db_to_import_history(db_history: ImportHistoryDB) -> ImportHistory:
    """Convert ImportHistoryDB to ImportHistory."""
    return ImportHistory(
        import_id=db_history.import_id,
        import_type=db_history.import_type,
        source=db_history.source,
        source_name=db_history.source_name,
        status=db_history.status,
        total_items=db_history.total_items,
        successful=db_history.successful,
        failed=db_history.failed,
        skipped=getattr(db_history, 'skipped', 0),
        items_processed=getattr(db_history, 'items_processed', 0),
        progress=getattr(db_history, 'progress', 0.0),
        created_by=db_history.created_by,
        created_at=db_history.created_at,
        completed_at=db_history.completed_at,
        error_summary=db_history.error_summary,
        metadata=db_history.meta_data or {},
    )

