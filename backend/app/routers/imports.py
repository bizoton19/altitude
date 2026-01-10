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
from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any
from urllib.parse import urlparse
from pathlib import Path

import httpx
from dateutil import parser as date_parser
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from pydantic import ValidationError

from app.config import settings

from app.models.import_models import (
    ImportSource, ImportStatus, ListingImportRequest, ListingImportResult,
    ViolationImportRequest, ViolationImportResult, ImportHistory,
    FilePreviewResult, FieldSchema
)
from app.models.marketplace import MarketplaceListing, Marketplace, MarketplaceStatus
from app.models.violation import ViolationCreate, ProductViolation
from app.services import database as db
from app.services.workflow_service import process_violation_import, process_bulk_violation_import

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
    Map source fields to ViolationCreate fields.
    Returns: (mapped_fields, extended_fields)
    - mapped_fields: Fields that match ViolationCreate schema
    - extended_fields: Fields that go to agency_metadata
    """
    # Standard ViolationCreate fields
    standard_fields = {
        'violation_number', 'title', 'url', 'agency_name', 'agency_acronym', 'agency_id',
        'description', 'violation_date', 'violation_type', 'units_affected', 'injuries',
        'deaths', 'incidents', 'country', 'region', 'agency_metadata'
    }
    
    # Auto-detection mapping rules
    auto_mapping_rules = {
        'violation_number': ['violation_number', 'recall_number', 'id', 'number', 'violation_id', 'recall_id'],
        'title': ['title', 'name', 'subject'],
        'description': ['description', 'details', 'summary'],
        'violation_date': ['violation_date', 'recall_date', 'date', 'issued_date', 'published_date'],
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
    Normalize field types to match ViolationCreate schema.
    Converts:
    - violation_number: int/float -> str
    - injuries, deaths, incidents: list/str -> int (extracts count)
    - units_affected: str/float -> int
    """
    normalized = mapped_fields.copy()
    
    # Convert violation_number to string
    if 'violation_number' in normalized:
        val = normalized['violation_number']
        if val is not None:
            normalized['violation_number'] = str(val)
    
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
    
    # Suggest target field using auto-mapping rules
    auto_mapping_rules = {
        'violation_number': ['violation_number', 'recall_number', 'id', 'number', 'violation_id', 'recall_id'],
        'title': ['title', 'name', 'subject'],
        'description': ['description', 'details', 'summary'],
        'violation_date': ['violation_date', 'recall_date', 'date', 'issued_date', 'published_date'],
        'units_affected': ['units_affected', 'units_sold', 'units', 'quantity', 'units_distributed'],
        'injuries': ['injuries', 'injury_count', 'injured'],
        'deaths': ['deaths', 'death_count', 'fatalities'],
        'incidents': ['incidents', 'incident_count'],
        'country': ['country', 'country_code'],
        'agency_name': ['agency_name', 'agency'],
    }
    
    suggested_target = None
    suggested_data_type = None
    field_name_lower = field_name.lower().replace('_', '').replace('-', '')
    
    for target_field, possible_names in auto_mapping_rules.items():
        for possible_name in possible_names:
            possible_lower = possible_name.lower().replace('_', '').replace('-', '')
            if field_name_lower == possible_lower or field_name_lower.startswith(possible_lower):
                suggested_target = target_field
                # Suggest data type based on target field
                if target_field in ['violation_number', 'title', 'url', 'description', 'country', 'region']:
                    suggested_data_type = 'string'
                elif target_field in ['injuries', 'deaths', 'incidents', 'units_affected']:
                    suggested_data_type = 'integer'
                elif target_field == 'violation_date':
                    suggested_data_type = 'date'
                break
        if suggested_target:
            break
    
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
    has_header: Optional[str] = Form("true")
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
        
        # Get suggested mappings
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
        
        # Filter to only ViolationCreate allowed fields
        violation_create_fields = {
            'violation_number', 'title', 'url', 'agency_name', 'agency_acronym', 'agency_id',
            'organization_id', 'organization_name', 'organization_type',
            'is_voluntary_recall', 'is_joint_recall',
            'joint_organization_id', 'joint_organization_name',
            'description', 'violation_date', 'violation_type', 'units_affected', 'injuries',
            'deaths', 'incidents', 'country', 'region', 'agency_metadata'
        }
        filtered_fields = {k: v for k, v in mapped_fields.items() if k in violation_create_fields}
        
        # Create ViolationCreate
        violation_create = ViolationCreate(**filtered_fields)
        
        # Convert hazards, images, remedies to Pydantic models
        from app.models.violation import ViolationHazard, ViolationImage, ViolationRemedy
        
        hazard_models = []
        for h in hazards:
            try:
                hazard_models.append(ViolationHazard(**h))
            except Exception as e:
                # If validation fails, create with just description
                hazard_models.append(ViolationHazard(description=str(h.get('description', h))))
        
        image_models = []
        for img in images:
            try:
                if 'url' in img:
                    image_models.append(ViolationImage(**img))
                elif isinstance(img, str):
                    image_models.append(ViolationImage(url=img))
            except Exception as e:
                pass  # Skip invalid images
        
        remedy_models = []
        for r in remedies:
            try:
                remedy_models.append(ViolationRemedy(**r))
            except Exception as e:
                # If validation fails, create with just description
                remedy_models.append(ViolationRemedy(description=str(r.get('description', r))))
        
        # Create ProductViolation directly with hazards, images, remedies
        violation_id = f"{violation_create.agency_acronym or 'VIOL'}-{violation_create.violation_number}"
        from app.models.violation import ProductViolation, ViolationType
        from datetime import datetime
        
        violation = ProductViolation(
            violation_id=violation_id,
            violation_number=violation_create.violation_number,
            title=violation_create.title,
            url=violation_create.url,
            organization_name=violation_create.organization_name,
            organization_id=violation_create.organization_id,
            organization_type=violation_create.organization_type,
            agency_name=violation_create.agency_name,
            agency_acronym=violation_create.agency_acronym,
            agency_id=violation_create.agency_id,
            joint_organization_name=violation_create.joint_organization_name,
            joint_organization_id=violation_create.joint_organization_id,
            is_voluntary_recall=violation_create.is_voluntary_recall,
            is_joint_recall=violation_create.is_joint_recall,
            description=violation_create.description,
            violation_date=violation_create.violation_date,
            violation_type=violation_create.violation_type or ViolationType.RECALL,
            units_affected=violation_create.units_affected,
            injuries=violation_create.injuries,
            deaths=violation_create.deaths,
            incidents=violation_create.incidents,
            country=violation_create.country,
            region=violation_create.region,
            agency_metadata=violation_create.agency_metadata or {},
            hazards=hazard_models,
            images=image_models,
            remedies=remedy_models,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        
        # Auto-classify if enabled
        if auto_classify_risk:
            from app.skills.risk_classifier import classify_violation
            violation = await classify_violation(violation)
        
        # Save to database (this will create related records)
        from app.services import database as db
        violation = await db.add_violation(violation)
        
        # Create investigation if needed
        if auto_investigate and violation.risk_level.value == "HIGH":
            from app.services.workflow_service import create_investigation_for_violation
            await create_investigation_for_violation(
                violation_id=violation.violation_id,
                auto_schedule=True,
                created_by="system"
            )
        
        return {"violation_id": violation.violation_id}
        
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
    violation_data: ViolationCreate,
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
    Import violations from a REST API endpoint.
    Phase 2: Programmatic Import
    """
    import_id = f"import-{uuid.uuid4().hex[:12]}"
    created_violations = []
    errors = []
    
    if not request.api_url:
        raise HTTPException(status_code=400, detail="api_url is required")
    
    try:
        # Prepare request
        headers = request.api_headers or {}
        if request.api_auth:
            auth_type = request.api_auth.get("type", "bearer")
            token = request.api_auth.get("token")
            if auth_type == "bearer" and token:
                headers["Authorization"] = f"Bearer {token}"
            elif auth_type == "basic":
                # Basic auth handled by httpx
                pass
        
        # Make API request
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=request.api_method,
                url=str(request.api_url),
                headers=headers,
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
        
        # Handle different response formats
        items = []
        if isinstance(data, list):
            items = data
        elif isinstance(data, dict):
            # Try common keys
            for key in ["data", "results", "items", "recalls", "violations"]:
                if key in data and isinstance(data[key], list):
                    items = data[key]
                    break
            if not items:
                items = [data]  # Single object
        
        # Process each item
        for i, item in enumerate(items):
            try:
                # Try to extract violation data (basic mapping)
                violation_data = {
                    "violation_number": item.get("violation_number") or item.get("recall_number") or item.get("id") or f"API-{i+1}",
                    "title": item.get("title") or item.get("name") or f"Imported Violation {i+1}",
                    "description": item.get("description") or item.get("details") or "",
                    "agency_name": request.agency_name or item.get("agency") or item.get("agency_name") or "Unknown",
                    "violation_type": item.get("violation_type") or "RECALL",
                    "units_affected": item.get("units_affected") or item.get("units_sold") or item.get("units") or 0,
                    "injuries": item.get("injuries") or 0,
                    "deaths": item.get("deaths") or 0,
                    "incidents": item.get("incidents") or 0,
                    "country": item.get("country") or "US"
                }
                
                # Parse date if provided
                if "violation_date" in item or "recall_date" in item or "date" in item:
                    date_str = item.get("violation_date") or item.get("recall_date") or item.get("date")
                    try:
                        violation_data["violation_date"] = date_parser.parse(date_str)
                    except:
                        pass
                
                violation_create = ViolationCreate(**violation_data)
                violation = await db.add_violation_from_create(violation_create)
                
                # Auto-classify if requested
                if request.auto_classify_risk:
                    violation = db.classify_violation(violation)
                    violation = await db.update_violation(violation)
                
                created_violations.append(violation.violation_id)
                
            except Exception as e:
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
            import_type="violation",
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
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


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

