# Data models
# New violation models (multi-agency support)
from app.models.violation import (
    ProductViolation,
    ViolationImage,
    ViolationProduct,
    ViolationHazard,
    ViolationRemedy,
    ViolationSummary,
    ViolationCreate,
    ViolationSearchResult,
    ViolationType,
    RiskLevel,
    # Backward compatibility aliases
    Recall,
    RecallImage,
    RecallProduct,
    RecallHazard,
    RecallRemedy,
    RecallSummary,
    RecallCreate,
    RecallSearchResult,
)

# Legacy recall models (kept for backward compatibility during migration)
from app.models.recall import (
    Recall as LegacyRecall,
    RecallImage as LegacyRecallImage,
    RecallProduct as LegacyRecallProduct,
)

from app.models.marketplace import Marketplace, MarketplaceListing
from app.models.agent import AgentConfig, SearchTask
from app.models.organization import (
    Organization,
    OrganizationType,
    OrganizationStatus,
    OrganizationCreate,
    OrganizationUpdate,
)
