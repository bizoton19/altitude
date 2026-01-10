"""
Match Analyzer Skill
====================
Internal skill for analyzing if a marketplace listing matches a recall.
Uses text similarity, keyword matching, and optional visual analysis.
"""

from app.models.recall import Recall
from app.models.marketplace import MarketplaceListing
from typing import List, Tuple
import re
from difflib import SequenceMatcher


def text_similarity(text1: str, text2: str) -> float:
    """Calculate text similarity using sequence matching."""
    if not text1 or not text2:
        return 0.0
    return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()


def keyword_overlap(keywords1: List[str], keywords2: List[str]) -> float:
    """Calculate keyword overlap ratio."""
    if not keywords1 or not keywords2:
        return 0.0
    
    set1 = set(k.lower() for k in keywords1)
    set2 = set(k.lower() for k in keywords2)
    
    intersection = set1 & set2
    union = set1 | set2
    
    if not union:
        return 0.0
    
    return len(intersection) / len(union)


def extract_model_numbers(text: str) -> List[str]:
    """Extract potential model numbers from text."""
    if not text:
        return []
    
    # Common model number patterns
    patterns = [
        r'\b[A-Z]{2,5}[-]?\d{3,10}\b',  # XX-12345
        r'\b\d{5,12}\b',                 # 123456789
        r'\b[A-Z]\d{2,4}[A-Z]?\d{2,4}\b',  # A12B34
    ]
    
    model_numbers = []
    for pattern in patterns:
        matches = re.findall(pattern, text.upper())
        model_numbers.extend(matches)
    
    return list(set(model_numbers))


def calculate_match_score(
    recall: Recall,
    listing_title: str,
    listing_description: str = None,
    listing_price: float = None
) -> Tuple[float, List[str]]:
    """
    Calculate how closely a listing matches a recall.
    
    Scoring factors:
    - Product name similarity (0.3 weight)
    - Model number match (0.35 weight - highest for exact matches)
    - Keyword overlap (0.2 weight)
    - Price sanity check (0.15 weight)
    
    Args:
        recall: The recall to match against
        listing_title: Title of the marketplace listing
        listing_description: Optional description text
        listing_price: Optional listing price
    
    Returns:
        Tuple of (match_score 0-1, list of match reasons)
    """
    score = 0.0
    reasons = []
    listing_text = f"{listing_title} {listing_description or ''}".lower()
    
    # Extract recall info
    recall_products = recall.products
    recall_keywords = []
    recall_model_numbers = []
    
    for product in recall_products:
        if product.name:
            recall_keywords.extend(product.name.lower().split())
        if product.model_number:
            recall_model_numbers.append(product.model_number.upper())
    
    # 1. Model number matching (highest weight - exact match indicator)
    listing_model_numbers = extract_model_numbers(listing_text)
    
    for rm in recall_model_numbers:
        if rm in listing_model_numbers:
            score += 0.35
            reasons.append(f"Model number match: {rm}")
            break
        # Partial match (e.g., model number appears in text)
        elif rm.lower() in listing_text:
            score += 0.25
            reasons.append(f"Model number found in text: {rm}")
            break
    
    # 2. Product name similarity
    for product in recall_products:
        if product.name:
            similarity = text_similarity(product.name, listing_title)
            if similarity > 0.5:
                name_score = similarity * 0.3
                score += name_score
                reasons.append(f"Product name similarity: {similarity:.0%}")
                break
    
    # 3. Keyword overlap
    listing_keywords = listing_text.split()
    if recall_keywords and listing_keywords:
        overlap = keyword_overlap(recall_keywords, listing_keywords)
        if overlap > 0.2:
            score += overlap * 0.2
            reasons.append(f"Keyword overlap: {overlap:.0%}")
    
    # 4. Manufacturer mention
    for product in recall_products:
        if product.manufacturer and product.manufacturer.lower() in listing_text:
            score += 0.1
            reasons.append(f"Manufacturer match: {product.manufacturer}")
            break
    
    # 5. Price sanity (unusual if too low, could indicate knockoff/stolen)
    # This is a weak signal, mainly for filtering out obvious non-matches
    if listing_price is not None:
        if listing_price < 5:
            score *= 0.8  # Reduce confidence for very cheap items
        elif listing_price > 0:
            score += 0.05  # Small boost for having a price
    
    # Cap at 1.0
    final_score = min(score, 1.0)
    
    return final_score, reasons


def analyze_match(
    recall: Recall,
    listing: MarketplaceListing,
    sensitivity: float = 0.7
) -> Tuple[bool, float, List[str]]:
    """
    Analyze if a listing is a match for a recall.
    
    Args:
        recall: The recall to check against
        listing: The marketplace listing
        sensitivity: Match threshold (0-1), higher = stricter
    
    Returns:
        Tuple of (is_match, confidence_score, match_reasons)
    """
    score, reasons = calculate_match_score(
        recall=recall,
        listing_title=listing.title,
        listing_description=listing.description,
        listing_price=listing.price
    )
    
    # Adjust threshold based on sensitivity
    threshold = 0.3 + (sensitivity * 0.4)  # Range: 0.3 to 0.7
    
    is_match = score >= threshold
    
    return is_match, score, reasons
