"""
Import Models
=============
Models for tracking imports of violations and listings from various sources.
"""

from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class ImportSource(str, Enum):
    """Source of the import."""
    MANUAL = "manual"  # Manual entry via UI
    CSV_UPLOAD = "csv_upload"  # CSV file upload
    TEXT_PASTE = "text_paste"  # Text/URL paste
    API = "api"  # API endpoint
    DATABASE = "database"  # Database connection
    EMAIL = "email"  # Email ingestion
    BROWSER_EXTENSION = "browser_extension"  # Browser extension context menu
    AGENT_AUTOMATED = "agent_automated"  # AI agent automated search


class ImportStatus(str, Enum):
    """Status of an import operation."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"  # Some items imported, some failed


class ListingImportRequest(BaseModel):
    """Request to import listings from various sources."""
    source: ImportSource
    violation_id: Optional[str] = None  # Optional: link listings to specific violation
    recall_id: Optional[str] = None  # Optional: link listings to specific recall
    investigation_id: Optional[str] = None  # Optional: attach listings to an investigation/session
    
    # Text paste / URLs
    urls: Optional[List[str]] = Field(None, description="List of listing URLs to import")
    text_content: Optional[str] = Field(None, description="Text content with URLs (one per line)")
    
    # CSV upload
    csv_content: Optional[str] = Field(None, description="CSV content as string")
    csv_delimiter: str = ","
    csv_has_header: bool = True
    
    # Email
    email_subject: Optional[str] = None
    email_from: Optional[str] = None
    email_body: Optional[str] = None
    
    # Metadata
    source_name: Optional[str] = Field(None, description="Human-readable source name (e.g., 'Email from John Doe')")
    notes: Optional[str] = None


class ListingImportResult(BaseModel):
    """Result of a listing import operation."""
    import_id: str
    status: ImportStatus
    total_items: int = 0
    successful: int = 0
    failed: int = 0
    skipped: int = 0  # Duplicates or invalid
    
    created_listing_ids: List[str] = Field(default_factory=list)
    errors: List[Dict[str, Any]] = Field(default_factory=list)  # [{"item": "...", "error": "..."}]
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    source: ImportSource
    source_name: Optional[str] = None


class ViolationImportRequest(BaseModel):
    """Request to import violations from various sources."""
    source: ImportSource
    agency_id: Optional[str] = None
    agency_name: Optional[str] = None
    
    # CSV upload
    csv_content: Optional[str] = Field(None, description="CSV content as string")
    csv_delimiter: str = ","
    csv_has_header: bool = True
    field_mapping: Optional[Dict[str, str]] = Field(None, description="Manual field mapping: {'csv_column': 'violation_field'}")
    
    # API import
    api_url: Optional[HttpUrl] = None
    api_method: str = "GET"
    api_headers: Optional[Dict[str, str]] = None
    api_auth: Optional[Dict[str, str]] = None  # {"type": "bearer", "token": "..."}
    
    # Database import
    db_connection_string: Optional[str] = None
    db_query: Optional[str] = None
    db_table: Optional[str] = None
    
    # Email
    email_subject: Optional[str] = None
    email_from: Optional[str] = None
    email_body: Optional[str] = None
    email_attachments: List[str] = Field(default_factory=list)
    
    # Metadata
    source_name: Optional[str] = None
    notes: Optional[str] = None
    auto_classify_risk: bool = True  # Auto-classify risk after import


class ViolationImportResult(BaseModel):
    """Result of a violation import operation."""
    import_id: str
    status: ImportStatus
    total_items: int = 0
    successful: int = 0
    failed: int = 0
    skipped: int = 0
    
    created_violation_ids: List[str] = Field(default_factory=list)
    errors: List[Dict[str, Any]] = Field(default_factory=list)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    source: ImportSource
    source_name: Optional[str] = None


class FieldSchema(BaseModel):
    """Schema information for a single field."""
    field_name: str = Field(..., description="Name of the field in the source file")
    detected_type: str = Field(..., description="Detected data type (string, integer, float, date, list, object)")
    sample_values: List[Any] = Field(default_factory=list, description="Sample values from the file")
    suggested_target: Optional[str] = Field(None, description="Suggested target field in ViolationCreate schema")
    suggested_data_type: Optional[str] = Field(None, description="Suggested data type for the target field")


class FilePreviewResult(BaseModel):
    """Result of file preview/parsing for mapping."""
    file_type: str = Field(..., description="Detected file type (csv or json)")
    total_rows: int = Field(..., description="Total number of rows/items in the file")
    fields: List[FieldSchema] = Field(default_factory=list, description="Detected fields with schema information")
    sample_rows: List[Dict[str, Any]] = Field(default_factory=list, description="Sample rows (first 5) for preview")
    detected_mappings: Dict[str, str] = Field(default_factory=dict, description="Auto-detected field mappings")


class ImportHistory(BaseModel):
    """Historical record of an import operation."""
    import_id: str
    import_type: str  # "listing" or "violation"
    source: ImportSource
    source_name: Optional[str] = None
    status: ImportStatus
    
    total_items: int
    successful: int
    failed: int
    skipped: int = 0
    
    # Progress tracking
    items_processed: int = 0
    progress: float = Field(0.0, ge=0.0, le=1.0, description="Progress from 0.0 to 1.0")
    
    created_by: Optional[str] = None  # User ID or system
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    error_summary: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

