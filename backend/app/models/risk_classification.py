"""
Risk Classification Configuration Models
========================================
Models for configuring risk classification rules, levels, and scoring.
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any, Literal
from enum import Enum


class RuleOperator(str, Enum):
    """Operators for field-based rules."""
    GREATER_THAN = ">"
    GREATER_THAN_OR_EQUAL = ">="
    LESS_THAN = "<"
    LESS_THAN_OR_EQUAL = "<="
    EQUAL = "=="
    NOT_EQUAL = "!="
    IS_NULL = "is_null"
    IS_NOT_NULL = "is_not_null"


class RiskLevelConfig(BaseModel):
    """Configuration for a risk level."""
    name: str = Field(..., description="Risk level name (e.g., 'HIGH', 'CRITICAL', 'SEVERE')")
    score_threshold: float = Field(..., ge=0.0, le=1.0, description="Minimum score threshold for this level")
    color: Optional[str] = Field(None, description="Display color (hex code or CSS color name)")
    badge: Optional[str] = Field(None, description="Badge/icon identifier")
    priority: int = Field(..., description="Priority order (higher = more severe, used for sorting)")
    
    class Config:
        from_attributes = True


class ScoreRule(BaseModel):
    """A rule that contributes to the risk score based on field values."""
    rule_id: str = Field(..., description="Unique identifier for this rule")
    name: str = Field(..., description="Human-readable rule name")
    field_path: str = Field(..., description="Field path on ProductViolation (e.g., 'injuries', 'deaths', 'units_affected')")
    operator: RuleOperator = Field(..., description="Comparison operator")
    value: Optional[Any] = Field(None, description="Value to compare against (not needed for is_null/is_not_null)")
    score_contribution: float = Field(..., ge=0.0, le=1.0, description="Base score contribution if rule matches")
    score_per_unit: Optional[float] = Field(None, ge=0.0, description="Additional score per unit (e.g., 0.05 per injury)")
    max_contribution: Optional[float] = Field(None, ge=0.0, le=1.0, description="Maximum total contribution from this rule")
    force_level: Optional[str] = Field(None, description="Force this risk level if rule matches (overrides score)")
    enabled: bool = Field(True, description="Whether this rule is active")
    
    @field_validator('value')
    @classmethod
    def validate_value(cls, v, info):
        """Validate value is provided for operators that need it."""
        operator = info.data.get('operator')
        if operator in [RuleOperator.IS_NULL, RuleOperator.IS_NOT_NULL]:
            return None
        if v is None and operator not in [RuleOperator.IS_NULL, RuleOperator.IS_NOT_NULL]:
            raise ValueError(f"Value is required for operator {operator}")
        return v
    
    class Config:
        from_attributes = True


class KeywordRule(BaseModel):
    """A rule that contributes to risk score based on keyword matching in hazard descriptions."""
    rule_id: str = Field(..., description="Unique identifier for this rule")
    name: str = Field(..., description="Human-readable rule name (e.g., 'High Severity Keywords')")
    keywords: List[str] = Field(..., description="List of keywords to search for")
    score_per_match: float = Field(..., ge=0.0, description="Score contribution per keyword match")
    max_contribution: float = Field(..., ge=0.0, le=1.0, description="Maximum total contribution from this rule")
    enabled: bool = Field(True, description="Whether this rule is active")
    
    class Config:
        from_attributes = True


class UnitsSoldThreshold(BaseModel):
    """Threshold configuration for units sold exposure multiplier."""
    threshold: int = Field(..., ge=0, description="Minimum units sold for this threshold")
    score_contribution: float = Field(..., ge=0.0, le=1.0, description="Score contribution when threshold is met")
    
    class Config:
        from_attributes = True


class RiskClassificationConfig(BaseModel):
    """Complete risk classification configuration."""
    # Risk levels (ordered by priority, highest first)
    risk_levels: List[RiskLevelConfig] = Field(..., description="Available risk levels")
    
    # Field-based scoring rules
    score_rules: List[ScoreRule] = Field(default_factory=list, description="Rules based on violation fields")
    
    # Keyword-based scoring rules
    keyword_rules: List[KeywordRule] = Field(default_factory=list, description="Rules based on hazard keyword matching")
    
    # Units sold thresholds
    units_sold_thresholds: List[UnitsSoldThreshold] = Field(
        default_factory=list,
        description="Score contributions based on units affected"
    )
    
    # Global settings
    default_risk_level: str = Field("LOW", description="Default risk level if no rules match")
    max_total_score: float = Field(1.0, ge=0.0, le=1.0, description="Maximum possible risk score")
    
    @field_validator('risk_levels')
    @classmethod
    def validate_risk_levels(cls, v):
        """Validate risk levels are properly ordered and have unique names."""
        if not v:
            raise ValueError("At least one risk level must be defined")
        
        names = [level.name for level in v]
        if len(names) != len(set(names)):
            raise ValueError("Risk level names must be unique")
        
        # Sort by priority (highest first)
        v_sorted = sorted(v, key=lambda x: x.priority, reverse=True)
        
        # Validate thresholds are in descending order
        for i in range(len(v_sorted) - 1):
            if v_sorted[i].score_threshold < v_sorted[i + 1].score_threshold:
                raise ValueError("Risk level thresholds must be in descending order (highest priority = highest threshold)")
        
        return v_sorted
    
    class Config:
        from_attributes = True


def get_default_risk_classification_config() -> RiskClassificationConfig:
    """Get default risk classification configuration matching current hardcoded behavior."""
    return RiskClassificationConfig(
        risk_levels=[
            RiskLevelConfig(
                name="HIGH",
                score_threshold=0.6,
                color="#ff4444",
                badge="HIGH",
                priority=3
            ),
            RiskLevelConfig(
                name="MEDIUM",
                score_threshold=0.3,
                color="#ffaa00",
                badge="MEDIUM",
                priority=2
            ),
            RiskLevelConfig(
                name="LOW",
                score_threshold=0.0,
                color="#00ff88",
                badge="LOW",
                priority=1
            ),
        ],
        score_rules=[
            ScoreRule(
                rule_id="deaths_base",
                name="Deaths Base Contribution",
                field_path="deaths",
                operator=RuleOperator.GREATER_THAN,
                value=0,
                score_contribution=0.4,
                score_per_unit=0.15,
                max_contribution=0.7
            ),
            ScoreRule(
                rule_id="injuries_base",
                name="Injuries Base Contribution",
                field_path="injuries",
                operator=RuleOperator.GREATER_THAN,
                value=0,
                score_contribution=0.0,
                score_per_unit=0.05,
                max_contribution=0.4
            ),
            ScoreRule(
                rule_id="injuries_high_threshold",
                name="High Injury Count - Force HIGH",
                field_path="injuries",
                operator=RuleOperator.GREATER_THAN_OR_EQUAL,
                value=10,
                force_level="HIGH",
                score_contribution=0.0
            ),
            ScoreRule(
                rule_id="incidents_base",
                name="Incidents Base Contribution",
                field_path="incidents",
                operator=RuleOperator.GREATER_THAN,
                value=0,
                score_contribution=0.0,
                score_per_unit=0.01,
                max_contribution=0.2
            ),
            ScoreRule(
                rule_id="deaths_any",
                name="Any Deaths - Force HIGH",
                field_path="deaths",
                operator=RuleOperator.GREATER_THAN,
                value=0,
                force_level="HIGH",
                score_contribution=0.0
            ),
        ],
        keyword_rules=[
            KeywordRule(
                rule_id="high_severity_keywords",
                name="High Severity Keywords",
                keywords=[
                    "death", "fatal", "fire", "burn", "electrocution", "strangulation",
                    "suffocation", "choking", "laceration", "amputation", "carbon monoxide",
                    "explosion", "poisoning", "drowning", "asphyxiation", "lead"
                ],
                score_per_match=0.1,
                max_contribution=0.3
            ),
            KeywordRule(
                rule_id="medium_severity_keywords",
                name="Medium Severity Keywords",
                keywords=[
                    "injury", "fall", "cut", "bruise", "fracture", "shock", "entrapment",
                    "tip-over", "collision", "crash", "pinch", "allergic", "rash", "mold"
                ],
                score_per_match=0.03,
                max_contribution=0.15
            ),
        ],
        units_sold_thresholds=[
            UnitsSoldThreshold(threshold=1_000_000, score_contribution=0.15),
            UnitsSoldThreshold(threshold=500_000, score_contribution=0.1),
            UnitsSoldThreshold(threshold=100_000, score_contribution=0.05),
            UnitsSoldThreshold(threshold=10_000, score_contribution=0.02),
        ],
        default_risk_level="LOW",
        max_total_score=1.0
    )






