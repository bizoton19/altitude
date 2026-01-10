"""
Marketplace data models.
"""

from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class MarketplaceStatus(str, Enum):
    """Status of marketplace monitoring."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    RATE_LIMITED = "rate_limited"


class MonitoringFrequency(str, Enum):
    """Monitoring frequency options."""
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"


class NotificationType(str, Enum):
    """Notification delivery types."""
    EMAIL = "email"
    PORTAL = "portal"
    WEBHOOK = "webhook"
    SMS = "sms"


class RiskLevel(str, Enum):
    """Risk level based on violation listings."""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    UNKNOWN = "unknown"


class MarketplaceRegion(BaseModel):
    """Region configuration for marketplaces that support regions (e.g., Craigslist)."""
    region_id: str  # e.g., "dc", "seattle", "nyc"
    region_name: str  # e.g., "Washington DC", "Seattle", "New York City"
    region_code: Optional[str] = None  # ISO or marketplace-specific code
    url_template: Optional[str] = None  # Region-specific search URL template
    enabled: bool = True


class PlatformAgreement(BaseModel):
    """Platform agreement/terms configuration."""
    agreement_id: str = Field(default_factory=lambda: f"agr-{datetime.utcnow().timestamp()}")
    agreement_type: str  # "terms_of_service", "api_agreement", "data_sharing", etc.
    agreement_date: datetime
    agreement_url: Optional[str] = None
    email_attachments: List[str] = Field(default_factory=list)  # File paths or URLs
    metadata: Dict[str, Any] = Field(default_factory=dict)  # Additional key-value pairs
    
    class Config:
        from_attributes = True


class Marketplace(BaseModel):
    """Marketplace configuration."""
    id: str
    name: str
    url: str
    enabled: bool = True
    status: MarketplaceStatus = MarketplaceStatus.INACTIVE
    
    # Region support
    supports_regions: bool = False  # True for Craigslist, Facebook Marketplace, etc.
    regions: List[MarketplaceRegion] = []  # Available regions
    
    # Search configuration
    search_url_template: Optional[str] = None
    region_search_url_template: Optional[str] = None  # Template with {region} placeholder
    requires_api_key: bool = False
    api_key: Optional[str] = None
    
    # Rate limiting
    rate_limit_per_minute: int = 10
    last_search_at: Optional[datetime] = None
    
    # Monitoring configuration
    monitoring_frequency: MonitoringFrequency = MonitoringFrequency.DAILY
    monitoring_enabled: bool = True
    last_monitored_at: Optional[datetime] = None
    next_monitoring_at: Optional[datetime] = None
    
    # Risk tracking
    risk_level: RiskLevel = RiskLevel.UNKNOWN
    violation_listings_count: int = 0
    risk_calculation_date: Optional[datetime] = None
    
    # Notification configuration
    notification_types: List[NotificationType] = Field(default_factory=list)
    notification_email: Optional[str] = None
    notification_portal_url: Optional[str] = None
    notification_portal_credentials: Optional[Dict[str, str]] = Field(default_factory=dict)  # Encrypted
    notification_webhook_url: Optional[str] = None
    notification_sms_number: Optional[str] = None
    
    # Platform agreements
    platform_agreements: List[PlatformAgreement] = Field(default_factory=list)
    
    # Stats
    total_searches: int = 0
    total_listings_found: int = 0
    
    # Additional metadata
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True


class MarketplaceListing(BaseModel):
    """A product listing found on a marketplace."""
    id: str
    marketplace_id: str
    marketplace_name: str
    region_id: Optional[str] = None  # NEW: Region where listing was found
    region_name: Optional[str] = None  # NEW: Human-readable region name
    
    # Listing details
    title: str
    description: Optional[str] = None
    price: Optional[float] = None
    currency: str = "USD"
    listing_url: str
    image_url: Optional[str] = None
    seller_name: Optional[str] = None
    seller_rating: Optional[float] = None
    
    # Match info
    recall_id: str  # Backward compatibility - maps to violation_id
    violation_id: Optional[str] = None  # NEW: Preferred field name
    investigation_id: Optional[str] = None  # NEW: Investigation/session that produced this listing
    match_score: float = Field(0.0, ge=0.0, le=1.0)
    match_reasons: List[str] = []
    
    # Status
    is_flagged: bool = False
    flagged_at: Optional[datetime] = None
    is_verified: bool = False
    
    # Timestamps
    found_at: datetime = Field(default_factory=datetime.utcnow)
    listing_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class MarketplaceCreate(BaseModel):
    """Schema for adding a new marketplace."""
    name: str
    url: str
    search_url_template: Optional[str] = None
    requires_api_key: bool = False
    supports_regions: bool = False
    region_search_url_template: Optional[str] = None


class MarketplaceUpdate(BaseModel):
    """Schema for updating marketplace settings."""
    enabled: Optional[bool] = None
    api_key: Optional[str] = None
    rate_limit_per_minute: Optional[int] = None
    monitoring_frequency: Optional[MonitoringFrequency] = None
    monitoring_enabled: Optional[bool] = None
    notification_types: Optional[List[NotificationType]] = None
    notification_email: Optional[str] = None
    notification_portal_url: Optional[str] = None
    notification_portal_credentials: Optional[Dict[str, str]] = None
    notification_webhook_url: Optional[str] = None
    notification_sms_number: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class PlatformAgreementCreate(BaseModel):
    """Schema for creating a platform agreement."""
    agreement_type: str
    agreement_date: datetime
    agreement_url: Optional[str] = None
    email_attachments: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class PlatformAgreementUpdate(BaseModel):
    """Schema for updating a platform agreement."""
    agreement_type: Optional[str] = None
    agreement_date: Optional[datetime] = None
    agreement_url: Optional[str] = None
    email_attachments: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


class MarketplaceSearchRequest(BaseModel):
    """Request to search a marketplace."""
    recall_id: str  # Backward compatibility
    violation_id: Optional[str] = None  # NEW: Preferred field name
    marketplace_ids: List[str] = []  # Empty = search all enabled
    region_ids: Optional[Dict[str, List[str]]] = None  # {marketplace_id: [region_ids]}
    search_depth: int = 3


class MarketplaceSearchResult(BaseModel):
    """Results from searching marketplaces."""
    recall_id: str  # Backward compatibility
    violation_id: Optional[str] = None  # NEW: Preferred field name
    marketplace_id: str
    marketplace_name: str
    listings: List[MarketplaceListing]
    search_duration_ms: int
    searched_at: datetime = Field(default_factory=datetime.utcnow)


# Default regions for Craigslist
CRAIGSLIST_REGIONS = [
    {"region_id": "dc", "region_name": "Washington DC", "region_code": "washingtondc"},
    {"region_id": "seattle", "region_name": "Seattle", "region_code": "seattle"},
    {"region_id": "nyc", "region_name": "New York City", "region_code": "newyork"},
    {"region_id": "sfbay", "region_name": "San Francisco Bay Area", "region_code": "sfbay"},
    {"region_id": "losangeles", "region_name": "Los Angeles", "region_code": "losangeles"},
    {"region_id": "chicago", "region_name": "Chicago", "region_code": "chicago"},
    {"region_id": "boston", "region_name": "Boston", "region_code": "boston"},
    {"region_id": "atlanta", "region_name": "Atlanta", "region_code": "atlanta"},
    {"region_id": "miami", "region_name": "Miami", "region_code": "miami"},
    {"region_id": "phoenix", "region_name": "Phoenix", "region_code": "phoenix"},
]


# Default marketplaces to support
DEFAULT_MARKETPLACES = [
    {
        "id": "facebook",
        "name": "Facebook Marketplace",
        "url": "https://www.facebook.com/marketplace",
        "search_url_template": "https://www.facebook.com/marketplace/search?query={query}",
        "requires_api_key": False,
        "rate_limit_per_minute": 5,
        "supports_regions": False,
    },
    {
        "id": "ebay",
        "name": "eBay",
        "url": "https://www.ebay.com",
        "search_url_template": "https://www.ebay.com/sch/i.html?_nkw={query}",
        "requires_api_key": False,
        "rate_limit_per_minute": 20,
        "supports_regions": False,
    },
    {
        "id": "amazon",
        "name": "Amazon",
        "url": "https://www.amazon.com",
        "search_url_template": "https://www.amazon.com/s?k={query}",
        "requires_api_key": False,
        "rate_limit_per_minute": 10,
        "supports_regions": False,
    },
    {
        "id": "craigslist",
        "name": "Craigslist",
        "url": "https://www.craigslist.org",
        "search_url_template": "https://{region}.craigslist.org/search/sss?query={query}",
        "region_search_url_template": "https://{region}.craigslist.org/search/sss?query={query}",
        "requires_api_key": False,
        "rate_limit_per_minute": 10,
        "supports_regions": True,
    },
    {
        "id": "offerup",
        "name": "OfferUp",
        "url": "https://offerup.com",
        "search_url_template": "https://offerup.com/search?q={query}",
        "requires_api_key": False,
        "rate_limit_per_minute": 10,
        "supports_regions": False,
    },
    {
        "id": "mercari",
        "name": "Mercari",
        "url": "https://www.mercari.com",
        "search_url_template": "https://www.mercari.com/search/?keyword={query}",
        "requires_api_key": False,
        "rate_limit_per_minute": 10,
        "supports_regions": False,
    },
]
