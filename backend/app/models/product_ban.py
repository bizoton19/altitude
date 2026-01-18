"""
Product Ban data models.
Generic model for banned products from any regulatory agency.
Agencies sign up and define their own metadata structure.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class BanType(str, Enum):
    """Type of product ban."""
    RECALL = "recall"
    WARNING = "warning"
    ADVISORY = "advisory"
    ALERT = "alert"
    NOTICE = "notice"
    BAN = "ban"
    IMPORT_ALERT = "import_alert"
    SAFETY_ADVISORY = "safety_advisory"
    
    # Alias for backward compatibility
    ViolationType = "violation"  # Deprecated, use BAN


class RiskLevel(str, Enum):
    """Risk classification levels."""
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class ProductBanImage(BaseModel):
    """Image associated with a product ban."""
    url: str
    caption: Optional[str] = None
    alt_text: Optional[str] = None


class ProductBanProduct(BaseModel):
    """Product information from a product ban."""
    name: str
    description: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    manufacturer: Optional[str] = None
    brand: Optional[str] = None
    distributor: Optional[str] = None
    importer: Optional[str] = None
    
    # Generic identifiers (agencies can use what they need)
    identifiers: Dict[str, str] = Field(default_factory=dict, description="Flexible product identifiers (UPC, SKU, VIN, NDC, etc.)")
    # Examples:
    # {"UPC": "123456789", "SKU": "ABC123"}
    # {"VIN": "1HGBH41JXMN109186"}
    # {"NDC": "12345-678-90"}
    
    # Additional product metadata
    product_metadata: Dict[str, Any] = Field(default_factory=dict, description="Agency-specific product fields")


class ProductBanHazard(BaseModel):
    """Hazard/product ban information."""
    description: str
    hazard_type: Optional[str] = None
    severity: Optional[str] = None  # For FDA/USDA: Class I, II, III


class ProductBanRemedy(BaseModel):
    """Remedy/recommendation information."""
    description: str
    remedy_type: Optional[str] = None
    action_required: Optional[str] = None


class ProductBan(BaseModel):
    """
    Generic product ban record.
    Core attributes common to all banned products, with flexible metadata for agency-specific data.
    """
    product_ban_id: str = Field(..., description="Unique product ban identifier (e.g., CPSC-26156, FDA-2024-123)")
    
    # Core required attributes
    ban_number: str = Field(..., description="Product ban identifier (can be recall number, statute number, press release number, etc.)")
    title: str = Field(..., description="Title of the product ban/recall/alert")
    url: str = Field(..., description="URL to the product ban description on the agency's website")
    
    # Organization information
    # Primary organization (required) - can be agency or company
    organization_name: str = Field(..., description="Name of the organization issuing the product ban (agency or company)")
    organization_id: Optional[str] = Field(None, description="Internal organization ID (if organization has an account)")
    organization_type: Optional[str] = Field(None, description="Type: 'regulatory_agency' or 'company'")
    
    # Legacy fields for backward compatibility (deprecated - use organization_name/organization_id)
    agency_name: str = Field(..., description="[DEPRECATED] Use organization_name. Name of the regulatory agency")
    agency_acronym: Optional[str] = Field(None, description="Agency acronym (e.g., 'CPSC', 'FDA', 'HC')")
    agency_id: Optional[str] = Field(None, description="[DEPRECATED] Use organization_id. Internal agency ID")
    
    # Joint recall support (when both agency and company are involved)
    joint_organization_name: Optional[str] = Field(None, description="Name of the second organization in a joint recall (if applicable)")
    joint_organization_id: Optional[str] = Field(None, description="ID of the second organization in a joint recall")
    is_voluntary_recall: bool = Field(False, description="True if this is a voluntary recall issued by company only")
    is_joint_recall: bool = Field(False, description="True if this is a joint recall issued by both organizations")
    
    # Optional core attributes
    description: Optional[str] = Field(None, description="Description of the product ban")
    ban_date: Optional[datetime] = Field(None, description="Date product ban was issued")
    
    # Location
    country: Optional[str] = Field(None, description="Country/region code (ISO 3166-1 alpha-2, e.g., 'US', 'CA', 'GB', 'AU')")
    region: Optional[str] = Field(None, description="Region (e.g., 'North America', 'EU', 'APAC')")
    
    # Product ban type
    ban_type: BanType = BanType.RECALL
    
    # Classification
    risk_level: RiskLevel = RiskLevel.LOW
    risk_score: float = Field(0.0, ge=0.0, le=1.0)
    
    # Statistics (generic - agencies can add specifics in metadata)
    units_affected: Optional[int] = None  # Generic count of affected units
    injuries: int = 0
    deaths: int = 0
    incidents: int = 0
    illnesses: Optional[int] = None  # For food/drug violations
    
    # Product info
    products: List[ProductBanProduct] = []
    
    # Product ban details
    hazards: List[ProductBanHazard] = []
    remedies: List[ProductBanRemedy] = []
    
    # Media
    images: List[ProductBanImage] = []
    
    # Source information
    source_reference: Optional[str] = None  # Agency-specific reference ID
    source_language: str = Field("en", description="Language of source data (ISO 639-1, e.g., 'en', 'fr', 'de')")
    
    # Agency-defined metadata (completely flexible - agencies structure their own data)
    agency_metadata: Dict[str, Any] = Field(default_factory=dict, description="Agency-specific fields - agencies define their own structure")
    # Examples of what agencies might store:
    # CPSC: {"RecallNumber": "26156", "RecallDate": "2024-12-18", "UnitsSold": 2800}
    # FDA: {"RecallClass": "Class I", "ProductCode": "ABC123", "UnitsDistributed": 50000}
    # Health Canada: {"RecallNumber": "2024-001", "Category": "Children's Products"}
    # NHTSA: {"CampaignNumber": "24V001", "Component": "Airbags", "VINRange": "..."}
    # Custom agency: {"TheirField": "value", "AnotherField": 123}
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    @property
    def primary_product(self) -> Optional[ProductBanProduct]:
        """
        Get the primary (first) product for display purposes.
        Most product bans have one product, so this is a convenience method.
        """
        return self.products[0] if self.products else None
    
    @property
    def is_single_product(self) -> bool:
        """Check if this product ban has exactly one product (common case)."""
        return len(self.products) == 1
    
    @property
    def product_count(self) -> int:
        """Get the number of products in this product ban."""
        return len(self.products)
    
    def get_product_by_name(self, name: str) -> Optional[ProductBanProduct]:
        """Get a product by name (case-insensitive)."""
        name_lower = name.lower()
        for product in self.products:
            if product.name.lower() == name_lower:
                return product
        return None
    
    class Config:
        from_attributes = True


class ProductBanCreate(BaseModel):
    """Schema for creating a new product ban."""
    # Required core attributes
    ban_number: str = Field(..., description="Product ban identifier (recall number, statute number, press release, etc.)")
    title: str = Field(..., description="Title of the product ban")
    url: str = Field(..., description="URL to product ban description")
    
    # Organization information
    organization_name: str = Field(..., description="Name of the organization (agency or company)")
    organization_id: Optional[str] = None  # If organization has account
    organization_type: Optional[str] = Field(None, description="'regulatory_agency' or 'company'")
    
    # Legacy fields (for backward compatibility)
    agency_name: str = Field(..., description="[DEPRECATED] Use organization_name")
    agency_acronym: Optional[str] = None
    agency_id: Optional[str] = None
    
    # Joint recall support
    joint_organization_name: Optional[str] = None
    joint_organization_id: Optional[str] = None
    is_voluntary_recall: bool = False  # True if company-only voluntary recall
    is_joint_recall: bool = False  # True if both organizations issued together
    
    # Optional attributes
    description: Optional[str] = None
    ban_date: Optional[datetime] = None
    ban_type: BanType = BanType.RECALL
    units_affected: Optional[int] = None
    injuries: int = 0
    deaths: int = 0
    incidents: int = 0
    country: Optional[str] = None
    region: Optional[str] = None
    agency_metadata: Dict[str, Any] = Field(default_factory=dict)


class ProductBanSummary(BaseModel):
    """Lightweight product ban summary for lists."""
    product_ban_id: str
    ban_number: str
    title: str
    url: str
    agency_name: str
    agency_acronym: Optional[str] = None
    ban_type: BanType
    risk_level: RiskLevel
    risk_score: float
    ban_date: Optional[datetime] = None
    injuries: int
    deaths: int
    country: Optional[str] = None
    image_url: Optional[str] = None


class ProductBanSearchResult(BaseModel):
    """Search result with match information."""
    product_ban: ProductBanSummary
    relevance_score: float = 1.0
    match_highlights: List[str] = []


# Backward compatibility aliases (for gradual migration)
# Note: These aliases maintain compatibility with old code during migration
ViolationType = BanType  # Deprecated, use BanType
ViolationImage = ProductBanImage  # Deprecated, use ProductBanImage
ViolationProduct = ProductBanProduct  # Deprecated, use ProductBanProduct
ViolationHazard = ProductBanHazard  # Deprecated, use ProductBanHazard
ViolationRemedy = ProductBanRemedy  # Deprecated, use ProductBanRemedy
ProductViolation = ProductBan  # Deprecated, use ProductBan
ViolationSummary = ProductBanSummary  # Deprecated, use ProductBanSummary
ViolationCreate = ProductBanCreate  # Deprecated, use ProductBanCreate
ViolationSearchResult = ProductBanSearchResult  # Deprecated, use ProductBanSearchResult
Recall = ProductBan  # Deprecated, use ProductBan
RecallImage = ProductBanImage  # Deprecated, use ProductBanImage
RecallProduct = ProductBanProduct  # Deprecated, use ProductBanProduct
RecallHazard = ProductBanHazard  # Deprecated, use ProductBanHazard
RecallRemedy = ProductBanRemedy  # Deprecated, use ProductBanRemedy
RecallSummary = ProductBanSummary  # Deprecated, use ProductBanSummary
RecallCreate = ProductBanCreate  # Deprecated, use ProductBanCreate
RecallSearchResult = ProductBanSearchResult  # Deprecated, use ProductBanSearchResult

