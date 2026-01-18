"""
Import API Router
=================
Endpoints for importing violations and listings from various sources.
Supports manual entry, CSV uploads, text paste, email, and browser extension.
"""

import re
import uuid
import os
import asyncio
import json
import logging
from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any
from urllib.parse import urlparse
from pathlib import Path

import httpx
from dateutil import parser as date_parser
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from pydantic import ValidationError

logger = logging.getLogger(__name__)

from app.config import settings

from app.models.import_models import (
    ImportSource, ImportStatus, ListingImportRequest, ListingImportResult,
    ViolationImportRequest, ViolationImportResult, ImportHistory,
    FilePreviewResult, FieldSchema
)
from app.models.marketplace import MarketplaceListing, Marketplace, MarketplaceStatus
from app.models.product_ban import ProductBanCreate, ProductBan
from app.services import database as db
from app.services.workflow_service import process_violation_import, process_bulk_violation_import
from app.services.api_import_service import (
    fetch_from_organization_api,
    fetch_from_api_url,
    parse_api_response,
    map_api_fields_to_product_ban,
    build_auth_headers
)

router = APIRouter()


# URL extraction helpers
def extract_urls_from_text(text: str) -> List[str]:
    """Extract URLs from text content."""
    # Match URLs (http, https, www)
    url_pattern = re.compile(
        r'https?://(?:[-\w.])+(?:[:\d]+)?(?:/(?:[\w/_.])*)?(?:\?(?:[\w&=%.])*)?(?:#(?:[\w.])*)?',
        re.IGNORECASE
    )
    urls = url_pattern.findall(text)
    
    # Also try to find URLs without protocol
    www_pattern = re.compile(r'www\.(?:[-\w.])+(?:[:\d]+)?(?:/(?:[\w/_.])*)?')
    www_urls = ['https://' + url for url in www_pattern.findall(text)]
    urls.extend(www_urls)
    
    return list(set(urls))  # Remove duplicates


def detect_marketplace_from_url(url: str) -> Optional[str]:
    """Detect marketplace from URL."""
    parsed = urlparse(url)
    domain = parsed.netloc.lower()
    
    marketplace_map = {
        'facebook.com': 'facebook',
        'marketplace.facebook.com': 'facebook',
        'ebay.com': 'ebay',
        'craigslist.org': 'craigslist',
        'offerup.com': 'offerup',
        'mercari.com': 'mercari',
        'poshmark.com': 'poshmark',
        'depop.com': 'depop',
    }
    
    for key, value in marketplace_map.items():
        if key in domain:
            return value
    
    return None


# ============================================
# LISTING IMPORTS (Phase 1: Manual)
# ============================================

@router.post("/listings/bulk", response_model=ListingImportResult)
async def import_listings_bulk(request: ListingImportRequest):
    """
    Import listings from text paste, URLs, or CSV.
    
    Supports:
    - Text paste with URLs (one per line or embedded)
    - Direct URL list
    - CSV upload (for future implementation)
    """
    import_id = f"import-{uuid.uuid4().hex[:12]}"
    created_listings = []
    errors = []
    
    urls_to_process = []
    
    # Collect URLs from various sources
    if request.urls:
        urls_to_process.extend(request.urls)
    
    if request.text_content:
        extracted = extract_urls_from_text(request.text_content)
        urls_to_process.extend(extracted)
    
    # Remove duplicates and validate
    urls_to_process = list(set(urls_to_process))
    
    if not urls_to_process:
        raise HTTPException(
            status_code=400,
            detail="No URLs found in request. Provide 'urls' list or 'text_content' with URLs."
        )
    
    # Process each URL
    for url in urls_to_process:
        try:
            # Validate URL
            parsed = urlparse(url)
            if not parsed.scheme:
                url = 'https://' + url
                parsed = urlparse(url)
            
            if not parsed.netloc:
                errors.append({"item": url, "error": "Invalid URL format"})
                continue
            
            # Detect marketplace
            marketplace_id = detect_marketplace_from_url(url)
            if not marketplace_id:
                # Use generic marketplace if unknown
                marketplace_id = "unknown"
            
            # Get or create marketplace
            marketplace = await db.get_marketplace(marketplace_id)
            if not marketplace:
                # Create a placeholder marketplace
                marketplace = Marketplace(
                    id=marketplace_id,
                    name=marketplace_id.capitalize(),
                    url=parsed.scheme + "://" + parsed.netloc,
                    enabled=True,
                    status=MarketplaceStatus.INACTIVE
                )
                await db.add_marketplace(marketplace)
            
            # Create listing
            listing_id = f"listing-{uuid.uuid4().hex[:12]}"
            listing = MarketplaceListing(
                id=listing_id,
                marketplace_id=marketplace_id,
                marketplace_name=marketplace.name,
                title=f"Imported Listing - {parsed.netloc}",
                description=f"Manually imported from {request.source_name or request.source.value}",
                listing_url=url,
                recall_id=request.recall_id or "",
                violation_id=request.violation_id,
                match_score=0.0,  # Will be analyzed later
                found_at=datetime.utcnow(),
                is_flagged=False,
                is_verified=False
            )
            
            # Save listing
            saved = await db.save_listing(listing)
            created_listings.append(saved.id)
            # Optional: link to investigation session (many-to-many)
            if request.investigation_id:
                await db.link_listing_to_investigation(
                    investigation_id=request.investigation_id,
                    listing_id=saved.id,
                    added_by=None,
                    source=request.source.value,
                    notes=request.notes,
                    metadata={"import_id": import_id, "listing_url": url},
                )
            
        except Exception as e:
            errors.append({"item": url, "error": str(e)})
            continue
    
    # Create import result
    result = ListingImportResult(
        import_id=import_id,
        status=ImportStatus.COMPLETED if not errors else ImportStatus.PARTIAL,
        total_items=len(urls_to_process),
        successful=len(created_listings),
        failed=len(errors),
        skipped=0,
        created_listing_ids=created_listings,
        errors=errors,
        completed_at=datetime.utcnow(),
        source=request.source,
        source_name=request.source_name
    )
    
    # Save to import history
    history = ImportHistory(
        import_id=import_id,
        import_type="listing",
        source=request.source,
        source_name=request.source_name,
        status=result.status,
        total_items=result.total_items,
        successful=result.successful,
        failed=result.failed,
        created_at=datetime.utcnow(),
        completed_at=result.completed_at,
        metadata={"violation_id": request.violation_id, "recall_id": request.recall_id}
    )
    await db.save_import_history(history)
    
    return result


@router.post("/listings/from-extension", response_model=ListingImportResult)
async def import_listing_from_browser_extension(
    url: str = Form(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    image_url: Optional[str] = Form(None),
    violation_id: Optional[str] = Form(None),
    recall_id: Optional[str] = Form(None),
    source_name: Optional[str] = Form("Browser Extension")
):
    """
    Import a single listing from browser extension context menu.
    Phase 4: Browser Extension Support
    """
    request = ListingImportRequest(
        source=ImportSource.BROWSER_EXTENSION,
        violation_id=violation_id,
        recall_id=recall_id,
        urls=[url],
        source_name=source_name
    )
    
    # Override listing details if provided
    result = await import_listings_bulk(request)
    
    # If we have additional details, update the listing
    if result.successful > 0 and (title or description or image_url):
        listing_id = result.created_listing_ids[0]
        listing = await db.get_listing(listing_id)
        if listing:
            if title:
                listing.title = title
            if description:
                listing.description = description
            if image_url:
                listing.image_url = image_url
            await db.save_listing(listing)
    
    return result


# ============================================
# FILE TYPE DETECTION & VALIDATION HELPERS
# ============================================

def validate_file_type(file_type: str) -> bool:
    """Validate that file type is CSV or JSON only."""
    return file_type.lower() in ("csv", "json")


def detect_file_type(
    filename: str,
    content_type: Optional[str],
    user_specified: Optional[str],
    content: bytes
) -> str:
    """
    Detect file type with priority:
    1. user_specified (if provided and valid)
    2. File extension
    3. Content-Type header
    4. Content inspection (try JSON parse, fallback to CSV)
    Returns: "csv" or "json"
    Raises: ValueError if cannot determine or invalid type
    """
    # Priority 1: User specified
    if user_specified:
        user_type = user_specified.lower().strip()
        if validate_file_type(user_type):
            return user_type
        else:
            raise ValueError(f"Invalid file type specified: {user_specified}. Only 'csv' or 'json' are allowed.")
    
    # Priority 2: File extension
    if filename:
        filename_lower = filename.lower()
        if filename_lower.endswith('.csv'):
            return "csv"
        elif filename_lower.endswith('.json'):
            return "json"
    
    # Priority 3: Content-Type header
    if content_type:
        content_type_lower = content_type.lower()
        if 'csv' in content_type_lower or content_type_lower == 'text/csv':
            return "csv"
        elif 'json' in content_type_lower or content_type_lower in ('application/json', 'text/json'):
            return "json"
    
    # Priority 4: Content inspection
    try:
        import json
        # Try to parse as JSON
        content_str = content.decode('utf-8', errors='ignore').strip()
        if content_str:
            json.loads(content_str)
            return "json"
    except (json.JSONDecodeError, UnicodeDecodeError):
        pass
    
    # Default to CSV (most common format)
    # But raise error if we truly can't determine
    if not filename and not content_type:
        raise ValueError("Cannot determine file type. Please specify file_type parameter or use .csv/.json extension.")
    
    return "csv"  # Default fallback


def parse_json_file(
    content: bytes,
    field_mapping: Optional[Dict[str, str]] = None
) -> List[Dict[str, Any]]:
    """
    Parse JSON file and return list of violation objects.
    Handles:
    - Single JSON object
    - JSON array of objects
    - Nested structures (flatten to top level)
    """
    import json
    
    content_str = content.decode('utf-8', errors='ignore').strip()
    if not content_str:
        raise ValueError("Empty JSON file")
    
    try:
        data = json.loads(content_str)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON format: {str(e)}")
    
    items = []
    
    # Handle single object
    if isinstance(data, dict):
        # Check for wrapped arrays
        for key in ["data", "violations", "results", "items", "recalls"]:
            if key in data and isinstance(data[key], list):
                items = data[key]
                break
        
        # If no wrapped array found, treat as single object
        if not items:
            items = [data]
    
    # Handle array of objects
    elif isinstance(data, list):
        items = data
    else:
        raise ValueError(f"JSON file must contain an object or array of objects, got {type(data).__name__}")
    
    # Validate all items are objects
    for i, item in enumerate(items):
        if not isinstance(item, dict):
            raise ValueError(f"Item {i+1} in JSON is not an object, got {type(item).__name__}")
    
    return items


def map_violation_fields(
    source_data: Dict[str, Any],
    field_mapping: Optional[Dict[str, str]] = None,
    auto_detect: bool = True
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Map source fields to ProductBanCreate fields.
    Returns: (mapped_fields, extended_fields)
    - mapped_fields: Fields that match ProductBanCreate schema
    - extended_fields: Fields that go to agency_metadata
    """
    # Standard ProductBanCreate fields
    standard_fields = {
        'ban_number', 'title', 'url', 'agency_name', 'agency_acronym', 'agency_id',
        'description', 'ban_date', 'ban_type', 'units_affected', 'injuries',
        'deaths', 'incidents', 'country', 'region', 'agency_metadata'
    }
    
    # Auto-detection mapping rules (target fields use new names, source fields support both old and new)
    auto_mapping_rules = {
        'ban_number': ['ban_number', 'violation_number', 'recall_number', 'id', 'number', 'violation_id', 'recall_id', 'product_ban_id'],
        'title': ['title', 'name', 'subject'],
        'description': ['description', 'details', 'summary'],
        'ban_date': ['ban_date', 'violation_date', 'recall_date', 'date', 'issued_date', 'published_date'],
        'units_affected': ['units_affected', 'units_sold', 'units', 'quantity', 'units_distributed'],
        'injuries': ['injuries', 'injury_count', 'injured'],
        'deaths': ['deaths', 'death_count', 'fatalities'],
        'incidents': ['incidents', 'incident_count'],
        'country': ['country', 'country_code'],
        'agency_name': ['agency_name', 'agency'],
    }
    
    mapped_fields = {}
    extended_fields = {}
    
    # Apply manual field mapping first if provided
    if field_mapping:
        for source_field, target_field in field_mapping.items():
            if source_field in source_data:
                if target_field in standard_fields:
                    mapped_fields[target_field] = source_data[source_field]
                else:
                    # Map to extended fields if target is not standard
                    extended_fields[target_field] = source_data[source_field]
    
    # Auto-detect remaining fields
    if auto_detect:
        for target_field, possible_names in auto_mapping_rules.items():
            if target_field not in mapped_fields:
                for source_key in source_data.keys():
                    source_key_lower = source_key.lower().replace('_', '').replace('-', '')
                    for possible_name in possible_names:
                        possible_lower = possible_name.lower().replace('_', '').replace('-', '')
                        if source_key_lower == possible_lower or source_key_lower.startswith(possible_lower):
                            mapped_fields[target_field] = source_data[source_key]
                            break
                    if target_field in mapped_fields:
                        break
    
    # Add remaining unmapped fields to extended_fields
    mapped_source_fields = set()
    if field_mapping:
        mapped_source_fields.update(field_mapping.keys())
    
    # Also mark auto-detected fields as mapped
    for source_key in source_data.keys():
        if source_key in mapped_source_fields:
            continue
        source_key_lower = source_key.lower().replace('_', '').replace('-', '')
        for target_field, possible_names in auto_mapping_rules.items():
            for possible_name in possible_names:
                possible_lower = possible_name.lower().replace('_', '').replace('-', '')
                if source_key_lower == possible_lower or source_key_lower.startswith(possible_lower):
                    mapped_source_fields.add(source_key)
                    break
            if source_key in mapped_source_fields:
                break
    
    # Add unmapped fields to extended_fields
    for source_key, source_value in source_data.items():
        if source_key not in mapped_source_fields:
            extended_fields[source_key] = source_value
    
    return mapped_fields, extended_fields


def normalize_violation_field_types(mapped_fields: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize field types to match ProductBanCreate schema.
    Converts:
    - ban_number: int/float -> str (also handles violation_number for backward compatibility)
    - injuries, deaths, incidents: list/str -> int (extracts count)
    - units_affected: str/float -> int
    """
    normalized = mapped_fields.copy()
    
    # Convert ban_number to string (handle both new and old field names)
    if 'ban_number' in normalized:
        val = normalized['ban_number']
        if val is not None:
            normalized['ban_number'] = str(val)
    elif 'violation_number' in normalized:
        # Backward compatibility: convert violation_number to ban_number
        val = normalized['violation_number']
        if val is not None:
            normalized['ban_number'] = str(val)
            del normalized['violation_number']
    
    # Convert injuries to integer (handle lists, strings, etc.)
    if 'injuries' in normalized:
        val = normalized['injuries']
        if isinstance(val, list):
            # If it's a list, try to extract a count or use length
            normalized['injuries'] = len(val) if val else 0
        elif isinstance(val, str):
            # Try to parse string to int, default to 0
            try:
                normalized['injuries'] = int(float(val))
            except (ValueError, TypeError):
                # If string contains "none" or "0", use 0, otherwise try to extract number
                if 'none' in val.lower() or val.strip() == '':
                    normalized['injuries'] = 0
                else:
                    # Try to extract first number from string
                    import re
                    numbers = re.findall(r'\d+', val)
                    normalized['injuries'] = int(numbers[0]) if numbers else 0
        elif isinstance(val, (int, float)):
            normalized['injuries'] = int(val)
        else:
            normalized['injuries'] = 0
    
    # Convert deaths to integer (same logic as injuries)
    if 'deaths' in normalized:
        val = normalized['deaths']
        if isinstance(val, list):
            normalized['deaths'] = len(val) if val else 0
        elif isinstance(val, str):
            try:
                normalized['deaths'] = int(float(val))
            except (ValueError, TypeError):
                if 'none' in val.lower() or val.strip() == '':
                    normalized['deaths'] = 0
                else:
                    import re
                    numbers = re.findall(r'\d+', val)
                    normalized['deaths'] = int(numbers[0]) if numbers else 0
        elif isinstance(val, (int, float)):
            normalized['deaths'] = int(val)
        else:
            normalized['deaths'] = 0
    
    # Convert incidents to integer
    if 'incidents' in normalized:
        val = normalized['incidents']
        if isinstance(val, list):
            normalized['incidents'] = len(val) if val else 0
        elif isinstance(val, str):
            try:
                normalized['incidents'] = int(float(val))
            except (ValueError, TypeError):
                if 'none' in val.lower() or val.strip() == '':
                    normalized['incidents'] = 0
                else:
                    import re
                    numbers = re.findall(r'\d+', val)
                    normalized['incidents'] = int(numbers[0]) if numbers else 0
        elif isinstance(val, (int, float)):
            normalized['incidents'] = int(val)
        else:
            normalized['incidents'] = 0
    
    # Convert units_affected to integer
    if 'units_affected' in normalized and normalized['units_affected'] is not None:
        val = normalized['units_affected']
        if isinstance(val, str):
            try:
                # Remove commas and parse
                val_clean = val.replace(',', '').strip()
                normalized['units_affected'] = int(float(val_clean))
            except (ValueError, TypeError):
                normalized['units_affected'] = None
        elif isinstance(val, float):
            normalized['units_affected'] = int(val)
        elif isinstance(val, int):
            normalized['units_affected'] = val
    
    return normalized


def detect_field_type(value: Any) -> str:
    """
    Detect the data type of a field value.
    Returns: "string", "integer", "float", "date", "list", "object", "boolean", "null"
    """
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, int):
        return "integer"
    if isinstance(value, float):
        return "float"
    if isinstance(value, list):
        return "list"
    if isinstance(value, dict):
        return "object"
    if isinstance(value, str):
        # Try to detect number in string first (before date, as numbers are more common)
        try:
            float(value)
            # Check if it's a valid date-like string (avoid false positives like "1000", "500")
            # Only consider it a date if it has date-like separators or is a common date format
            if any(char in value for char in ['-', '/', 'T', ':']) or len(value) >= 8:
                from dateutil import parser as date_parser
                try:
                    date_parser.parse(value)
                    return "date"
                except (ValueError, TypeError):
                    pass
            # Otherwise, it's a number
            if '.' in value:
                return "float"
            return "integer"
        except (ValueError, TypeError):
            pass
        # Try to detect date for non-numeric strings
        from dateutil import parser as date_parser
        try:
            date_parser.parse(value)
            return "date"
        except (ValueError, TypeError):
            pass
        return "string"
    return "string"


def analyze_field_schema(field_name: str, values: List[Any]) -> FieldSchema:
    """
    Analyze a field and return its schema.
    """
    # Detect type from sample values
    detected_types = [detect_field_type(v) for v in values if v is not None]
    if detected_types:
        # Use most common type, or "string" if mixed
        type_counts = {}
        for t in detected_types:
            type_counts[t] = type_counts.get(t, 0) + 1
        detected_type = max(type_counts.items(), key=lambda x: x[1])[0]
        if len(set(detected_types)) > 1:
            # Mixed types, default to string
            detected_type = "string"
    else:
        detected_type = "string"
    
    # Get sample values (first 3 non-null values)
    sample_values = [v for v in values[:10] if v is not None][:3]
    
    # Suggest target field using auto-mapping rules with fuzzy matching (target fields use new names)
    auto_mapping_rules = {
        'ban_number': ['ban_number', 'violation_number', 'recall_number', 'id', 'number', 'violation_id', 'recall_id', 'product_ban_id', 'ban_id', 'recall_num'],
        'title': ['title', 'name', 'subject', 'product_name', 'product_title'],
        'description': ['description', 'details', 'summary', 'notes', 'comment'],
        'ban_date': ['ban_date', 'violation_date', 'recall_date', 'date', 'issued_date', 'published_date', 'announcement_date', 'effective_date'],
        'units_affected': ['units_affected', 'units_sold', 'units', 'quantity', 'units_distributed', 'total_units', 'units_recalled'],
        'injuries': ['injuries', 'injury_count', 'injured', 'injury', 'injuries_reported'],
        'deaths': ['deaths', 'death_count', 'fatalities', 'fatal', 'deaths_reported'],
        'incidents': ['incidents', 'incident_count', 'incident', 'incidents_reported'],
        'country': ['country', 'country_code', 'nation', 'location_country'],
        'region': ['region', 'state', 'province', 'territory', 'area'],
        'agency_name': ['agency_name', 'agency', 'regulatory_agency', 'issuing_agency', 'authority'],
        'agency_acronym': ['agency_acronym', 'acronym', 'agency_code', 'agency_abbreviation'],
        'url': ['url', 'link', 'source_url', 'reference_url', 'announcement_url'],
    }
    
    suggested_target = None
    suggested_data_type = None
    field_name_lower = field_name.lower().replace('_', '').replace('-', '').replace(' ', '')
    best_match_score = 0.0
    
    # Use fuzzy matching with similarity scoring
    from difflib import SequenceMatcher
    
    for target_field, possible_names in auto_mapping_rules.items():
        for possible_name in possible_names:
            possible_lower = possible_name.lower().replace('_', '').replace('-', '').replace(' ', '')
            
            # Exact match
            if field_name_lower == possible_lower:
                suggested_target = target_field
                best_match_score = 1.0
                break
            
            # Contains match (partial)
            if field_name_lower in possible_lower or possible_lower in field_name_lower:
                score = SequenceMatcher(None, field_name_lower, possible_lower).ratio()
                if score > best_match_score and score >= 0.6:  # 60% similarity threshold
                    best_match_score = score
                    suggested_target = target_field
            
            # Similarity match
            score = SequenceMatcher(None, field_name_lower, possible_lower).ratio()
            if score > best_match_score and score >= 0.7:  # 70% similarity threshold for non-contains matches
                best_match_score = score
                suggested_target = target_field
        
        if suggested_target and best_match_score >= 0.9:  # High confidence, stop early
            break
    
    # Set suggested data type if we found a match
    if suggested_target:
        if suggested_target in ['ban_number', 'title', 'url', 'description', 'country', 'region', 'agency_name', 'agency_acronym']:
            suggested_data_type = 'string'
        elif suggested_target in ['injuries', 'deaths', 'incidents', 'units_affected']:
            suggested_data_type = 'integer'
        elif suggested_target == 'ban_date':
            suggested_data_type = 'date'
    
    return FieldSchema(
        field_name=field_name,
        detected_type=detected_type,
        sample_values=sample_values,
        suggested_target=suggested_target,
        suggested_data_type=suggested_data_type
    )


def get_suggested_mappings(fields: List[FieldSchema]) -> Dict[str, str]:
    """
    Get suggested field mappings based on auto-detection.
    """
    mappings = {}
    for field in fields:
        if field.suggested_target:
            mappings[field.field_name] = field.suggested_target
    return mappings


# ============================================
# VIOLATION IMPORTS (Flexible File Import)
# ============================================

@router.post("/violations/file/preview", response_model=FilePreviewResult)
async def preview_violations_file(
    file: UploadFile = File(...),
    file_type: Optional[str] = Form(None),
    delimiter: Optional[str] = Form(","),
    has_header: Optional[str] = Form("true"),
    use_llm_mapping: Optional[str] = Form("false")
):
    """
    Preview a file and return schema information for field mapping.
    Parses the file but does NOT import any data.
    Returns field schemas, sample rows, and suggested mappings.
    """
    import csv
    import json
    
    try:
        # Convert string booleans to actual booleans
        has_header_bool = has_header and has_header.lower() in ("true", "1", "yes") if has_header else True
        csv_delimiter = delimiter or ","
        
        # Read file content
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        
        # Detect file type
        try:
            detected_type = detect_file_type(
                filename=file.filename or "",
                content_type=file.content_type,
                user_specified=file_type,
                content=content
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        # Parse file based on type
        rows = []
        
        if detected_type == "json":
            try:
                json_items = parse_json_file(content, None)
                rows = json_items
            except ValueError as e:
                raise HTTPException(status_code=400, detail=f"JSON parsing error: {str(e)}")
        
        elif detected_type == "csv":
            try:
                content_str = content.decode('utf-8', errors='replace')
                if has_header_bool:
                    csv_reader = csv.DictReader(
                        content_str.splitlines(),
                        delimiter=csv_delimiter
                    )
                    rows = list(csv_reader)
                else:
                    csv_reader = csv.reader(content_str.splitlines(), delimiter=csv_delimiter)
                    csv_rows = list(csv_reader)
                    if csv_rows:
                        headers = [f"column_{i+1}" for i in range(len(csv_rows[0]))]
                        rows = [dict(zip(headers, row)) for row in csv_rows]
                    else:
                        rows = []
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"CSV parsing error: {str(e)}")
        
        if not rows:
            raise HTTPException(status_code=400, detail="No rows found in file")
        
        # Get all field names from all rows
        all_fields = set()
        for row in rows:
            all_fields.update(row.keys())
        
        # Analyze each field
        field_schemas = []
        for field_name in sorted(all_fields):
            values = [row.get(field_name) for row in rows if field_name in row]
            schema = analyze_field_schema(field_name, values)
            field_schemas.append(schema)
        
        # Get sample rows (first 5)
        sample_rows = rows[:5]
        
        # Get suggested mappings - use LLM if requested and available
        use_llm = use_llm_mapping and use_llm_mapping.lower() in ("true", "1", "yes")
        if use_llm:
            try:
                from app.services.llm_field_mapper import llm_map_fields, fuzzy_map_fields
                
                # Prepare target fields list
                target_fields = [
                    {'value': 'ban_number', 'label': 'Ban Number', 'category': 'core'},
                    {'value': 'title', 'label': 'Title', 'category': 'core'},
                    {'value': 'url', 'label': 'URL', 'category': 'core'},
                    {'value': 'description', 'label': 'Description', 'category': 'core'},
                    {'value': 'ban_date', 'label': 'Ban Date', 'category': 'core'},
                    {'value': 'units_affected', 'label': 'Units Affected', 'category': 'core'},
                    {'value': 'injuries', 'label': 'Injuries', 'category': 'core'},
                    {'value': 'deaths', 'label': 'Deaths', 'category': 'core'},
                    {'value': 'incidents', 'label': 'Incidents', 'category': 'core'},
                    {'value': 'country', 'label': 'Country', 'category': 'core'},
                    {'value': 'region', 'label': 'Region', 'category': 'core'},
                    {'value': 'agency_name', 'label': 'Agency Name', 'category': 'core'},
                    {'value': 'agency_acronym', 'label': 'Agency Acronym', 'category': 'core'},
                    {'value': 'agency_id', 'label': 'Agency ID', 'category': 'core'},
                    {'value': 'hazards', 'label': 'Hazards (Array/JSON)', 'category': 'hazards'},
                    {'value': 'hazard_description', 'label': 'Hazard Description', 'category': 'hazards'},
                    {'value': 'hazard_type', 'label': 'Hazard Type', 'category': 'hazards'},
                    {'value': 'images', 'label': 'Images (Array/JSON)', 'category': 'images'},
                    {'value': 'image_url', 'label': 'Image URL', 'category': 'images'},
                    {'value': 'remedies', 'label': 'Remedies (Array/JSON)', 'category': 'remedies'},
                    {'value': 'remedy_description', 'label': 'Remedy Description', 'category': 'remedies'},
                ]
                
                # Prepare source fields for LLM
                source_fields_for_llm = [
                    {
                        'field_name': schema.field_name,
                        'detected_type': schema.detected_type,
                        'sample_values': schema.sample_values or []
                    }
                    for schema in field_schemas
                ]
                
                # Get sample data for context
                sample_data = sample_rows[0] if sample_rows else None
                
                # Use LLM to map fields
                llm_mappings = await llm_map_fields(
                    source_fields=source_fields_for_llm,
                    target_fields=target_fields,
                    sample_data=sample_data,
                    model="gpt-3.5-turbo"  # Use cheaper model
                )
                
                # Merge with fuzzy matches for fields LLM didn't map
                fuzzy_mappings = get_suggested_mappings(field_schemas)
                suggested_mappings = {**fuzzy_mappings, **llm_mappings}
            except Exception as e:
                print(f"Error using LLM mapping, falling back to fuzzy matching: {e}")
                suggested_mappings = get_suggested_mappings(field_schemas)
        else:
            # Use improved fuzzy matching
            suggested_mappings = get_suggested_mappings(field_schemas)
        
        return FilePreviewResult(
            file_type=detected_type,
            total_rows=len(rows),
            fields=field_schemas,
            sample_rows=sample_rows,
            detected_mappings=suggested_mappings
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error previewing file: {str(e)}")


async def process_violation_file_background(
    file_path: str,
    import_id: str,
    file_type: str,
    delimiter: str,
    has_header: bool,
    field_mapping: Optional[Dict[str, str]],
    custom_field_mapping: Optional[Dict[str, str]],
    agency_name: Optional[str],
    agency_id: Optional[str],
    organization_id: Optional[str],
    organization_name: Optional[str],
    organization_type: Optional[str],
    is_joint_recall: Optional[bool],
    joint_organization_id: Optional[str],
    joint_organization_name: Optional[str],
    auto_classify_risk: bool,
    auto_investigate: bool,
    source_name: Optional[str]
):
    """
    Background task to process violation file.
    Processes in batches for better performance and memory usage.
    """
    import csv
    import json
    
    batch_size = 50  # Process 50 violations at a time
    max_concurrent = 15  # Limit concurrent database operations (PostgreSQL can handle more)
    created_violations = []
    errors = []
    
    # Semaphore to limit concurrent database operations
    semaphore = asyncio.Semaphore(max_concurrent)
    
    async def process_with_semaphore(row, row_index):
        """Process a single row with semaphore to limit concurrency."""
        async with semaphore:
            return await process_single_violation_row(
                row, row_index, field_mapping, custom_field_mapping, file_type, delimiter,
                agency_name, agency_id, organization_id, organization_name, organization_type,
                is_joint_recall, joint_organization_id, joint_organization_name,
                auto_classify_risk, auto_investigate, source_name
            )
    
    try:
        # Update status to PROCESSING
        history = await db.get_import_history_item(import_id)
        if history:
            history.status = ImportStatus.PROCESSING
            history.items_processed = 0
            history.progress = 0.0
            await db.save_import_history(history)
        
        # Read and parse file
        with open(file_path, 'rb') as f:
            content = f.read()
        
        # Parse file based on type
        rows = []
        if file_type == "json":
            json_items = parse_json_file(content, field_mapping)
            rows = json_items
        elif file_type == "csv":
            content_str = content.decode('utf-8', errors='replace')
            if has_header:
                csv_reader = csv.DictReader(content_str.splitlines(), delimiter=delimiter)
                rows = list(csv_reader)
            else:
                csv_reader = csv.reader(content_str.splitlines(), delimiter=delimiter)
                csv_rows = list(csv_reader)
                if csv_rows:
                    headers = [f"column_{i+1}" for i in range(len(csv_rows[0]))]
                    rows = [dict(zip(headers, row)) for row in csv_rows]
        
        total_rows = len(rows)
        
        # Update total items
        if history:
            history.total_items = total_rows
            await db.save_import_history(history)
        
        # Process in batches
        for batch_start in range(0, total_rows, batch_size):
            batch_end = min(batch_start + batch_size, total_rows)
            batch = rows[batch_start:batch_end]
            
            # Process batch with concurrency limit
            batch_tasks = []
            for i, row in enumerate(batch):
                row_index = batch_start + i
                batch_tasks.append(process_with_semaphore(row, row_index))
            
            # Wait for batch to complete
            batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
            
            # Collect results
            for result in batch_results:
                if isinstance(result, Exception):
                    errors.append({"item": f"Row {batch_start + batch_results.index(result) + 1}", "error": str(result)})
                elif isinstance(result, dict):
                    if "error" in result:
                        errors.append(result)
                    else:
                        created_violations.append(result.get("violation_id"))
            
            # Update progress
            if history:
                history.items_processed = batch_end
                history.successful = len(created_violations)
                history.failed = len(errors)
                history.progress = batch_end / total_rows if total_rows > 0 else 1.0
                await db.save_import_history(history)
        
        # Finalize
        history = await db.get_import_history_item(import_id)
        if history:
            history.status = ImportStatus.COMPLETED if not errors else ImportStatus.PARTIAL
            history.completed_at = datetime.utcnow()
            history.successful = len(created_violations)
            history.failed = len(errors)
            history.progress = 1.0
            
            # Store error summary (first 10 errors as sample)
            if errors:
                error_samples = errors[:10]
                error_summary_parts = [f"{err.get('item', 'Unknown')}: {err.get('error', 'Unknown error')}" for err in error_samples]
                if len(errors) > 10:
                    error_summary_parts.append(f"... and {len(errors) - 10} more errors")
                history.error_summary = "\n".join(error_summary_parts)
            
            await db.save_import_history(history)
        
    except Exception as e:
        # Mark as failed
        history = await db.get_import_history_item(import_id)
        if history:
            history.status = ImportStatus.FAILED
            history.error_summary = str(e)
            history.completed_at = datetime.utcnow()
            await db.save_import_history(history)
    finally:
        # Clean up file
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except:
            pass


async def process_single_violation_row(
    row: Dict[str, Any],
    row_index: int,
    field_mapping: Optional[Dict[str, str]],
    custom_field_mapping: Optional[Dict[str, str]],
    file_type: str,
    delimiter: str,
    agency_name: Optional[str],
    agency_id: Optional[str],
    organization_id: Optional[str],
    organization_name: Optional[str],
    organization_type: Optional[str],
    is_joint_recall: Optional[bool],
    joint_organization_id: Optional[str],
    joint_organization_name: Optional[str],
    auto_classify_risk: bool,
    auto_investigate: bool,
    source_name: Optional[str]
) -> Dict[str, Any]:
    """Process a single violation row and return result or error."""
    try:
        # Debug logging for first row
        if row_index == 0:
            print(f"[DEBUG] Processing row {row_index + 1}")
            print(f"[DEBUG] custom_field_mapping type: {type(custom_field_mapping)}, value: {custom_field_mapping}")
            print(f"[DEBUG] field_mapping type: {type(field_mapping)}, value: {field_mapping}")
        
        if not isinstance(row, dict):
            return {"error": "Invalid format: must be an object/dict", "item": f"Row {row_index + 1}"}
        
        # Map fields
        mapped_fields, extended_fields = map_violation_fields(
            source_data=row,
            field_mapping=field_mapping,
            auto_detect=True
        )
        
        # Normalize field types
        mapped_fields = normalize_violation_field_types(mapped_fields)
        
        # Ensure required fields
        if 'violation_number' not in mapped_fields:
            mapped_fields['violation_number'] = f"FILE-{file_type.upper()}-{row_index+1}"
        if 'title' not in mapped_fields:
            mapped_fields['title'] = f"Imported Violation {row_index+1}"
        if 'url' not in mapped_fields:
            mapped_fields['url'] = ""
        
        # Set organization/agency information (support both legacy and new fields)
        # organization_name is REQUIRED by ViolationCreate, so always set it
        mapped_fields['organization_name'] = organization_name or agency_name or mapped_fields.get('organization_name') or mapped_fields.get('agency_name') or 'Unknown Organization'
        
        if organization_id:
            mapped_fields['organization_id'] = organization_id
        if organization_type:
            mapped_fields['organization_type'] = organization_type
        if is_joint_recall:
            mapped_fields['is_joint_recall'] = is_joint_recall
        if joint_organization_id:
            mapped_fields['joint_organization_id'] = joint_organization_id
        if joint_organization_name:
            mapped_fields['joint_organization_name'] = joint_organization_name
        
        # Legacy agency fields (for backward compatibility) - also REQUIRED
        mapped_fields['agency_name'] = organization_name or agency_name or mapped_fields.get('agency_name') or mapped_fields.get('organization_name') or 'Unknown Organization'
        if organization_id or agency_id:
            mapped_fields['agency_id'] = organization_id or agency_id
        
        # Process custom field mappings (add to agency_metadata with custom names)
        if custom_field_mapping and isinstance(custom_field_mapping, dict):
            if 'agency_metadata' not in mapped_fields:
                mapped_fields['agency_metadata'] = {}
            for source_field, custom_field_name in custom_field_mapping.items():
                # Check both in row and in mapped_fields (in case it was already mapped)
                if source_field in row:
                    mapped_fields['agency_metadata'][custom_field_name] = row[source_field]
                elif source_field in mapped_fields:
                    # If already mapped, move it to custom field
                    mapped_fields['agency_metadata'][custom_field_name] = mapped_fields.pop(source_field)
                
                # Add extended fields to agency_metadata
                if extended_fields:
                    if 'agency_metadata' not in mapped_fields:
                        mapped_fields['agency_metadata'] = {}
                    mapped_fields['agency_metadata'].update(extended_fields)
                
        # Extract hazards, images, and remedies from mapped fields
        hazards = []
        images = []
        remedies = []
        
        # Process hazards (can be array/JSON or individual fields)
        if 'hazards' in mapped_fields:
            hazards_data = mapped_fields.pop('hazards')
            if isinstance(hazards_data, (list, str)):
                # Parse JSON string if needed
                if isinstance(hazards_data, str):
                    try:
                        hazards_data = json.loads(hazards_data)
                    except:
                        hazards_data = [{"description": hazards_data}]
                if isinstance(hazards_data, list):
                    for h in hazards_data:
                        if isinstance(h, dict):
                            hazards.append(h)
                        else:
                            hazards.append({"description": str(h)})
        else:
            # Check for individual hazard fields
            hazard_desc = mapped_fields.pop('hazard_description', None)
            if hazard_desc:
                hazards.append({
                    "description": str(hazard_desc),
                    "hazard_type": mapped_fields.pop('hazard_type', None),
                    "severity": mapped_fields.pop('hazard_severity', None)
                })
        
        # Process images (can be array/JSON or individual fields)
        if 'images' in mapped_fields:
            images_data = mapped_fields.pop('images')
            if isinstance(images_data, (list, str)):
                if isinstance(images_data, str):
                    try:
                        images_data = json.loads(images_data)
                    except:
                        images_data = [{"url": images_data}]
                if isinstance(images_data, list):
                    for img in images_data:
                        if isinstance(img, dict):
                            images.append(img)
                        else:
                            images.append({"url": str(img)})
        else:
            # Check for individual image fields
            image_url = mapped_fields.pop('image_url', None)
            if image_url:
                images.append({
                    "url": str(image_url),
                    "caption": mapped_fields.pop('image_caption', None),
                    "alt_text": mapped_fields.pop('image_alt_text', None)
                })
        
        # Process remedies (can be array/JSON or individual fields)
        if 'remedies' in mapped_fields:
            remedies_data = mapped_fields.pop('remedies')
            if isinstance(remedies_data, (list, str)):
                if isinstance(remedies_data, str):
                    try:
                        remedies_data = json.loads(remedies_data)
                    except:
                        remedies_data = [{"description": remedies_data}]
                if isinstance(remedies_data, list):
                    for r in remedies_data:
                        if isinstance(r, dict):
                            remedies.append(r)
                        else:
                            remedies.append({"description": str(r)})
        else:
            # Check for individual remedy fields
            remedy_desc = mapped_fields.pop('remedy_description', None)
            if remedy_desc:
                remedies.append({
                    "description": str(remedy_desc),
                    "remedy_type": mapped_fields.pop('remedy_type', None),
                    "action_required": mapped_fields.pop('remedy_action_required', None)
                })
        
        # Filter to only ProductBanCreate allowed fields (handle both old and new field names)
        product_ban_create_fields = {
            'ban_number', 'title', 'url', 'agency_name', 'agency_acronym', 'agency_id',
            'organization_id', 'organization_name', 'organization_type',
            'is_voluntary_recall', 'is_joint_recall',
            'joint_organization_id', 'joint_organization_name',
            'description', 'ban_date', 'ban_type', 'units_affected', 'injuries',
            'deaths', 'incidents', 'country', 'region', 'agency_metadata',
            # Backward compatibility fields
            'violation_number', 'violation_date', 'violation_type'
        }
        filtered_fields = {k: v for k, v in mapped_fields.items() if k in product_ban_create_fields}
        
        # Convert old field names to new ones for backward compatibility
        if 'violation_number' in filtered_fields and 'ban_number' not in filtered_fields:
            filtered_fields['ban_number'] = filtered_fields.pop('violation_number')
        if 'violation_date' in filtered_fields and 'ban_date' not in filtered_fields:
            filtered_fields['ban_date'] = filtered_fields.pop('violation_date')
        if 'violation_type' in filtered_fields and 'ban_type' not in filtered_fields:
            filtered_fields['ban_type'] = filtered_fields.pop('violation_type')
        
        # Create ProductBanCreate
        product_ban_create = ProductBanCreate(**filtered_fields)
        
        # Convert hazards, images, remedies to Pydantic models
        from app.models.product_ban import ProductBanHazard, ProductBanImage, ProductBanRemedy
        
        hazard_models = []
        for h in hazards:
            try:
                hazard_models.append(ProductBanHazard(**h))
            except Exception as e:
                # If validation fails, create with just description
                hazard_models.append(ProductBanHazard(description=str(h.get('description', h))))
        
        image_models = []
        for img in images:
            try:
                if 'url' in img:
                    image_models.append(ProductBanImage(**img))
                elif isinstance(img, str):
                    image_models.append(ProductBanImage(url=img))
            except Exception as e:
                pass  # Skip invalid images
        
        remedy_models = []
        for r in remedies:
            try:
                remedy_models.append(ProductBanRemedy(**r))
            except Exception as e:
                # If validation fails, create with just description
                remedy_models.append(ProductBanRemedy(description=str(r.get('description', r))))
        
        # Create ProductBan directly with hazards, images, remedies
        product_ban_id = f"{product_ban_create.agency_acronym or 'BAN'}-{product_ban_create.ban_number}"
        from app.models.product_ban import ProductBan, BanType
        from datetime import datetime
        
        product_ban = ProductBan(
            product_ban_id=product_ban_id,
            ban_number=product_ban_create.ban_number,
            title=product_ban_create.title,
            url=product_ban_create.url,
            organization_name=product_ban_create.organization_name,
            organization_id=product_ban_create.organization_id,
            organization_type=product_ban_create.organization_type,
            agency_name=product_ban_create.agency_name,
            agency_acronym=product_ban_create.agency_acronym,
            agency_id=product_ban_create.agency_id,
            joint_organization_name=product_ban_create.joint_organization_name,
            joint_organization_id=product_ban_create.joint_organization_id,
            is_voluntary_recall=product_ban_create.is_voluntary_recall,
            is_joint_recall=product_ban_create.is_joint_recall,
            description=product_ban_create.description,
            ban_date=product_ban_create.ban_date,
            ban_type=product_ban_create.ban_type or BanType.RECALL,
            units_affected=product_ban_create.units_affected,
            injuries=product_ban_create.injuries,
            deaths=product_ban_create.deaths,
            incidents=product_ban_create.incidents,
            country=product_ban_create.country,
            region=product_ban_create.region,
            agency_metadata=product_ban_create.agency_metadata or {},
            hazards=hazard_models,
            images=image_models,
            remedies=remedy_models,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        
        # Auto-classify if enabled
        if auto_classify_risk:
            from app.skills.risk_classifier import classify_violation
            product_ban = await classify_violation(product_ban)
        
        # Save to database (this will create related records)
        from app.services import database as db
        product_ban = await db.add_violation(product_ban)
        
        # Create investigation if needed
        if auto_investigate and product_ban.risk_level.value == "HIGH":
            from app.services.workflow_service import create_investigation_for_violation
            await create_investigation_for_violation(
                violation_id=product_ban.product_ban_id,  # TODO: Rename parameter
                auto_schedule=True,
                created_by="system"
            )
        
        return {"violation_id": product_ban.product_ban_id, "product_ban_id": product_ban.product_ban_id}  # Backward compatibility
        
    except ValidationError as e:
        error_details = []
        for err in e.errors():
            field = err.get('loc', ['unknown'])[-1] if err.get('loc') else 'unknown'
            msg = err.get('msg', 'Validation error')
            error_details.append(f"{field}: {msg}")
        error_msg = "; ".join(error_details)
        print(f"[ERROR] Validation error on row {row_index + 1}: {error_msg}")
        print(f"[ERROR] Full validation errors: {e.errors()}")
        return {"error": error_msg, "item": f"Row {row_index + 1}"}
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"[ERROR] Exception on row {row_index + 1}: {error_msg}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return {"error": error_msg, "item": f"Row {row_index + 1}"}


@router.post("/violations/file", response_model=ViolationImportResult)
async def import_violations_from_file(
    file: UploadFile = File(...),
    file_type: Optional[str] = Form(None),
    delimiter: Optional[str] = Form(","),
    has_header: Optional[str] = Form("true"),
    field_mapping: Optional[str] = Form(None),
    custom_field_mapping: Optional[str] = Form(None),
    agency_name: Optional[str] = Form(None),
    agency_id: Optional[str] = Form(None),
    organization_id: Optional[str] = Form(None),
    organization_name: Optional[str] = Form(None),
    organization_type: Optional[str] = Form(None),
    is_joint_recall: Optional[str] = Form("false"),
    joint_organization_id: Optional[str] = Form(None),
    joint_organization_name: Optional[str] = Form(None),
    auto_classify_risk: Optional[str] = Form("true"),
    auto_investigate: Optional[str] = Form("true"),
    source_name: Optional[str] = Form(None),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Import violations from file (CSV or JSON) - Streaming upload with background processing.
    
    This endpoint:
    1. Streams file to disk (handles GB-sized files efficiently)
    2. Returns immediately with import_id for polling
    3. Processes file in background with batch processing
    4. Updates progress in real-time
    
    Features:
    - Auto-detects file type (extension, Content-Type, or content inspection)
    - Validates only CSV/JSON files are accepted
    - Supports field mapping (auto-detect or manual)
    - Extended fields are stored in agency_metadata
    - Processes violations through workflow service in batches
    """
    import json
    
    import_id = f"import-{uuid.uuid4().hex[:12]}"
    
    # Ensure upload directory exists
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Convert string booleans to actual booleans
    has_header_bool = has_header and has_header.lower() in ("true", "1", "yes") if has_header else True
    auto_classify_bool = auto_classify_risk and auto_classify_risk.lower() in ("true", "1", "yes") if auto_classify_risk else True
    auto_investigate_bool = auto_investigate and auto_investigate.lower() in ("true", "1", "yes") if auto_investigate else True
    csv_delimiter = delimiter or ","
    
    # Parse field mapping if provided
    mapping_dict = None
    if field_mapping:
        try:
            mapping_dict = json.loads(field_mapping)
        except (json.JSONDecodeError, TypeError) as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid field_mapping JSON: {str(e)}"
            )
    
    # Parse custom field mapping
    custom_field_mapping_dict = None
    if custom_field_mapping:
        try:
            custom_field_mapping_dict = json.loads(custom_field_mapping)
        except (json.JSONDecodeError, TypeError) as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid custom_field_mapping JSON: {str(e)}"
            )
    
    # Stream file to disk (don't load into memory)
    file_path = upload_dir / f"{import_id}_{file.filename or 'upload'}"
    
    try:
        # Stream file in chunks to disk
        total_size = 0
        max_size = settings.UPLOAD_MAX_SIZE_MB * 1024 * 1024  # Convert MB to bytes
        
        with open(file_path, 'wb') as f:
            while True:
                chunk = await file.read(8192)  # 8KB chunks
                if not chunk:
                    break
                total_size += len(chunk)
                if total_size > max_size:
                    os.remove(file_path)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large. Maximum size is {settings.UPLOAD_MAX_SIZE_MB}MB"
                    )
                f.write(chunk)
        
        if total_size == 0:
            os.remove(file_path)
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        
        # Read a small sample to detect file type
        with open(file_path, 'rb') as f:
            sample = f.read(min(1024, total_size))  # Read first 1KB for detection
        
        # Detect file type
        try:
            detected_type = detect_file_type(
                filename=file.filename or "",
                content_type=file.content_type,
                user_specified=file_type,
                content=sample
            )
        except ValueError as e:
            os.remove(file_path)
            raise HTTPException(status_code=400, detail=str(e))
        
        # Create import history with PENDING status
        try:
            history = ImportHistory(
                import_id=import_id,
                import_type="violation",
                source=ImportSource.CSV_UPLOAD if detected_type == "csv" else ImportSource.MANUAL,
                source_name=source_name or f"{detected_type.upper()} File Upload",
                status=ImportStatus.PENDING,
                total_items=0,
                successful=0,
                failed=0,
                items_processed=0,
                progress=0.0,
                created_at=datetime.utcnow()
            )
            await db.save_import_history(history)
        except Exception as e:
            # Log error but continue - background task will create history if needed
            print(f"Warning: Failed to create import history: {e}")
        
        # Parse organization fields
        is_joint_recall_bool = is_joint_recall and is_joint_recall.lower() in ("true", "1", "yes") if is_joint_recall else False
        
        # Schedule background processing
        background_tasks.add_task(
            process_violation_file_background,
            str(file_path),
            import_id,
            detected_type,
            csv_delimiter,
            has_header_bool,
            mapping_dict,
            custom_field_mapping_dict,
            agency_name,
            agency_id,
            organization_id,
            organization_name,
            organization_type,
            is_joint_recall_bool,
            joint_organization_id,
            joint_organization_name,
            auto_classify_bool,
            auto_investigate_bool,
            source_name
        )
        
        # Return immediately with import_id for polling
        return ViolationImportResult(
            import_id=import_id,
            status=ImportStatus.PENDING,
            total_items=0,
            successful=0,
            failed=0,
            skipped=0,
            created_violation_ids=[],
            errors=[],
            completed_at=None,
            source=ImportSource.CSV_UPLOAD if detected_type == "csv" else ImportSource.MANUAL,
            source_name=source_name or f"{detected_type.upper()} File Upload"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        # Clean up file on error
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")


# ============================================
# IMPORT HISTORY
# ============================================

@router.post("/violations/workflow")
async def import_violation_workflow(
    violation_data: ProductBanCreate,  # Updated from ViolationCreate
    source: ImportSource = ImportSource.MANUAL,
    source_name: Optional[str] = None,
    auto_classify: bool = True,
    auto_investigate: bool = True
):
    """
    Complete workflow endpoint: Import → Save → Classify → Schedule Investigation.
    Returns violation, classification results, and investigation if created.
    """
    result = await process_violation_import(
        violation_data=violation_data,
        source=source,
        source_name=source_name,
        auto_classify=auto_classify,
        auto_investigate=auto_investigate,
        created_by="system"
    )
    
    return {
        "import_id": result["import_id"],
        "violation": result["violation"],
        "risk_level": result["risk_level"],
        "risk_score": result["risk_score"],
        "investigation": result.get("investigation"),
        "investigation_id": result.get("investigation_id"),
    }


@router.get("/history")
async def get_import_history(
    import_type: Optional[str] = None,  # "listing" or "violation"
    source: Optional[ImportSource] = None,
    limit: int = 50,
    offset: int = 0
):
    """Get import history."""
    history = await db.get_import_history(import_type, source, limit, offset)
    return history


@router.get("/history/{import_id}")
async def get_import_details(import_id: str):
    """Get details of a specific import."""
    history = await db.get_import_history_item(import_id)
    if not history:
        raise HTTPException(status_code=404, detail="Import not found")
    return history


# ============================================
# PHASE 2: PROGRAMMATIC IMPORTS
# ============================================

@router.post("/violations/api", response_model=ViolationImportResult)
async def import_violations_from_api(request: ViolationImportRequest):
    """
    Import violations from a REST API endpoint (manual API import).
    Enhanced to use field mapping and workflow service.
    Phase 2: Programmatic Import
    """
    import_id = f"import-{uuid.uuid4().hex[:12]}"
    created_violations = []
    errors = []
    
    if not request.api_url:
        raise HTTPException(status_code=400, detail="api_url is required")
    
    # Get organization if provided
    organization = None
    if request.agency_name or request.agency_id:
        # Try to find organization by agency name/id
        try:
            orgs = await db.get_organizations()
            for org in orgs:
                if org.organization_id == request.agency_id or org.name == request.agency_name:
                    organization = org
                    break
        except:
            pass
    
    # Create a minimal organization object if not found
    if not organization:
        from app.models.organization import Organization, OrganizationType
        organization = Organization(
            organization_id=request.agency_id or f"org-{uuid.uuid4().hex[:8]}",
            organization_type=OrganizationType.REGULATORY_AGENCY,
            name=request.agency_name or "Unknown Organization",
            acronym=None,
            api_enabled=False
        )
    
    try:
        # Prepare request
        headers = request.api_headers or {}
        basic_auth = None
        
        if request.api_auth:
            auth_type = request.api_auth.get("type", "bearer")
            token = request.api_auth.get("token")
            headers, basic_auth = build_auth_headers(auth_type, token, headers)
        
        # Fetch data from API using service
        items = await fetch_from_api_url(
            url=str(request.api_url),
            method=request.api_method,
            headers=headers,
            auth_type=request.api_auth.get("type", "none") if request.api_auth else "none",
            basic_auth=basic_auth,
            params=None,
            timeout=30.0
        )
        
        if not items:
            return ViolationImportResult(
                import_id=import_id,
                status=ImportStatus.COMPLETED,
                total_items=0,
                successful=0,
                failed=0,
                skipped=0,
                created_violation_ids=[],
                errors=[],
                completed_at=datetime.utcnow(),
                source=ImportSource.API,
                source_name=request.source_name or str(request.api_url)
            )
        
        # Parse field mapping if provided
        mapping_dict = request.field_mapping or {}
        
        # Process each item through workflow service
        for i, item in enumerate(items):
            try:
                # Map API fields to ProductBanCreate
                product_ban_create = await map_api_fields_to_product_ban(
                    item=item,
                    organization=organization,
                    field_mapping=mapping_dict
                )
                
                # Process through workflow service
                result = await process_violation_import(
                    violation_data=product_ban_create,
                    source=ImportSource.API,
                    source_name=request.source_name or str(request.api_url),
                    auto_classify=request.auto_classify_risk,
                    auto_investigate=True,
                    created_by="system"
                )
                
                created_violations.append(result["product_ban_id"])
                
            except Exception as e:
                logger.error(f"Failed to import item {i+1} from API: {e}")
                errors.append({"item": f"Item {i+1}", "error": str(e)})
                continue
        
        result = ViolationImportResult(
            import_id=import_id,
            status=ImportStatus.COMPLETED if not errors else ImportStatus.PARTIAL,
            total_items=len(items),
            successful=len(created_violations),
            failed=len(errors),
            skipped=0,
            created_violation_ids=created_violations,
            errors=errors,
            completed_at=datetime.utcnow(),
            source=ImportSource.API,
            source_name=request.source_name or str(request.api_url)
        )
        
        # Save to history
        history = ImportHistory(
            import_id=import_id,
            import_type="product_ban",
            source=ImportSource.API,
            source_name=request.source_name or str(request.api_url),
            status=result.status,
            total_items=result.total_items,
            successful=result.successful,
            failed=result.failed,
            created_at=datetime.utcnow(),
            completed_at=result.completed_at,
            metadata={"api_url": str(request.api_url), "api_method": request.api_method}
        )
        await db.save_import_history(history)
        
        return result
        
    except httpx.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"API request failed: {str(e)}")
    except Exception as e:
        logger.error(f"Failed to import from API: {e}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.post("/violations/api/organization/{organization_id}", response_model=ViolationImportResult)
async def import_violations_from_organization_api(
    organization_id: str,
    auto_classify: bool = True,
    auto_investigate: bool = True,
    field_mapping: Optional[str] = None,
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Import product bans from an organization's configured API endpoint.
    Uses organization's stored API configuration (endpoint, auth, headers).
    """
    import_id = f"import-{uuid.uuid4().hex[:12]}"
    created_violations = []
    errors = []
    
    # Parse field mapping if provided
    mapping_dict = None
    if field_mapping:
        try:
            mapping_dict = json.loads(field_mapping)
        except (json.JSONDecodeError, TypeError) as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid field_mapping JSON: {str(e)}"
            )
    
    try:
        # Get organization
        organization = await db.get_organization(organization_id)
        if not organization:
            raise HTTPException(status_code=404, detail=f"Organization {organization_id} not found")
        
        if not organization.api_endpoint:
            raise HTTPException(status_code=400, detail=f"Organization {organization_id} does not have API endpoint configured")
        
        if not organization.api_enabled:
            raise HTTPException(status_code=400, detail=f"API import is not enabled for organization {organization_id}")
        
        # Fetch data from API
        items = await fetch_from_organization_api(organization_id)
        
        if not items:
            return ViolationImportResult(
                import_id=import_id,
                status=ImportStatus.COMPLETED,
                total_items=0,
                successful=0,
                failed=0,
                skipped=0,
                created_violation_ids=[],
                errors=[],
                completed_at=datetime.utcnow(),
                source=ImportSource.API,
                source_name=organization.name or f"Organization {organization_id} API"
            )
        
        # Process each item through workflow service
        for i, item in enumerate(items):
            try:
                # Map API fields to ProductBanCreate
                product_ban_create = await map_api_fields_to_product_ban(
                    item=item,
                    organization=organization,
                    field_mapping=mapping_dict
                )
                
                # Process through workflow service
                result = await process_product_ban_import(
                    product_ban_data=product_ban_create,
                    source=ImportSource.API,
                    source_name=organization.name or f"Organization {organization_id} API",
                    auto_classify=auto_classify,
                    auto_investigate=auto_investigate,
                    created_by="system"
                )
                
                created_violations.append(result["product_ban_id"])
                
            except Exception as e:
                logger.error(f"Failed to import item {i+1} from organization API: {e}")
                errors.append({"item": f"Item {i+1}", "error": str(e)})
                continue
        
        # Create result
        result = ViolationImportResult(
            import_id=import_id,
            status=ImportStatus.COMPLETED if not errors else ImportStatus.PARTIAL,
            total_items=len(items),
            successful=len(created_violations),
            failed=len(errors),
            skipped=0,
            created_violation_ids=created_violations,
            errors=errors,
            completed_at=datetime.utcnow(),
            source=ImportSource.API,
            source_name=organization.name or f"Organization {organization_id} API"
        )
        
        # Save to history
        history = ImportHistory(
            import_id=import_id,
            import_type="product_ban",
            source=ImportSource.API,
            source_name=organization.name or f"Organization {organization_id} API",
            status=result.status,
            total_items=result.total_items,
            successful=result.successful,
            failed=result.failed,
            created_at=datetime.utcnow(),
            completed_at=result.completed_at,
            metadata={
                "organization_id": organization_id,
                "api_endpoint": organization.api_endpoint,
                "api_method": organization.api_method
            }
        )
        await db.save_import_history(history)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to import from organization API: {e}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.get("/violations/api/test/{organization_id}")
async def test_organization_api_connection(organization_id: str):
    """
    Test connection to an organization's configured API endpoint.
    Returns sample data and field information for mapping.
    """
    try:
        # Get organization
        organization = await db.get_organization(organization_id)
        if not organization:
            raise HTTPException(status_code=404, detail=f"Organization {organization_id} not found")
        
        if not organization.api_endpoint:
            raise HTTPException(status_code=400, detail=f"Organization {organization_id} does not have API endpoint configured")
        
        # Fetch sample data (just first few items)
        items = await fetch_from_organization_api(organization_id)
        
        if not items:
            return {
                "connected": True,
                "sample_data": None,
                "fields": [],
                "message": "API connection successful but no data returned"
            }
        
        # Get first item as sample
        sample_item = items[0] if items else {}
        
        # Analyze fields from sample item
        fields = []
        if isinstance(sample_item, dict):
            for key, value in sample_item.items():
                from app.routers.imports import detect_field_type
                field_type = detect_field_type(value)
                fields.append({
                    "field_name": key,
                    "detected_type": field_type,
                    "sample_value": value if not isinstance(value, (dict, list)) else str(value)[:50]
                })
        
        return {
            "connected": True,
            "sample_data": sample_item,
            "fields": fields,
            "total_items": len(items),
            "organization_name": organization.name,
            "api_endpoint": organization.api_endpoint,
            "api_method": organization.api_method or "GET"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to test organization API connection: {e}")
        return {
            "connected": False,
            "error": str(e),
            "sample_data": None,
            "fields": []
        }


@router.post("/violations/database", response_model=ViolationImportResult)
async def import_violations_from_database(request: ViolationImportRequest):
    """
    Import violations from a database connection.
    Phase 2: Programmatic Import
    
    Note: Full database import requires database-specific drivers.
    This is a placeholder implementation.
    """
    import_id = f"import-{uuid.uuid4().hex[:12]}"
    
    if not request.db_connection_string:
        raise HTTPException(status_code=400, detail="db_connection_string is required")
    
    if not request.db_query and not request.db_table:
        raise HTTPException(status_code=400, detail="db_query or db_table is required")
    
    # TODO: Implement database connection and query execution
    # This would require:
    # - SQLAlchemy or asyncpg for async database access
    # - Connection pooling
    # - Query execution
    # - Result parsing
    
    raise HTTPException(
        status_code=501,
        detail="Database import not yet implemented. Requires database driver configuration."
    )

