"""
Recall data models.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class RiskLevel(str, Enum):
    """Risk classification levels."""
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RecallImage(BaseModel):
    """Image associated with a recall."""
    url: str
    caption: Optional[str] = None


class RecallProduct(BaseModel):
    """Product information from a recall."""
    name: str
    description: Optional[str] = None
    model_number: Optional[str] = None
    upc: Optional[str] = None
    manufacturer: Optional[str] = None


class RecallHazard(BaseModel):
    """Hazard information from a recall."""
    description: str
    hazard_type: Optional[str] = None


class RecallRemedy(BaseModel):
    """Remedy information for a recall."""
    description: str
    remedy_type: Optional[str] = None


class Recall(BaseModel):
    """Complete recall record."""
    recall_id: str = Field(..., description="Unique recall identifier (e.g., CPSC recall number)")
    recall_number: str
    title: str
    description: str
    recall_date: datetime
    
    # Classification
    risk_level: RiskLevel = RiskLevel.LOW
    risk_score: float = Field(0.0, ge=0.0, le=1.0)
    
    # Statistics
    units_sold: Optional[int] = None
    injuries: int = 0
    deaths: int = 0
    incidents: int = 0
    
    # Product info
    products: List[RecallProduct] = []
    
    # Hazard and remedy
    hazards: List[RecallHazard] = []
    remedies: List[RecallRemedy] = []
    
    # Media
    images: List[RecallImage] = []
    
    # Source
    source: str = "CPSC"
    source_url: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True


class RecallCreate(BaseModel):
    """Schema for creating a new recall."""
    recall_number: str
    title: str
    description: str
    recall_date: Optional[datetime] = None
    units_sold: Optional[int] = None
    injuries: int = 0
    deaths: int = 0
    incidents: int = 0


class RecallSummary(BaseModel):
    """Lightweight recall summary for lists."""
    recall_id: str
    recall_number: str
    title: str
    risk_level: RiskLevel
    risk_score: float
    recall_date: datetime
    injuries: int
    deaths: int
    image_url: Optional[str] = None


class RecallSearchResult(BaseModel):
    """Search result with match information."""
    recall: RecallSummary
    relevance_score: float = 1.0
    match_highlights: List[str] = []
