"""
Investigation data models.
Investigations are scheduled searches for violations on marketplaces.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
from enum import Enum


class InvestigationStatus(str, Enum):
    """Status of an investigation."""
    SCHEDULED = "scheduled"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class InvestigationSchedule(str, Enum):
    """Schedule frequency for investigations."""
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"


class Investigation(BaseModel):
    """Investigation configuration and results."""
    investigation_id: str
    name: str
    description: Optional[str] = None
    
    # Schedule
    schedule: InvestigationSchedule
    scheduled_start_time: datetime  # Next scheduled run
    start_time: Optional[datetime] = None  # Actual start
    end_time: Optional[datetime] = None  # Actual end
    
    # Scope
    violation_ids: List[str]  # Can investigate multiple violations
    marketplace_ids: List[str]  # Platforms to search
    region_ids: Optional[Dict[str, List[str]]] = None  # {marketplace_id: [region_ids]}
    # Example: {"craigslist": ["dc", "seattle"], "facebook": []}  # Empty = all regions
    
    # Agent assignment
    agent_id: Optional[str] = None  # Which agent performs this
    
    # Results
    status: InvestigationStatus
    listings_found: int = 0
    listings_queued: int = 0
    
    # Reviewer assignment (auto-assigned based on marketplace/region)
    assigned_reviewer_ids: List[str] = []  # Multiple reviewers for different regions
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str  # User ID (Firebase UID)

    class Config:
        from_attributes = True


class InvestigationCreate(BaseModel):
    """Schema for creating a new investigation."""
    name: str
    description: Optional[str] = None
    schedule: InvestigationSchedule
    scheduled_start_time: datetime
    violation_ids: List[str]
    marketplace_ids: List[str]
    region_ids: Optional[Dict[str, List[str]]] = None
    agent_id: Optional[str] = None


class InvestigationUpdate(BaseModel):
    """Schema for updating an investigation."""
    name: Optional[str] = None
    description: Optional[str] = None
    schedule: Optional[InvestigationSchedule] = None
    scheduled_start_time: Optional[datetime] = None
    violation_ids: Optional[List[str]] = None
    marketplace_ids: Optional[List[str]] = None
    region_ids: Optional[Dict[str, List[str]]] = None
    status: Optional[InvestigationStatus] = None
    agent_id: Optional[str] = None


class InvestigationSummary(BaseModel):
    """Lightweight investigation summary for lists."""
    investigation_id: str
    name: str
    status: InvestigationStatus
    schedule: InvestigationSchedule
    scheduled_start_time: datetime
    violation_ids: List[str]
    marketplace_ids: List[str]
    listings_found: int
    listings_queued: int
    created_at: datetime
    created_by: str
















