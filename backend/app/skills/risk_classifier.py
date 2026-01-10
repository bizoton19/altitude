"""
Risk Classification Skill
==========================
Internal skill for classifying recalls by risk level.
Uses configurable rules based on units sold, injuries, deaths, and hazard severity.
"""

from app.models.recall import RiskLevel, Recall
from app.models.violation import ProductViolation
from app.models.risk_classification import (
    RiskClassificationConfig,
    get_default_risk_classification_config,
    RuleOperator
)
from app.services import database as db
from typing import Tuple, Optional
import re


async def get_risk_classification_config() -> RiskClassificationConfig:
    """Get risk classification configuration from skill settings."""
    config = await db.get_agent_config()
    if not config:
        return get_default_risk_classification_config()
    
    # Find risk_classifier skill
    risk_skill = None
    for skill in config.skills:
        if skill.skill_id == "risk_classifier":
            risk_skill = skill
            break
    
    if not risk_skill or not risk_skill.settings:
        return get_default_risk_classification_config()
    
    try:
        # Parse settings dict into RiskClassificationConfig
        return RiskClassificationConfig(**risk_skill.settings)
    except Exception as e:
        # If parsing fails, return defaults
        print(f"Error parsing risk classification config: {e}")
        return get_default_risk_classification_config()


def get_field_value(violation: ProductViolation, field_path: str) -> any:
    """Get a field value from a violation using dot notation or direct attribute access."""
    # Handle direct attributes first
    if hasattr(violation, field_path) and not field_path.startswith('metadata.'):
        return getattr(violation, field_path)
    
    # Handle nested paths (e.g., "metadata.some_key")
    parts = field_path.split('.')
    value = violation
    for part in parts:
        if hasattr(value, part):
            value = getattr(value, part)
        elif isinstance(value, dict) and part in value:
            value = value[part]
        else:
            return None
    
    return value


def evaluate_rule(violation: ProductViolation, rule, config: RiskClassificationConfig) -> Tuple[bool, float, Optional[str]]:
    """
    Evaluate a score rule against a violation.
    
    Returns:
        Tuple of (matches, score_contribution, forced_level)
    """
    if not rule.enabled:
        return False, 0.0, None
    
    field_value = get_field_value(violation, rule.field_path)
    
    # Handle null checks
    if rule.operator == RuleOperator.IS_NULL:
        matches = field_value is None
        return matches, rule.score_contribution if matches else 0.0, rule.force_level if matches else None
    
    if rule.operator == RuleOperator.IS_NOT_NULL:
        matches = field_value is not None
        return matches, rule.score_contribution if matches else 0.0, rule.force_level if matches else None
    
    # Handle comparisons (need a value)
    if field_value is None:
        return False, 0.0, None
    
    # Convert field_value to appropriate type for comparison
    if rule.value is not None:
        if isinstance(rule.value, (int, float)) and isinstance(field_value, (int, float)):
            compare_value = float(rule.value)
            field_value = float(field_value)
        else:
            compare_value = rule.value
    else:
        return False, 0.0, None
    
    # Evaluate operator
    matches = False
    if rule.operator == RuleOperator.GREATER_THAN:
        matches = field_value > compare_value
    elif rule.operator == RuleOperator.GREATER_THAN_OR_EQUAL:
        matches = field_value >= compare_value
    elif rule.operator == RuleOperator.LESS_THAN:
        matches = field_value < compare_value
    elif rule.operator == RuleOperator.LESS_THAN_OR_EQUAL:
        matches = field_value <= compare_value
    elif rule.operator == RuleOperator.EQUAL:
        matches = field_value == compare_value
    elif rule.operator == RuleOperator.NOT_EQUAL:
        matches = field_value != compare_value
    
    if not matches:
        return False, 0.0, None
    
    # Calculate score contribution
    score = rule.score_contribution
    if rule.score_per_unit and isinstance(field_value, (int, float)):
        score += field_value * rule.score_per_unit
    
    if rule.max_contribution:
        score = min(score, rule.max_contribution)
    
    return True, score, rule.force_level


def evaluate_keyword_rules(hazard_descriptions: list[str], config: RiskClassificationConfig) -> float:
    """Evaluate keyword rules against hazard descriptions."""
    if not hazard_descriptions or not config.keyword_rules:
        return 0.0
    
    hazard_text = " ".join(hazard_descriptions).lower()
    total_score = 0.0
    
    for keyword_rule in config.keyword_rules:
        if not keyword_rule.enabled:
            continue
        
        matches = sum(1 for kw in keyword_rule.keywords if kw.lower() in hazard_text)
        if matches > 0:
            rule_score = matches * keyword_rule.score_per_match
            if keyword_rule.max_contribution:
                rule_score = min(rule_score, keyword_rule.max_contribution)
            total_score += rule_score
    
    return total_score


def evaluate_units_sold_thresholds(units_sold: int, config: RiskClassificationConfig) -> float:
    """Evaluate units sold thresholds."""
    if not units_sold or not config.units_sold_thresholds:
        return 0.0
    
    # Find the highest threshold that is met
    for threshold in sorted(config.units_sold_thresholds, key=lambda x: x.threshold, reverse=True):
        if units_sold >= threshold.threshold:
            return threshold.score_contribution
    
    return 0.0


async def calculate_risk_score(
    violation: ProductViolation,
    units_sold: int = 0,
    injuries: int = 0,
    deaths: int = 0,
    incidents: int = 0,
    hazard_descriptions: list[str] = None
) -> float:
    """
    Calculate a numeric risk score from 0.0 to 1.0 using configurable rules.
    
    Args:
        violation: ProductViolation object (for field-based rules)
        units_sold: Number of units sold/distributed
        injuries: Number of reported injuries
        deaths: Number of reported deaths
        incidents: Number of reported incidents
        hazard_descriptions: List of hazard description strings
    
    Returns:
        float: Risk score between 0.0 and 1.0
    """
    config = await get_risk_classification_config()
    score = 0.0
    
    # Evaluate field-based score rules
    for rule in config.score_rules:
        matches, contribution, _ = evaluate_rule(violation, rule, config)
        if matches:
            score += contribution
    
    # Evaluate keyword rules
    if hazard_descriptions:
        score += evaluate_keyword_rules(hazard_descriptions, config)
    
    # Evaluate units sold thresholds
    if units_sold:
        score += evaluate_units_sold_thresholds(units_sold, config)
    
    # Cap at max_total_score
    return min(score, config.max_total_score)


async def classify_risk(
    violation: Optional[ProductViolation] = None,
    units_sold: int = 0,
    injuries: int = 0,
    deaths: int = 0,
    incidents: int = 0,
    hazard_descriptions: list[str] = None
) -> Tuple[RiskLevel, float]:
    """
    Classify a violation's risk level using configurable rules.
    
    Args:
        violation: ProductViolation object (optional, for field-based rules)
        units_sold: Number of units sold/distributed
        injuries: Number of reported injuries
        deaths: Number of reported deaths
        incidents: Number of reported incidents
        hazard_descriptions: List of hazard description strings
    
    Returns:
        Tuple of (RiskLevel, risk_score)
    """
    config = await get_risk_classification_config()
    
    # Create a minimal violation object if not provided (for backward compatibility)
    if violation is None:
        from app.models.violation import ProductViolation
        violation = ProductViolation(
            violation_id="temp",
            violation_number="temp",
            title="",
            url="",
            agency_name="",
            injuries=injuries,
            deaths=deaths,
            incidents=incidents
        )
    
    # Check for force_level rules first (these override score)
    for rule in config.score_rules:
        if not rule.enabled or not rule.force_level:
            continue
        matches, _, forced_level = evaluate_rule(violation, rule, config)
        if matches and forced_level:
            # Find the risk level enum value
            for level_config in config.risk_levels:
                if level_config.name.upper() == forced_level.upper():
                    return RiskLevel(level_config.name.upper()), 0.0
    
    # Calculate numeric score
    score = await calculate_risk_score(
        violation=violation,
        units_sold=units_sold,
        injuries=injuries,
        deaths=deaths,
        incidents=incidents,
        hazard_descriptions=hazard_descriptions
    )
    
    # Map score to risk level based on thresholds
    # Risk levels are sorted by priority (highest first)
    for level_config in config.risk_levels:
        if score >= level_config.score_threshold:
            return RiskLevel(level_config.name.upper()), score
    
    # Fallback to default
    default_level = config.default_risk_level.upper()
    return RiskLevel(default_level), score


async def classify_recall(recall: Recall) -> Recall:
    """
    Classify a recall object and update its risk fields.
    
    Args:
        recall: Recall object to classify
    
    Returns:
        Updated Recall object with risk_level and risk_score
    """
    hazard_descriptions = [h.description for h in recall.hazards]
    
    # Convert recall to violation-like structure for rule evaluation
    from app.models.violation import ProductViolation
    violation = ProductViolation(
        violation_id=recall.recall_id,
        violation_number=recall.recall_number,
        title=recall.title,
        url=recall.source_url or "",
        agency_name=recall.source or "",
        injuries=recall.injuries or 0,
        deaths=recall.deaths or 0,
        incidents=recall.incidents or 0,
        units_affected=recall.units_sold
    )
    
    level, score = await classify_risk(
        violation=violation,
        units_sold=recall.units_sold or 0,
        injuries=recall.injuries or 0,
        deaths=recall.deaths or 0,
        incidents=recall.incidents or 0,
        hazard_descriptions=hazard_descriptions
    )
    
    recall.risk_level = level
    recall.risk_score = score
    
    return recall


async def classify_violation(violation: ProductViolation) -> ProductViolation:
    """
    Classify a violation object and update its risk fields.
    
    Args:
        violation: ProductViolation object to classify
    
    Returns:
        Updated ProductViolation object with risk_level and risk_score
    """
    hazard_descriptions = [h.description for h in violation.hazards]
    
    level, score = await classify_risk(
        violation=violation,
        units_sold=violation.units_affected or 0,
        injuries=violation.injuries or 0,
        deaths=violation.deaths or 0,
        incidents=violation.incidents or 0,
        hazard_descriptions=hazard_descriptions
    )
    
    violation.risk_level = level
    violation.risk_score = score
    
    return violation
