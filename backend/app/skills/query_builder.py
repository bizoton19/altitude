"""
Query Builder Skill
===================
Internal skill for building search queries from recall data.
Extracts product names, model numbers, and key identifiers.
"""

from app.models.recall import Recall
from typing import List
import re


def extract_keywords(text: str) -> List[str]:
    """Extract meaningful keywords from text."""
    if not text:
        return []
    
    # Remove common stop words
    stop_words = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
        "be", "have", "has", "had", "do", "does", "did", "will", "would",
        "could", "should", "may", "might", "can", "this", "that", "these",
        "those", "it", "its", "they", "their", "them", "which", "who", "whom"
    }
    
    # Extract words
    words = re.findall(r'\b[a-zA-Z0-9]+\b', text.lower())
    
    # Filter and return unique keywords
    keywords = [w for w in words if w not in stop_words and len(w) > 2]
    return list(dict.fromkeys(keywords))  # Preserve order, remove duplicates


def build_search_query(
    recall: Recall,
    include_model_number: bool = True,
    include_manufacturer: bool = True,
    max_keywords: int = 5
) -> str:
    """
    Build an optimized search query from recall data.
    
    Prioritizes:
    1. Product name
    2. Model number (if available)
    3. Manufacturer name
    4. Key descriptive terms
    
    Args:
        recall: Recall object to build query from
        include_model_number: Whether to include model numbers
        include_manufacturer: Whether to include manufacturer name
        max_keywords: Maximum number of keywords to include
    
    Returns:
        Search query string optimized for marketplace search
    """
    query_parts = []
    
    # Add product names
    for product in recall.products:
        if product.name:
            # Clean up product name
            name = product.name.strip()
            # Remove recall-specific phrases
            name = re.sub(r'\brecalled?\b', '', name, flags=re.IGNORECASE)
            if name:
                query_parts.append(name)
        
        # Add model number
        if include_model_number and product.model_number:
            query_parts.append(f'"{product.model_number}"')
        
        # Add manufacturer
        if include_manufacturer and product.manufacturer:
            query_parts.append(product.manufacturer)
    
    # If no products, extract from title
    if not query_parts and recall.title:
        keywords = extract_keywords(recall.title)[:max_keywords]
        query_parts.extend(keywords)
    
    # Build final query
    if not query_parts:
        return recall.title[:100]  # Fallback to truncated title
    
    # Take top parts based on priority
    query = " ".join(query_parts[:max_keywords])
    
    # Limit total length for API compatibility
    if len(query) > 150:
        query = query[:147] + "..."
    
    return query.strip()


def build_search_variants(recall: Recall) -> List[str]:
    """
    Build multiple search query variants for broader coverage.
    
    Returns:
        List of query variants to try
    """
    variants = []
    
    # Primary query - full details
    primary = build_search_query(recall, include_model_number=True, include_manufacturer=True)
    if primary:
        variants.append(primary)
    
    # Simplified - product name only
    for product in recall.products:
        if product.name:
            variants.append(product.name)
    
    # Model number only (exact match)
    for product in recall.products:
        if product.model_number:
            variants.append(f'"{product.model_number}"')
    
    # UPC if available
    for product in recall.products:
        if product.upc:
            variants.append(product.upc)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_variants = []
    for v in variants:
        if v.lower() not in seen:
            seen.add(v.lower())
            unique_variants.append(v)
    
    return unique_variants[:5]  # Max 5 variants
