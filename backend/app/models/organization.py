"""
Organization model for registered organizations.
Organizations can be either Companies or Regulatory Agencies.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class OrganizationType(str, Enum):
    """Type of organization."""
    COMPANY = "company"
    REGULATORY_AGENCY = "regulatory_agency"


class OrganizationStatus(str, Enum):
    """Organization account status."""
    PENDING = "pending"  # Awaiting approval
    ACTIVE = "active"    # Approved and active
    SUSPENDED = "suspended"  # Temporarily suspended
    INACTIVE = "inactive"  # Deactivated


class Organization(BaseModel):
    """
    Registered organization (Company or Regulatory Agency).
    Organizations can issue violations/recalls and configure import methods.
    """
    organization_id: str = Field(..., description="Unique organization identifier")
    organization_type: OrganizationType = Field(..., description="Type: 'company' or 'regulatory_agency'")
    
    # Basic information
    name: str = Field(..., description="Organization name (e.g., 'Consumer Product Safety Commission' or 'Toy Company Inc.')")
    legal_name: Optional[str] = Field(None, description="Legal/registered name if different (mainly for companies)")
    acronym: Optional[str] = Field(None, description="Acronym (e.g., 'CPSC', 'FDA') - mainly for agencies")
    
    # Company-specific fields
    industry: Optional[str] = Field(None, description="Industry (e.g., 'Toys', 'Electronics', 'Food') - for companies")
    business_type: Optional[str] = Field(None, description="Business type: 'manufacturer', 'distributor', 'retailer', 'importer' - for companies")
    brands: List[str] = Field(default_factory=list, description="Brand names owned by company")
    
    # Contact information
    contact_email: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    
    # Location
    country: Optional[str] = Field(None, description="Country code (ISO 3166-1 alpha-2)")
    region: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state_province: Optional[str] = None
    postal_code: Optional[str] = None
    
    # Account status
    status: OrganizationStatus = OrganizationStatus.PENDING
    verified: bool = False  # Whether organization identity is verified
    
    # Import method configuration
    import_methods: List[str] = Field(default_factory=list, description="Enabled import methods: 'api', 'file_upload', 'blob_storage', 'email'")
    
    # API integration (if organization provides API)
    api_endpoint: Optional[str] = None
    api_method: Optional[str] = Field(None, description="HTTP method: 'GET', 'POST', etc.")
    api_auth_type: Optional[str] = Field(None, description="Auth type: 'bearer', 'basic', 'api_key', 'none'")
    api_key: Optional[str] = None  # Encrypted
    api_headers: Dict[str, str] = Field(default_factory=dict, description="Custom API headers")
    api_enabled: bool = False
    
    # File import configuration
    file_upload_method: Optional[str] = Field(None, description="File upload method: 'browser', 'blob_storage', 'sftp'")
    # Blob storage configuration (supports S3, Azure Blob Storage, GCS, etc.)
    blob_storage_provider: Optional[str] = Field(None, description="Blob storage provider: 's3', 'azure', 'gcs', 'custom'")
    blob_storage_container: Optional[str] = Field(None, description="Container/bucket name")
    blob_storage_path: Optional[str] = Field(None, description="Path prefix within container")
    blob_storage_region: Optional[str] = Field(None, description="Region (for S3, Azure, etc.)")
    blob_storage_endpoint: Optional[str] = Field(None, description="Custom endpoint URL (for custom providers)")
    blob_storage_access_key: Optional[str] = Field(None, description="Access key/account name (encrypted)")
    blob_storage_secret_key: Optional[str] = Field(None, description="Secret key/account key (encrypted)")
    
    # Email import configuration (if using email)
    email_import_enabled: bool = False
    email_import_address: Optional[str] = None
    
    # Agency-specific: Metadata schema (optional - agencies can define their own fields)
    metadata_schema: Optional[Dict[str, Any]] = Field(
        None, 
        description="JSON Schema defining organization's custom metadata structure (mainly for agencies)"
    )
    
    # Statistics
    violations_count: int = 0
    last_violation_date: Optional[datetime] = None
    voluntary_recalls_count: int = 0  # For companies
    joint_recalls_count: int = 0  # For companies
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    verified_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class OrganizationCreate(BaseModel):
    """Schema for organization registration."""
    organization_type: OrganizationType
    name: str
    legal_name: Optional[str] = None
    acronym: Optional[str] = None
    contact_email: str
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state_province: Optional[str] = None
    postal_code: Optional[str] = None
    
    # Company-specific
    industry: Optional[str] = None
    business_type: Optional[str] = None
    brands: List[str] = []
    
    # Agency-specific
    metadata_schema: Optional[Dict[str, Any]] = None
    
    # Import method configuration (set during registration)
    import_methods: List[str] = Field(default_factory=list, description="Import methods: 'api', 'file_upload', 'blob_storage', 'email'")
    
    # API configuration (if import_methods includes 'api')
    api_endpoint: Optional[str] = None
    api_method: Optional[str] = "GET"
    api_auth_type: Optional[str] = None  # 'bearer', 'basic', 'api_key', 'none'
    api_key: Optional[str] = None
    api_headers: Dict[str, str] = Field(default_factory=dict)
    
    # File upload configuration (if import_methods includes 'file_upload' or 'blob_storage')
    file_upload_method: Optional[str] = None  # 'browser', 'blob_storage', 'sftp'
    # Blob storage configuration
    blob_storage_provider: Optional[str] = None  # 's3', 'azure', 'gcs', 'custom'
    blob_storage_container: Optional[str] = None
    blob_storage_path: Optional[str] = None
    blob_storage_region: Optional[str] = None
    blob_storage_endpoint: Optional[str] = None
    blob_storage_access_key: Optional[str] = None
    blob_storage_secret_key: Optional[str] = None
    
    # Email configuration (if import_methods includes 'email')
    email_import_address: Optional[str] = None


class OrganizationUpdate(BaseModel):
    """Schema for updating organization information."""
    name: Optional[str] = None
    legal_name: Optional[str] = None
    acronym: Optional[str] = None
    contact_email: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state_province: Optional[str] = None
    postal_code: Optional[str] = None
    industry: Optional[str] = None
    business_type: Optional[str] = None
    brands: Optional[List[str]] = None
    metadata_schema: Optional[Dict[str, Any]] = None
    
    # Import method updates
    import_methods: Optional[List[str]] = None
    api_endpoint: Optional[str] = None
    api_method: Optional[str] = None
    api_auth_type: Optional[str] = None
    api_key: Optional[str] = None
    api_headers: Optional[Dict[str, str]] = None
    api_enabled: Optional[bool] = None
    file_upload_method: Optional[str] = None
    blob_storage_provider: Optional[str] = None
    blob_storage_container: Optional[str] = None
    blob_storage_path: Optional[str] = None
    blob_storage_region: Optional[str] = None
    blob_storage_endpoint: Optional[str] = None
    blob_storage_access_key: Optional[str] = None
    blob_storage_secret_key: Optional[str] = None
    email_import_enabled: Optional[bool] = None
    email_import_address: Optional[str] = None

