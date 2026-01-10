"""
SQLAlchemy ORM models for database persistence.
"""

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
# Use standard JSON type which works for both SQLite and PostgreSQL
# SQLAlchemy will automatically use the correct dialect-specific implementation
SQLiteJSON = JSON  # Alias for backward compatibility
from datetime import datetime
from typing import Optional
import enum

from sqlalchemy.orm import declarative_base

# Import Base from session to avoid circular imports
from app.db.session import Base
from app.models.violation import ViolationType, RiskLevel
from app.models.marketplace import MarketplaceStatus
from app.models.investigation import InvestigationStatus, InvestigationSchedule
from app.models.import_models import ImportSource, ImportStatus
from app.models.agent import TaskStatus, TaskType
from app.models.organization import OrganizationType, OrganizationStatus


# Violation Models
class ViolationDB(Base):
    """Violation table - main violation/recall records."""
    __tablename__ = "violations"
    
    violation_id = Column(String, primary_key=True, index=True)
    violation_number = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    url = Column(String, nullable=False)
    
    # Organization info (unified - can be agency or company)
    organization_name = Column(String, nullable=False, index=True)
    organization_id = Column(String, nullable=True, index=True)
    organization_type = Column(String, nullable=True, index=True)  # 'regulatory_agency' or 'company'
    
    # Legacy fields (for backward compatibility)
    agency_name = Column(String, nullable=False, index=True)
    agency_acronym = Column(String, nullable=True)
    agency_id = Column(String, nullable=True)
    
    # Joint recall support
    joint_organization_name = Column(String, nullable=True)
    joint_organization_id = Column(String, nullable=True)
    is_voluntary_recall = Column(Boolean, default=False, index=True)
    is_joint_recall = Column(Boolean, default=False, index=True)
    
    # Core attributes
    description = Column(Text, nullable=True)
    violation_date = Column(DateTime, nullable=True, index=True)
    violation_type = Column(SQLEnum(ViolationType), default=ViolationType.RECALL, index=True)
    
    # Location
    country = Column(String, nullable=True)
    region = Column(String, nullable=True)
    
    # Classification
    risk_level = Column(SQLEnum(RiskLevel), default=RiskLevel.LOW, index=True)
    risk_score = Column(Float, default=0.0)
    
    # Statistics
    units_affected = Column(Integer, nullable=True)
    injuries = Column(Integer, default=0)
    deaths = Column(Integer, default=0)
    incidents = Column(Integer, default=0)
    illnesses = Column(Integer, nullable=True)
    
    # Metadata
    source_reference = Column(String, nullable=True)
    source_language = Column(String, default="en")
    agency_metadata = Column(SQLiteJSON, default=dict)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    products = relationship("ViolationProductDB", back_populates="violation", cascade="all, delete-orphan")
    hazards = relationship("ViolationHazardDB", back_populates="violation", cascade="all, delete-orphan")
    remedies = relationship("ViolationRemedyDB", back_populates="violation", cascade="all, delete-orphan")
    images = relationship("ViolationImageDB", back_populates="violation", cascade="all, delete-orphan")
    listings = relationship("MarketplaceListingDB", back_populates="violation")


class ViolationProductDB(Base):
    """Violation products - one-to-many with violations."""
    __tablename__ = "violation_products"
    
    id = Column(String, primary_key=True)
    violation_id = Column(String, ForeignKey("violations.violation_id", ondelete="CASCADE"), nullable=False, index=True)
    
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    model_number = Column(String, nullable=True)
    serial_number = Column(String, nullable=True)
    manufacturer = Column(String, nullable=True)
    brand = Column(String, nullable=True)
    distributor = Column(String, nullable=True)
    importer = Column(String, nullable=True)
    
    identifiers = Column(SQLiteJSON, default=dict)
    product_metadata = Column(SQLiteJSON, default=dict)
    
    violation = relationship("ViolationDB", back_populates="products")


class ViolationHazardDB(Base):
    """Violation hazards - one-to-many with violations."""
    __tablename__ = "violation_hazards"
    
    id = Column(String, primary_key=True)
    violation_id = Column(String, ForeignKey("violations.violation_id", ondelete="CASCADE"), nullable=False, index=True)
    
    description = Column(Text, nullable=False)
    hazard_type = Column(String, nullable=True)
    severity = Column(String, nullable=True)
    
    violation = relationship("ViolationDB", back_populates="hazards")


class ViolationRemedyDB(Base):
    """Violation remedies - one-to-many with violations."""
    __tablename__ = "violation_remedies"
    
    id = Column(String, primary_key=True)
    violation_id = Column(String, ForeignKey("violations.violation_id", ondelete="CASCADE"), nullable=False, index=True)
    
    description = Column(Text, nullable=False)
    remedy_type = Column(String, nullable=True)
    action_required = Column(String, nullable=True)
    
    violation = relationship("ViolationDB", back_populates="remedies")


class ViolationImageDB(Base):
    """Violation images - one-to-many with violations."""
    __tablename__ = "violation_images"
    
    id = Column(String, primary_key=True)
    violation_id = Column(String, ForeignKey("violations.violation_id", ondelete="CASCADE"), nullable=False, index=True)
    
    url = Column(String, nullable=False)
    caption = Column(Text, nullable=True)
    alt_text = Column(Text, nullable=True)
    
    violation = relationship("ViolationDB", back_populates="images")


# Marketplace Models
class MarketplaceDB(Base):
    """Marketplace configuration table."""
    __tablename__ = "marketplaces"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    enabled = Column(Boolean, default=True, index=True)
    status = Column(SQLEnum(MarketplaceStatus), default=MarketplaceStatus.INACTIVE)
    
    # Region support
    supports_regions = Column(Boolean, default=False)
    regions = Column(SQLiteJSON, default=list)  # List of MarketplaceRegion dicts
    
    # Search configuration
    search_url_template = Column(String, nullable=True)
    api_config = Column(SQLiteJSON, default=dict)
    priority = Column(Integer, default=50)  # Higher = more important
    
    # Monitoring
    monitoring_frequency = Column(String, nullable=True)
    last_searched = Column(DateTime, nullable=True)
    search_count = Column(Integer, default=0)
    
    # Metadata (renamed from 'metadata' to avoid SQLAlchemy reserved name)
    meta_data = Column(SQLiteJSON, default=dict)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    listings = relationship("MarketplaceListingDB", back_populates="marketplace")


class MarketplaceListingDB(Base):
    """Marketplace listings found during searches."""
    __tablename__ = "marketplace_listings"
    
    id = Column(String, primary_key=True, index=True)
    marketplace_id = Column(String, ForeignKey("marketplaces.id", ondelete="SET NULL"), nullable=True, index=True)
    violation_id = Column(String, ForeignKey("violations.violation_id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Listing details
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    listing_url = Column(String, nullable=False, unique=True, index=True)
    image_url = Column(String, nullable=True)
    price = Column(Float, nullable=True)
    currency = Column(String, default="USD")
    
    # Match information
    match_score = Column(Float, default=0.0, index=True)
    match_reasons = Column(SQLiteJSON, default=list)
    
    # Seller info
    seller_name = Column(String, nullable=True)
    seller_location = Column(String, nullable=True)
    
    # Status
    status = Column(String, default="active")  # active, removed, flagged, etc.
    
    # Timestamps
    found_at = Column(DateTime, default=datetime.utcnow, index=True)
    last_checked = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Metadata (renamed from 'metadata' to avoid SQLAlchemy reserved name)
    meta_data = Column(SQLiteJSON, default=dict)
    
    # Relationships
    marketplace = relationship("MarketplaceDB", back_populates="listings")
    violation = relationship("ViolationDB", back_populates="listings")
    investigation_links = relationship("InvestigationListingDB", back_populates="listing")


# Investigation Models
class InvestigationDB(Base):
    """Investigation table."""
    __tablename__ = "investigations"
    
    investigation_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    # Schedule
    schedule = Column(SQLEnum(InvestigationSchedule), nullable=False)
    scheduled_start_time = Column(DateTime, nullable=False, index=True)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    
    # Scope
    violation_ids = Column(SQLiteJSON, default=list)  # List of violation IDs
    marketplace_ids = Column(SQLiteJSON, default=list)  # List of marketplace IDs
    region_ids = Column(SQLiteJSON, default=dict)  # {marketplace_id: [region_ids]}
    
    # Agent assignment
    agent_id = Column(String, nullable=True)
    agent_instructions = Column(Text, nullable=True)  # Declarative instructions
    execution_strategy = Column(String, default="hybrid")  # sequential, parallel, hybrid
    priority_order = Column(SQLiteJSON, default=["HIGH", "MEDIUM", "LOW"])
    autonomous = Column(Boolean, default=True)
    execution_metadata = Column(SQLiteJSON, default=dict)
    
    # Results
    status = Column(SQLEnum(InvestigationStatus), default=InvestigationStatus.SCHEDULED, index=True)
    listings_found = Column(Integer, default=0)
    listings_queued = Column(Integer, default=0)
    
    # Reviewer assignment
    assigned_reviewer_ids = Column(SQLiteJSON, default=list)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String, nullable=False)
    
    # Relationships
    listing_links = relationship("InvestigationListingDB", back_populates="investigation")


class InvestigationListingDB(Base):
    """Join table linking investigations to listings."""
    __tablename__ = "investigation_listings"
    
    id = Column(String, primary_key=True)
    investigation_id = Column(String, ForeignKey("investigations.investigation_id", ondelete="CASCADE"), nullable=False, index=True)
    listing_id = Column(String, ForeignKey("marketplace_listings.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Join metadata
    added_by = Column(String, nullable=True)
    source = Column(String, nullable=True)  # "scheduler", "manual", "api", etc.
    meta_data = Column(SQLiteJSON, default=dict)  # Renamed from 'metadata' to avoid SQLAlchemy reserved name
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    investigation = relationship("InvestigationDB", back_populates="listing_links")
    listing = relationship("MarketplaceListingDB", back_populates="investigation_links")
    
    # Unique constraint
    __table_args__ = (
        {"sqlite_autoincrement": True},
    )


# Import History
class ImportHistoryDB(Base):
    """Import history tracking."""
    __tablename__ = "import_history"
    
    import_id = Column(String, primary_key=True, index=True)
    import_type = Column(String, nullable=False, index=True)  # "listing" or "violation"
    source = Column(SQLEnum(ImportSource), nullable=False, index=True)
    source_name = Column(String, nullable=True)
    status = Column(SQLEnum(ImportStatus), default=ImportStatus.PENDING, index=True)
    
    total_items = Column(Integer, default=0)
    successful = Column(Integer, default=0)
    failed = Column(Integer, default=0)
    skipped = Column(Integer, default=0)
    
    # Progress tracking
    items_processed = Column(Integer, default=0)
    progress = Column(Float, default=0.0)
    
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    completed_at = Column(DateTime, nullable=True)
    
    error_summary = Column(Text, nullable=True)
    meta_data = Column(SQLiteJSON, default=dict)  # Renamed from 'metadata' to avoid SQLAlchemy reserved name


# Agent Configuration (simplified - store as JSON)
class AgentConfigDB(Base):
    """Agent configuration storage."""
    __tablename__ = "agent_config"
    
    id = Column(String, primary_key=True, default="default")
    config_data = Column(SQLiteJSON, nullable=False)  # Full AgentConfig as JSON
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Search Tasks
class SearchTaskDB(Base):
    """Search task tracking."""
    __tablename__ = "search_tasks"
    
    id = Column(String, primary_key=True, index=True)
    task_type = Column(SQLEnum(TaskType), nullable=False)
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.PENDING, index=True)
    
    # Task parameters
    recall_id = Column(String, nullable=True, index=True)
    violation_id = Column(String, nullable=True, index=True)
    marketplace_ids = Column(SQLiteJSON, default=list)
    search_query = Column(String, nullable=True)
    
    # Results
    result = Column(SQLiteJSON, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Progress
    progress = Column(Float, default=0.0)
    items_processed = Column(Integer, default=0)
    items_total = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)


# Organizations
class OrganizationDB(Base):
    """Organization table - unified model for companies and regulatory agencies."""
    __tablename__ = "organizations"
    
    organization_id = Column(String, primary_key=True, index=True)
    organization_type = Column(SQLEnum(OrganizationType), nullable=False, index=True)
    
    # Basic information
    name = Column(String, nullable=False, index=True)
    legal_name = Column(String, nullable=True)
    acronym = Column(String, nullable=True)
    
    # Company-specific fields
    industry = Column(String, nullable=True)
    business_type = Column(String, nullable=True)
    brands = Column(SQLiteJSON, default=list)
    
    # Contact information
    contact_email = Column(String, nullable=True, index=True)
    contact_name = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    website = Column(String, nullable=True)
    
    # Location
    country = Column(String, nullable=True, index=True)
    region = Column(String, nullable=True)
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state_province = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    
    # Account status
    status = Column(SQLEnum(OrganizationStatus), default=OrganizationStatus.PENDING, index=True)
    verified = Column(Boolean, default=False)
    
    # Import method configuration
    import_methods = Column(SQLiteJSON, default=list)
    
    # API integration
    api_endpoint = Column(String, nullable=True)
    api_method = Column(String, nullable=True)
    api_auth_type = Column(String, nullable=True)
    api_key = Column(String, nullable=True)  # Encrypted
    api_headers = Column(SQLiteJSON, default=dict)
    api_enabled = Column(Boolean, default=False)
    
    # File import configuration
    file_upload_method = Column(String, nullable=True)
    # Blob storage configuration (supports S3, Azure, GCS, etc.)
    blob_storage_provider = Column(String, nullable=True)  # 's3', 'azure', 'gcs', 'custom'
    blob_storage_container = Column(String, nullable=True)  # Container/bucket name
    blob_storage_path = Column(String, nullable=True)  # Path prefix
    blob_storage_region = Column(String, nullable=True)  # Region
    blob_storage_endpoint = Column(String, nullable=True)  # Custom endpoint URL
    blob_storage_access_key = Column(String, nullable=True)  # Encrypted
    blob_storage_secret_key = Column(String, nullable=True)  # Encrypted
    
    # Email import configuration
    email_import_enabled = Column(Boolean, default=False)
    email_import_address = Column(String, nullable=True)
    
    # Agency-specific: Metadata schema
    metadata_schema = Column(SQLiteJSON, nullable=True)
    
    # Statistics
    violations_count = Column(Integer, default=0)
    last_violation_date = Column(DateTime, nullable=True)
    voluntary_recalls_count = Column(Integer, default=0)
    joint_recalls_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    verified_at = Column(DateTime, nullable=True)

