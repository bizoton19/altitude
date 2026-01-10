# Phased Import System Implementation Plan

This document outlines the phased approach for importing violations and listings from multiple sources.

---

## Overview

The import system supports multiple entry points for data ingestion:

1. **Manual Entry** - Users manually add violations/listings via UI
2. **Bulk Import** - Paste text, URLs, or upload CSV files
3. **Programmatic Import** - API-based imports, automated agent searches
4. **Email Integration** - Parse emails for listings/violations
5. **Browser Extension** - Context menu to save listings directly

---

## Phase 1: Manual Import (✅ COMPLETED)

### 1.1 Bulk Listing Import
**Status**: ✅ Implemented

**Endpoints**:
- `POST /api/imports/listings/bulk` - Import listings from text paste or URL list

**Features**:
- Extract URLs from text content
- Detect marketplace from URL
- Create listing records automatically
- Link to violations/recalls if provided
- Support for text paste, direct URLs, or CSV (future)

**Usage Examples**:

```javascript
// Paste URLs
POST /api/imports/listings/bulk
{
  "source": "text_paste",
  "text_content": "https://facebook.com/marketplace/item/123\nhttps://ebay.com/itm/456",
  "violation_id": "CPSC-2024-001",
  "source_name": "Manual paste from email"
}

// Direct URL list
POST /api/imports/listings/bulk
{
  "source": "manual",
  "urls": [
    "https://facebook.com/marketplace/item/123",
    "https://ebay.com/itm/456"
  ],
  "violation_id": "CPSC-2024-001"
}
```

**Supported Marketplaces**:
- Facebook Marketplace
- eBay
- Craigslist
- OfferUp
- Mercari
- Poshmark
- Depop
- Generic/Unknown (auto-created)

### 1.2 Violation CSV Import
**Status**: ✅ Implemented

**Endpoints**:
- `POST /api/imports/violations/csv` - Import violations from CSV

**Features**:
- CSV parsing with configurable delimiter
- Automatic field mapping detection
- Manual field mapping support
- Auto-classification of risk levels
- Error handling and reporting

**CSV Format**:
```csv
violation_number,title,description,violation_date,units_affected,injuries,deaths
CPSC-2024-001,Recall: Graco Stroller,Choking hazard,2024-01-15,50000,3,0
CPSC-2024-002,Recall: Toy Car,Lead paint,2024-01-20,100000,0,0
```

**Usage**:
```javascript
POST /api/imports/violations/csv
FormData:
  csv_content: "..."
  delimiter: ","
  has_header: true
  agency_name: "CPSC"
  auto_classify_risk: true
```

### 1.3 Import History
**Status**: ✅ Implemented

**Endpoints**:
- `GET /api/imports/history` - List import history
- `GET /api/imports/history/{import_id}` - Get import details

**Features**:
- Track all imports with status
- Success/failure counts
- Error details
- Source tracking

---

## Phase 2: Programmatic Import (🚧 IN PROGRESS)

### 2.1 Automated Agent Listings
**Status**: ⚠️ Planned

**What We Need**:
- Agent search workflow completion
- Automatic listing creation from search results
- Link listings to violations automatically

**Implementation**:
- Complete `run_investigation_task()` in `investigation_scheduler.py`
- Connect agent orchestrator to listing creation
- Store source as `ImportSource.AGENT_AUTOMATED`

### 2.2 Violation API Import
**Status**: ⚠️ Planned

**Endpoints** (to be added):
- `POST /api/imports/violations/api` - Import from REST API

**Features**:
- Fetch violations from external APIs (CPSC, FDA, etc.)
- Configurable auth (Bearer, API key, etc.)
- Scheduled imports (via APScheduler)
- Field mapping intelligence (agent-assisted)

**Implementation Needed**:
- API client service
- Field mapping logic
- Scheduling integration

### 2.3 Violation Database Import
**Status**: ⚠️ Planned

**Endpoints** (to be added):
- `POST /api/imports/violations/database` - Import from database

**Features**:
- Connect to external databases (Postgres, MySQL, SQLite)
- SQL query execution
- Field mapping
- Scheduled imports

**Implementation Needed**:
- Database connection pooling
- Query builder
- Field mapping service

---

## Phase 3: Email Integration (📋 PLANNED)

### 3.1 Email Ingestion Endpoint
**Status**: 📋 Planned

**Endpoints** (to be added):
- `POST /api/imports/listings/email` - Process email content
- `POST /webhook/email` - Email webhook (for SendGrid, Mailgun, etc.)

**Features**:
- Parse email body for URLs
- Extract attachments (CSV files)
- Parse email metadata (sender, subject)
- Auto-detect import type (listing vs violation)

**Use Cases**:
- External users email listing URLs
- Agencies send violation reports via email
- Automated email parsing from monitoring inbox

**Implementation Needed**:
- Email parsing library
- URL extraction from HTML emails
- Attachment processing
- Webhook handler

### 3.2 Email Monitoring Setup
**Status**: 📋 Future

**Features**:
- IMAP/POP3 monitoring
- Auto-forward rules
- Email filtering
- Spam detection

---

## Phase 4: Browser Extension (📋 PLANNED)

### 4.1 Context Menu API
**Status**: ✅ Endpoint Ready (Phase 4 Implementation)

**Endpoints**:
- `POST /api/imports/listings/from-extension` - Save listing from browser

**Features**:
- Accept listing URL, title, description, image
- Link to violation/recall
- Store source as `ImportSource.BROWSER_EXTENSION`

**Usage** (from extension):
```javascript
fetch('http://localhost:8000/api/imports/listings/from-extension', {
  method: 'POST',
  body: new FormData({
    url: currentPageUrl,
    title: extractedTitle,
    description: extractedDescription,
    image_url: extractedImage,
    violation_id: selectedViolationId
  })
})
```

### 4.2 Browser Extension Implementation
**Status**: 📋 Future

**Components Needed**:
- Chrome/Firefox extension manifest
- Content script for page extraction
- Context menu handler
- Background script
- Options page for configuration

**Features**:
- Right-click context menu: "Save to Altitude"
- Auto-extract listing details
- Link to violation selection
- Bulk save (select multiple listings)
- One-click reporting

---

## Database Schema

### Import History Table (In-Memory → Future: Postgres)
```python
class ImportHistory(BaseModel):
    import_id: str
    import_type: str  # "listing" or "violation"
    source: ImportSource
    source_name: Optional[str]
    status: ImportStatus
    total_items: int
    successful: int
    failed: int
    created_by: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]
    error_summary: Optional[str]
    metadata: Dict[str, Any]
```

### Listing Model (already has import source tracking)
```python
# MarketplaceListing already has:
- listing_url (URL source)
- found_at (timestamp)
# Future: add import_source field
```

### Violation Model (already has import source tracking)
```python
# ProductViolation already has:
- agency_metadata (can store import info)
# Future: add import_source, imported_at fields
```

---

## Frontend Integration

### 1. Bulk Listing Import UI
**Location**: Settings or New Import Page

**Features**:
- Text area for pasting URLs
- File upload for CSV (future)
- Violation/recall selector
- Import history view
- Success/error reporting

### 2. Violation CSV Import UI
**Location**: Violations Page → Import

**Features**:
- CSV file upload
- Field mapping preview
- Agency selection
- Import preview before confirmation
- Error reporting

### 3. Import History Dashboard
**Location**: Settings → Imports

**Features**:
- List all imports
- Filter by type, source, status
- View import details
- Download error reports
- Retry failed imports

---

## Error Handling

All imports return detailed error information:

```json
{
  "import_id": "import-abc123",
  "status": "partial",
  "total_items": 10,
  "successful": 8,
  "failed": 2,
  "errors": [
    {
      "item": "https://invalid-url.com",
      "error": "Invalid URL format"
    },
    {
      "item": "Row 5",
      "error": "Missing required field: violation_number"
    }
  ]
}
```

---

## Security Considerations

1. **URL Validation**: Validate all URLs before processing
2. **CSV Size Limits**: Limit CSV file size to prevent DoS
3. **Rate Limiting**: Implement rate limiting on import endpoints
4. **Authentication**: Require auth for import endpoints (future)
5. **Input Sanitization**: Sanitize all user input
6. **File Upload Limits**: Restrict file types and sizes

---

## Next Steps

### Immediate (Week 1)
1. ✅ Complete Phase 1 (Manual Import) - **DONE**
2. Add frontend UI for bulk listing import
3. Add frontend UI for violation CSV import
4. Test import endpoints

### Short Term (Week 2-3)
5. Implement Phase 2.1 (Automated Agent Listings)
6. Implement Phase 2.2 (Violation API Import)
7. Add scheduled import support

### Medium Term (Month 2)
8. Implement Phase 3 (Email Integration)
9. Build email parsing service
10. Set up email webhook

### Long Term (Month 3+)
11. Build browser extension (Phase 4)
12. Create extension UI
13. Publish to Chrome/Firefox stores

---

## API Documentation

### Import Sources
```python
class ImportSource(str, Enum):
    MANUAL = "manual"
    CSV_UPLOAD = "csv_upload"
    TEXT_PASTE = "text_paste"
    API = "api"
    DATABASE = "database"
    EMAIL = "email"
    BROWSER_EXTENSION = "browser_extension"
    AGENT_AUTOMATED = "agent_automated"
```

### Import Status
```python
class ImportStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"
```

---

## Summary

✅ **Phase 1 (Manual Import)** is complete and ready for use!

The system now supports:
- Bulk listing import from text/URLs
- Violation CSV import
- Import history tracking
- Browser extension endpoint (ready for extension implementation)

🚧 **Phase 2-4** are planned and documented for future implementation.

