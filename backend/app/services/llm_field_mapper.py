"""
LLM-Powered Field Mapping Service
==================================
Uses OpenAI API to intelligently map source fields to target fields.
Supports fuzzy matching and semantic understanding.
"""

import os
from typing import List, Dict, Any, Optional
from difflib import SequenceMatcher
import httpx
from app.config import settings


def similarity_score(a: str, b: str) -> float:
    """Calculate similarity score between two strings (0-1)."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def fuzzy_match_field(
    source_field: str,
    target_fields: List[Dict[str, str]],
    threshold: float = 0.3
) -> Optional[str]:
    """
    Fuzzy match a source field to target fields using string similarity.
    Returns the best matching target field value if similarity > threshold.
    
    Args:
        source_field: Source field name to match
        target_fields: List of {value, label} dicts for target fields
        threshold: Minimum similarity score (0-1) to consider a match
    
    Returns:
        Target field value if match found, None otherwise
    """
    source_lower = source_field.lower().replace('_', '').replace('-', '').replace(' ', '')
    best_match = None
    best_score = 0.0
    
    for target in target_fields:
        target_value = target.get('value', '')
        target_label = target.get('label', '')
        
        # Check both value and label
        for candidate in [target_value, target_label]:
            candidate_lower = candidate.lower().replace('_', '').replace('-', '').replace(' ', '')
            
            # Exact match
            if source_lower == candidate_lower:
                return target_value
            
            # Partial match (contains)
            if source_lower in candidate_lower or candidate_lower in source_lower:
                score = similarity_score(source_field, candidate)
                if score > best_score:
                    best_score = score
                    best_match = target_value
            
            # Similarity match
            score = similarity_score(source_field, candidate)
            if score > best_score:
                best_score = score
                best_match = target_value
    
    return best_match if best_score >= threshold else None


async def llm_map_fields(
    source_fields: List[Dict[str, Any]],
    target_fields: List[Dict[str, str]],
    sample_data: Optional[Dict[str, Any]] = None,
    model: str = "gpt-3.5-turbo"
) -> Dict[str, str]:
    """
    Use OpenAI LLM to intelligently map source fields to target fields.
    
    Args:
        source_fields: List of source field info with name, type, sample values
        target_fields: List of target fields with value and label
        sample_data: Optional sample row data for context
        model: OpenAI model to use (default: gpt-3.5-turbo for cost efficiency)
    
    Returns:
        Dictionary mapping source_field_name -> target_field_value
    """
    openai_api_key = os.getenv("OPENAI_API_KEY") or settings.OPENAI_API_KEY if hasattr(settings, 'OPENAI_API_KEY') else None
    
    if not openai_api_key:
        # Fallback to fuzzy matching if no API key
        return fuzzy_map_fields(source_fields, target_fields)
    
    # Build prompt for LLM
    source_fields_desc = []
    for field in source_fields:
        field_name = field.get('field_name', '')
        field_type = field.get('detected_type', 'unknown')
        samples = field.get('sample_values', [])[:3]
        samples_str = ', '.join([str(s)[:50] for s in samples if s is not None])
        source_fields_desc.append(f"- {field_name} ({field_type}): {samples_str}")
    
    target_fields_desc = []
    for field in target_fields:
        value = field.get('value', '')
        label = field.get('label', '')
        category = field.get('category', '')
        target_fields_desc.append(f"- {value} ({label}) [{category}]")
    
    prompt = f"""You are a data mapping expert. Map source fields to target fields for product ban data import.

SOURCE FIELDS:
{chr(10).join(source_fields_desc)}

TARGET FIELDS (Product Ban Schema):
{chr(10).join(target_fields_desc)}

Rules:
1. Map fields based on semantic meaning, not just name similarity
2. Consider field types and sample values
3. For dates: look for date-like fields (ban_date, violation_date, recall_date, date, issued_date, published_date)
4. For numbers: look for count fields (injuries, deaths, incidents, units_affected)
5. For text: look for descriptive fields (title, description, name)
6. If no good match exists, return null for that field
7. Return ONLY a JSON object with source_field_name -> target_field_value mappings
8. Use the target field "value" (not label) in your response

Example response format:
{{
  "source_field_1": "ban_number",
  "source_field_2": "title",
  "source_field_3": null
}}

Return the mapping as JSON:"""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openai_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a data mapping assistant. Return only valid JSON."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 0.3,  # Lower temperature for more consistent mapping
                    "max_tokens": 1000
                }
            )
            
            if response.status_code != 200:
                error_text = response.text
                print(f"OpenAI API error: {response.status_code} - {error_text}")
                # Fallback to fuzzy matching
                return fuzzy_map_fields(source_fields, target_fields)
            
            result = response.json()
            content = result.get("choices", [{}])[0].get("message", {}).get("content", "{}")
            
            # Parse JSON response
            import json
            try:
                mappings = json.loads(content.strip())
                # Validate mappings
                validated = {}
                target_values = {f['value'] for f in target_fields}
                for source_field, target_field in mappings.items():
                    if target_field is None:
                        continue
                    if target_field in target_values:
                        validated[source_field] = target_field
                    else:
                        # Try fuzzy match if LLM returned invalid target
                        fuzzy_match = fuzzy_match_field(source_field, target_fields)
                        if fuzzy_match:
                            validated[source_field] = fuzzy_match
                
                return validated
            except json.JSONDecodeError as e:
                print(f"Failed to parse LLM response as JSON: {e}")
                print(f"Response content: {content}")
                # Fallback to fuzzy matching
                return fuzzy_map_fields(source_fields, target_fields)
    
    except Exception as e:
        print(f"Error calling OpenAI API: {e}")
        # Fallback to fuzzy matching
        return fuzzy_map_fields(source_fields, target_fields)


def fuzzy_map_fields(
    source_fields: List[Dict[str, Any]],
    target_fields: List[Dict[str, str]]
) -> Dict[str, str]:
    """
    Fallback fuzzy matching when LLM is not available.
    Uses string similarity to match fields.
    """
    mappings = {}
    
    for source_field in source_fields:
        source_name = source_field.get('field_name', '')
        if not source_name:
            continue
        
        # Try fuzzy match
        match = fuzzy_match_field(source_name, target_fields, threshold=0.4)
        if match:
            mappings[source_name] = match
    
    return mappings
