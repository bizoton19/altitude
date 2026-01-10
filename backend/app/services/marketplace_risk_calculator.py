"""
Marketplace Risk Calculator
============================
Calculates risk level for marketplaces based on violation listings found.
"""

from datetime import datetime, timedelta
from typing import List, Optional
from app.models.marketplace import Marketplace, RiskLevel
from app.models.marketplace import MarketplaceListing
from app.services import database as db


class MarketplaceRiskCalculator:
    """Service for calculating marketplace risk levels."""
    
    def __init__(self, lookback_days: int = 30):
        """
        Initialize risk calculator.
        
        Args:
            lookback_days: Number of days to look back for violation listings
        """
        self.lookback_days = lookback_days
    
    async def calculate_risk(
        self, 
        marketplace_id: str,
        lookback_days: Optional[int] = None
    ) -> dict:
        """
        Calculate risk level for a marketplace.
        
        Args:
            marketplace_id: ID of the marketplace
            lookback_days: Override default lookback period
            
        Returns:
            Dictionary with risk_level, violation_listings_count, risk_score, and calculation_date
        """
        days = lookback_days or self.lookback_days
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Get all listings for this marketplace
        all_listings = await db.get_all_listings()
        marketplace_listings = [
            l for l in all_listings 
            if l.marketplace_id == marketplace_id 
            and l.found_at >= cutoff_date
        ]
        
        # Count violation listings
        violation_listings = [
            l for l in marketplace_listings 
            if l.violation_id or l.recall_id
        ]
        
        violation_count = len(violation_listings)
        
        # Calculate risk score (0.0 to 1.0)
        # Factors:
        # - Number of violations found (more = higher risk)
        # - Recency (more recent = higher risk)
        # - Match scores (higher match scores = higher risk)
        
        base_score = min(violation_count / 10.0, 1.0)  # Cap at 1.0 for 10+ violations
        
        # Recency factor (violations found in last 7 days weighted more)
        recent_cutoff = datetime.utcnow() - timedelta(days=7)
        recent_violations = [
            l for l in violation_listings 
            if l.found_at >= recent_cutoff
        ]
        recency_factor = min(len(recent_violations) / 5.0, 1.0)
        
        # Match score factor (average match score)
        if violation_listings:
            avg_match_score = sum(l.match_score for l in violation_listings) / len(violation_listings)
        else:
            avg_match_score = 0.0
        
        # Weighted risk score
        risk_score = (
            base_score * 0.5 +  # Base violation count (50%)
            recency_factor * 0.3 +  # Recency (30%)
            avg_match_score * 0.2  # Match quality (20%)
        )
        
        # Determine risk level
        if risk_score >= 0.7:
            risk_level = RiskLevel.HIGH
        elif risk_score >= 0.4:
            risk_level = RiskLevel.MEDIUM
        elif risk_score > 0:
            risk_level = RiskLevel.LOW
        else:
            risk_level = RiskLevel.UNKNOWN
        
        return {
            "risk_level": risk_level,
            "violation_listings_count": violation_count,
            "risk_score": risk_score,
            "calculation_date": datetime.utcnow(),
            "lookback_days": days,
            "recent_violations": len(recent_violations),
            "avg_match_score": avg_match_score
        }
    
    async def update_marketplace_risk(self, marketplace_id: str) -> dict:
        """
        Calculate and update risk for a marketplace.
        
        Returns:
            Updated risk calculation results
        """
        risk_data = await self.calculate_risk(marketplace_id)
        
        # Update marketplace with new risk data
        await db.update_marketplace(marketplace_id, {
            "risk_level": risk_data["risk_level"],
            "violation_listings_count": risk_data["violation_listings_count"],
            "risk_calculation_date": risk_data["calculation_date"]
        })
        
        return risk_data


# Global instance
risk_calculator = MarketplaceRiskCalculator()



