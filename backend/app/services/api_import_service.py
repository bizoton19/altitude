"""
API Import Service
==================
Service for importing product bans from external REST APIs.
Supports organization-based configurations and manual API imports.
"""

import asyncio
import logging
import uuid
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
import httpx
from dateutil import parser as date_parser

from app.services import database as db
from app.services.credential_encryption import credential_encryption
from app.models.product_ban import ProductBanCreate
from app.models.organization import Organization

logger = logging.getLogger(__name__)


def build_auth_headers(api_auth_type: str, api_key: Optional[str], api_headers: Dict[str, str]) -> Tuple[Dict[str, str], Optional[Tuple[str, str]]]:
    """
    Build authentication headers and basic auth tuple.
    Returns: (headers_dict, basic_auth_tuple_or_none)
    """
    headers = api_headers.copy() if api_headers else {}
    basic_auth = None
    
    if api_auth_type == "bearer" and api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    elif api_auth_type == "basic" and api_key:
        # Basic auth: api_key should be "username:password"
        try:
            username, password = api_key.split(":", 1)
            basic_auth = (username, password)
        except ValueError:
            # If not in username:password format, use as password with empty username
            basic_auth = ("", api_key)
    elif api_auth_type == "api_key" and api_key:
        # API key in custom header (default X-API-Key, can be configured)
        headers["X-API-Key"] = api_key
    
    return headers, basic_auth


async def fetch_from_organization_api(
    organization_id: str,
    params: Optional[Dict[str, Any]] = None,
    timeout: float = 30.0
) -> List[Dict[str, Any]]:
    """
    Fetch data from an organization's configured API endpoint.
    
    Args:
        organization_id: Organization ID
        params: Optional query parameters
        timeout: Request timeout in seconds
        
    Returns:
        List of items from API response
        
    Raises:
        ValueError: If organization not found or API not configured
        httpx.HTTPError: If API request fails
    """
    # Get organization
    organization = await db.get_organization(organization_id)
    if not organization:
        raise ValueError(f"Organization {organization_id} not found")
    
    if not organization.api_endpoint:
        raise ValueError(f"Organization {organization_id} does not have API endpoint configured")
    
    if not organization.api_enabled:
        raise ValueError(f"API import is not enabled for organization {organization_id}")
    
    # Decrypt API key if present
    api_key = None
    if organization.api_key:
        try:
            api_key = credential_encryption.decrypt_string(organization.api_key)
        except Exception as e:
            logger.warning(f"Failed to decrypt API key for organization {organization_id}: {e}")
    
    # Build headers and auth
    headers, basic_auth = build_auth_headers(
        organization.api_auth_type or "none",
        api_key,
        organization.api_headers or {}
    )
    
    # Make API request
    url = organization.api_endpoint
    method = organization.api_method or "GET"
    
    return await fetch_from_api_url(
        url=url,
        method=method,
        headers=headers,
        auth_type=organization.api_auth_type or "none",
        basic_auth=basic_auth,
        params=params,
        timeout=timeout
    )


async def fetch_from_api_url(
    url: str,
    method: str = "GET",
    headers: Optional[Dict[str, str]] = None,
    auth_type: str = "none",
    basic_auth: Optional[Tuple[str, str]] = None,
    params: Optional[Dict[str, Any]] = None,
    timeout: float = 30.0,
    max_retries: int = 3
) -> List[Dict[str, Any]]:
    """
    Fetch data from an API URL with retry logic.
    
    Args:
        url: API URL
        method: HTTP method (GET, POST, etc.)
        headers: HTTP headers
        auth_type: Authentication type (for logging)
        basic_auth: Tuple of (username, password) for basic auth
        params: Query parameters (for GET) or body (for POST)
        timeout: Request timeout in seconds
        max_retries: Maximum number of retry attempts
        
    Returns:
        List of items from API response
        
    Raises:
        httpx.HTTPError: If API request fails after retries
    """
    headers = headers or {}
    
    last_error = None
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient() as client:
                # Prepare request
                request_kwargs = {
                    "method": method,
                    "url": url,
                    "headers": headers,
                    "timeout": timeout,
                }
                
                # Add auth
                if basic_auth:
                    request_kwargs["auth"] = basic_auth
                
                # Add params or json body
                if params:
                    if method.upper() == "GET":
                        request_kwargs["params"] = params
                    else:
                        request_kwargs["json"] = params
                
                response = await client.request(**request_kwargs)
                
                # Handle rate limiting
                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", 60))
                    if attempt < max_retries - 1:
                        logger.warning(f"Rate limited. Retrying after {retry_after} seconds...")
                        await asyncio.sleep(retry_after)
                        continue
                
                response.raise_for_status()
                data = response.json()
                
                # Parse response into list of items
                return parse_api_response(data)
                
        except httpx.HTTPStatusError as e:
            last_error = e
            if e.response.status_code in (429, 500, 502, 503, 504) and attempt < max_retries - 1:
                # Retry on rate limit or server errors
                wait_time = 2 ** attempt  # Exponential backoff
                logger.warning(f"API request failed with status {e.response.status_code}. Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
                continue
            raise
        except (httpx.TimeoutException, httpx.NetworkError) as e:
            last_error = e
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                logger.warning(f"Network error: {e}. Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
                continue
            raise
        except Exception as e:
            last_error = e
            logger.error(f"Unexpected error in API request: {e}")
            raise
    
    # If we get here, all retries failed
    if last_error:
        raise last_error
    raise httpx.HTTPError("API request failed after retries")


def parse_api_response(data: Any) -> List[Dict[str, Any]]:
    """
    Parse API response into a list of items.
    Handles various response formats:
    - Direct array: [item1, item2, ...]
    - Object with array property: {"data": [item1, ...], "results": [...]}
    - Single object: {"item": ...} -> [{"item": ...}]
    
    Args:
        data: Parsed JSON response
        
    Returns:
        List of item dictionaries
    """
    if isinstance(data, list):
        return data
    elif isinstance(data, dict):
        # Try common keys that contain arrays
        for key in ["data", "results", "items", "recalls", "violations", "product_bans", "bans"]:
            if key in data and isinstance(data[key], list):
                return data[key]
        # If no array found, treat as single item
        return [data]
    else:
        # Unexpected type, return empty list
        logger.warning(f"Unexpected API response type: {type(data)}")
        return []


async def map_api_fields_to_product_ban(
    item: Dict[str, Any],
    organization: Organization,
    field_mapping: Optional[Dict[str, str]] = None
) -> ProductBanCreate:
    """
    Map API response item to ProductBanCreate using field mapping.
    
    Args:
        item: Single item from API response
        organization: Organization to associate with
        field_mapping: Optional field mapping override
        
    Returns:
        ProductBanCreate instance
    """
    # Use existing field mapping logic from imports.py
    from app.routers.imports import map_violation_fields, normalize_violation_field_types
    
    # Map fields
    mapped_fields, extended_fields = map_violation_fields(
        source_data=item,
        field_mapping=field_mapping,
        auto_detect=True
    )
    
    # Normalize field types
    mapped_fields = normalize_violation_field_types(mapped_fields)
    
    # Ensure required fields
    if 'ban_number' not in mapped_fields and 'violation_number' not in mapped_fields:
        mapped_fields['ban_number'] = item.get('id') or item.get('recall_number') or item.get('violation_number') or f"API-{uuid.uuid4().hex[:8]}"
    
    if 'title' not in mapped_fields:
        mapped_fields['title'] = item.get('title') or item.get('name') or item.get('product_name') or "Imported Product Ban"
    
    if 'url' not in mapped_fields:
        mapped_fields['url'] = item.get('url') or item.get('source_url') or item.get('link') or ""
    
    # Set organization information
    mapped_fields['organization_name'] = organization.name
    mapped_fields['organization_id'] = organization.organization_id
    mapped_fields['organization_type'] = organization.organization_type.value
    
    # Legacy agency fields (for backward compatibility)
    mapped_fields['agency_name'] = organization.name
    if organization.acronym:
        mapped_fields['agency_acronym'] = organization.acronym
    mapped_fields['agency_id'] = organization.organization_id
    
    # Store extended fields in agency_metadata
    if extended_fields:
        if 'agency_metadata' not in mapped_fields:
            mapped_fields['agency_metadata'] = {}
        mapped_fields['agency_metadata'].update(extended_fields)
    
    # Convert old field names to new ones
    if 'violation_number' in mapped_fields and 'ban_number' not in mapped_fields:
        mapped_fields['ban_number'] = mapped_fields.pop('violation_number')
    if 'violation_date' in mapped_fields and 'ban_date' not in mapped_fields:
        mapped_fields['ban_date'] = mapped_fields.pop('violation_date')
    if 'violation_type' in mapped_fields and 'ban_type' not in mapped_fields:
        mapped_fields['ban_type'] = mapped_fields.pop('violation_type')
    
    # Parse date if it's a string
    if 'ban_date' in mapped_fields and isinstance(mapped_fields['ban_date'], str):
        try:
            mapped_fields['ban_date'] = date_parser.parse(mapped_fields['ban_date'])
        except:
            pass
    
    # Create ProductBanCreate
    try:
        return ProductBanCreate(**mapped_fields)
    except Exception as e:
        logger.error(f"Failed to create ProductBanCreate from mapped fields: {e}")
        logger.error(f"Mapped fields: {mapped_fields}")
        raise
