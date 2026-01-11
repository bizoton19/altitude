"""
Agency model for registered regulatory agencies.
Agencies sign up and can define their own metadata schemas.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class AgencyStatus(str, Enum):
    """Agency account status."""
    PENDING = "pending"  # Awaiting approval
    ACTIVE = "active"    # Approved and active
    SUSPENDED = "suspended"  # Temporarily suspended
    INACTIVE = "inactive"  # Deactivated


class Agency(BaseModel):
    """
    Registered regulatory agency.
    Agencies sign up and can define their own violation metadata structure.
    """
    agency_id: str = Field(..., description="Unique agency identifier")
    agency_name: str = Field(..., description="Full agency name (e.g., 'Consumer Product Safety Commission')")
    agency_acronym: Optional[str] = Field(None, description="Agency acronym (e.g., 'CPSC', 'FDA')")
    
    # Contact information
    contact_email: Optional[str] = None
    contact_name: Optional[str] = None
    website: Optional[str] = None
    
    # Location
    country: Optional[str] = Field(None, description="Country code (ISO 3166-1 alpha-2)")
    region: Optional[str] = None
    
    # Account status
    status: AgencyStatus = AgencyStatus.PENDING
    verified: bool = False  # Whether agency identity is verified
    
    # Metadata schema (optional - agencies can define their own fields)
    metadata_schema: Optional[Dict[str, Any]] = Field(
        None, 
        description="JSON Schema defining agency's custom metadata structure"
    )
    # Example:
    # {
    #   "type": "object",
    #   "properties": {
    #     "RecallClass": {"type": "string"},
    #     "ProductCode": {"type": "string"},
    #     "UnitsDistributed": {"type": "integer"}
    #   }
    # }
    
    # API integration (if agency provides API)
    api_endpoint: Optional[str] = None
    api_key: Optional[str] = None  # Encrypted
    api_enabled: bool = False
    
    # Statistics
    violations_count: int = 0
    last_violation_date: Optional[datetime] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    verified_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class AgencyCreate(BaseModel):
    """Schema for agency registration."""
    agency_name: str
    agency_acronym: Optional[str] = None
    contact_email: str
    contact_name: Optional[str] = None
    website: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    metadata_schema: Optional[Dict[str, Any]] = None


class AgencyUpdate(BaseModel):
    """Schema for updating agency information."""
    agency_name: Optional[str] = None
    agency_acronym: Optional[str] = None
    contact_email: Optional[str] = None
    contact_name: Optional[str] = None
    website: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    metadata_schema: Optional[Dict[str, Any]] = None
    api_endpoint: Optional[str] = None
    api_enabled: Optional[bool] = None



