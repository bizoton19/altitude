"""
Investigation ↔ Listing association models.

We treat listings as canonical records (unique by marketplace + URL),
and link them to investigations via join records so the same listing URL
can be part of multiple investigations without duplication.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class InvestigationListing(BaseModel):
    """Join record linking an investigation to a listing."""
    investigation_id: str
    listing_id: str

    # Provenance / audit
    added_at: datetime = Field(default_factory=datetime.utcnow)
    added_by: Optional[str] = None  # user id / agent id
    source: Optional[str] = None  # e.g., "manual", "agent", "scheduler", "extension"
    notes: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        from_attributes = True


