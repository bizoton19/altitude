# AI Agent Import Guide
## Autonomous Violation Import System

This guide provides complete instructions for an AI agent to autonomously handle violation imports from various sources.

---

## Table of Contents
1. [Overview](#overview)
2. [API Base URL](#api-base-url)
3. [Import Methods](#import-methods)
4. [Workflow Patterns](#workflow-patterns)
5. [Error Handling](#error-handling)
6. [Progress Tracking](#progress-tracking)
7. [Best Practices](#best-practices)
8. [Example Scenarios](#example-scenarios)

---

## Overview

The import system supports multiple methods for importing violations:
- **File Upload** (CSV/JSON) - For bulk imports from files
- **API Integration** - For programmatic imports from external APIs
- **Workflow Endpoint** - For single violation imports with full workflow
- **Manual Entry** - For individual violations

All imports go through a standardized workflow:
1. **Import** → Data is received and validated
2. **Save** → Violations are stored in the database
3. **Classify** → Risk level is automatically assigned
4. **Investigate** → High-risk violations trigger investigations

---

## API Base URL

```
Base URL: http://localhost:8000/api/imports
```

All endpoints are prefixed with `/api/imports`

---

## Import Methods

### 1. File Upload (Bulk Import)

**Endpoint:** `POST /api/imports/violations/file`

**Use Case:** Import violations from CSV or JSON files (supports GB-sized files)

**Process:**
1. Upload file → Returns `import_id` immediately
2. File is processed in background
3. Poll status endpoint for progress

**Request Format:**
```http
POST /api/imports/violations/file
Content-Type: multipart/form-data

file: <file>
file_type: "csv" | "json" (optional, auto-detected)
delimiter: "," (optional, for CSV)
has_header: "true" | "false" (optional, default: "true")
field_mapping: '{"source_field": "target_field"}' (optional, JSON string)
agency_name: "Consumer Product Safety Commission" (optional)
agency_id: "cpsc-001" (optional)
auto_classify_risk: "true" | "false" (optional, default: "true")
auto_investigate: "true" | "false" (optional, default: "true")
source_name: "CPSC API Export" (optional)
```

**Response:**
```json
{
  "import_id": "import-abc123def456",
  "status": "PENDING",
  "total_items": 0,
  "successful": 0,
  "failed": 0,
  "skipped": 0,
  "created_violation_ids": [],
  "errors": [],
  "completed_at": null,
  "source": "CSV_UPLOAD",
  "source_name": "CSV File Upload"
}
```

**Status Polling:**
```http
GET /api/imports/history/{import_id}
```

**Poll Response:**
```json
{
  "import_id": "import-abc123def456",
  "import_type": "violation",
  "source": "CSV_UPLOAD",
  "source_name": "CSV File Upload",
  "status": "PROCESSING",  // PENDING → PROCESSING → COMPLETED/PARTIAL/FAILED
  "total_items": 1225,
  "successful": 850,
  "failed": 375,
  "skipped": 0,
  "items_processed": 1225,  // Current progress
  "progress": 1.0,  // 0.0 to 1.0
  "created_at": "2026-01-04T01:00:00Z",
  "completed_at": "2026-01-04T01:05:30Z",
  "error_summary": null,
  "metadata": {}
}
```

**Agent Workflow:**
```python
# 1. Upload file
response = upload_file(file_path, options)
import_id = response["import_id"]

# 2. Poll for completion
while True:
    status = get_import_status(import_id)
    if status["status"] in ["COMPLETED", "PARTIAL", "FAILED"]:
        break
    time.sleep(2)  # Poll every 2 seconds

# 3. Handle result
if status["status"] == "COMPLETED":
    print(f"Successfully imported {status['successful']} violations")
elif status["status"] == "PARTIAL":
    print(f"Partial import: {status['successful']} successful, {status['failed']} failed")
else:
    print(f"Import failed: {status['error_summary']}")
```

---

### 2. File Preview (Before Import)

**Endpoint:** `POST /api/imports/violations/file/preview`

**Use Case:** Analyze file structure before importing to determine field mappings

**Request:**
```http
POST /api/imports/violations/file/preview
Content-Type: multipart/form-data

file: <file>
file_type: "csv" | "json" (optional)
delimiter: "," (optional)
has_header: "true" | "false" (optional)
```

**Response:**
```json
{
  "file_type": "csv",
  "total_rows": 1225,
  "fields": [
    {
      "field_name": "recall_number",
      "detected_type": "string",
      "sample_values": ["26156", "26157", "26158"],
      "suggested_target": "violation_number",
      "suggested_data_type": "string"
    },
    {
      "field_name": "title",
      "detected_type": "string",
      "sample_values": ["Product Recall", "Safety Alert"],
      "suggested_target": "title",
      "suggested_data_type": "string"
    }
  ],
  "sample_rows": [
    {"recall_number": "26156", "title": "Product Recall", ...},
    ...
  ],
  "detected_mappings": {
    "recall_number": "violation_number",
    "title": "title",
    "recall_date": "violation_date"
  }
}
```

**Agent Usage:**
```python
# Preview file to understand structure
preview = preview_file(file_path)

# Use suggested mappings or create custom ones
field_mapping = preview["detected_mappings"]
# Or customize:
field_mapping = {
    "recall_number": "violation_number",
    "product_name": "title",
    "date": "violation_date"
}

# Then import with mapping
import_file(file_path, field_mapping=field_mapping)
```

---

### 3. API Integration (Programmatic Import)

**Endpoint:** `POST /api/imports/violations/api`

**Use Case:** Import violations from external REST APIs (CPSC, FDA, Health Canada, etc.)

**Request:**
```json
{
  "api_url": "https://api.example.com/violations",
  "api_method": "GET",
  "api_headers": {
    "Accept": "application/json",
    "User-Agent": "Altitude-Import-Agent/1.0"
  },
  "api_auth": {
    "type": "bearer",
    "token": "your-api-token"
  },
  "agency_name": "Consumer Product Safety Commission",
  "auto_classify_risk": true,
  "auto_investigate": true,
  "source_name": "CPSC API"
}
```

**Response:**
```json
{
  "import_id": "import-xyz789",
  "status": "COMPLETED",
  "total_items": 50,
  "successful": 48,
  "failed": 2,
  "created_violation_ids": ["CPSC-26156", "CPSC-26157", ...],
  "errors": [
    {"item": "Item 12", "error": "violation_number: Field required"},
    {"item": "Item 23", "error": "title: Field required"}
  ],
  "completed_at": "2026-01-04T01:10:00Z",
  "source": "API",
  "source_name": "CPSC API"
}
```

**Agent Workflow:**
```python
# Configure API connection
api_config = {
    "api_url": "https://www.saferproducts.gov/api/recalls",
    "api_method": "GET",
    "api_headers": {"Accept": "application/json"},
    "api_auth": {"type": "bearer", "token": api_token},
    "agency_name": "Consumer Product Safety Commission",
    "source_name": "CPSC API Daily Sync"
}

# Import from API
result = import_from_api(api_config)

# Check results
if result["status"] == "COMPLETED":
    print(f"Imported {result['successful']} violations")
    if result["errors"]:
        log_errors(result["errors"])
```

---

### 4. Workflow Endpoint (Single Violation)

**Endpoint:** `POST /api/imports/violations/workflow`

**Use Case:** Import a single violation with full workflow (classify + investigate)

**Request:**
```json
{
  "violation_data": {
    "violation_number": "CPSC-26156",
    "title": "Product Recall: Children's Toy",
    "url": "https://www.cpsc.gov/recalls/26156",
    "agency_name": "Consumer Product Safety Commission",
    "agency_acronym": "CPSC",
    "description": "Product poses choking hazard",
    "violation_date": "2024-12-18T00:00:00Z",
    "violation_type": "RECALL",
    "units_affected": 2800,
    "injuries": 5,
    "deaths": 0,
    "incidents": 3,
    "country": "US",
    "region": "North America"
  },
  "source": "MANUAL",
  "source_name": "Agent Import",
  "auto_classify": true,
  "auto_investigate": true
}
```

**Response:**
```json
{
  "import_id": "import-123",
  "violation": {
    "violation_id": "CPSC-26156",
    "violation_number": "CPSC-26156",
    "title": "Product Recall: Children's Toy",
    "risk_level": "HIGH",
    "risk_score": 0.85,
    ...
  },
  "risk_level": "HIGH",
  "risk_score": 0.85,
  "investigation": {
    "investigation_id": "inv-abc123",
    "status": "SCHEDULED",
    ...
  },
  "investigation_id": "inv-abc123"
}
```

---

## Workflow Patterns

### Pattern 1: Scheduled Bulk Import

**Scenario:** Daily import from CPSC API

```python
async def scheduled_cpsc_import():
    """Run daily at 2 AM"""
    
    # 1. Fetch from CPSC API
    api_config = {
        "api_url": "https://www.saferproducts.gov/api/recalls",
        "api_method": "GET",
        "agency_name": "Consumer Product Safety Commission",
        "source_name": "CPSC Daily Sync"
    }
    
    # 2. Import violations
    result = await import_from_api(api_config)
    
    # 3. Log results
    log_import_result(result)
    
    # 4. Alert on high-risk violations
    if result["status"] == "COMPLETED":
        violations = await get_violations_by_import(result["import_id"])
        high_risk = [v for v in violations if v.risk_level == "HIGH"]
        if high_risk:
            send_alert(f"Found {len(high_risk)} high-risk violations")
```

### Pattern 2: File-Based Import with Mapping

**Scenario:** Import from agency CSV export

```python
async def import_agency_csv(file_path, agency_name):
    """Import violations from agency CSV file"""
    
    # 1. Preview file to understand structure
    preview = await preview_file(file_path)
    
    # 2. Create field mapping based on preview
    field_mapping = preview["detected_mappings"]
    # Customize if needed:
    field_mapping["recall_date"] = "violation_date"
    field_mapping["units"] = "units_affected"
    
    # 3. Import with mapping
    result = await import_file(
        file_path,
        field_mapping=field_mapping,
        agency_name=agency_name,
        source_name=f"{agency_name} CSV Export"
    )
    
    # 4. Monitor progress
    import_id = result["import_id"]
    await monitor_import_progress(import_id)
    
    return result
```

### Pattern 3: Error Recovery

**Scenario:** Handle failed imports and retry

```python
async def import_with_retry(file_path, max_retries=3):
    """Import with automatic retry on failure"""
    
    for attempt in range(max_retries):
        try:
            result = await import_file(file_path)
            import_id = result["import_id"]
            
            # Wait for completion
            status = await wait_for_completion(import_id, timeout=300)
            
            if status["status"] == "COMPLETED":
                return status
            elif status["status"] == "PARTIAL":
                # Log partial success
                log_partial_import(status)
                return status
            else:
                # Failed - retry
                if attempt < max_retries - 1:
                    log_error(f"Import failed, retrying... (attempt {attempt + 1})")
                    await asyncio.sleep(5)
                    continue
                else:
                    raise Exception(f"Import failed after {max_retries} attempts")
                    
        except Exception as e:
            if attempt < max_retries - 1:
                log_error(f"Error: {e}, retrying...")
                await asyncio.sleep(5)
            else:
                raise
```

---

## Error Handling

### Common Errors

1. **Validation Errors**
   - **Error:** `"violation_number: Field required"`
   - **Cause:** Missing required field in source data
   - **Solution:** Check field mapping or provide default values

2. **File Size Errors**
   - **Error:** `"File too large. Maximum size is 1024MB"`
   - **Cause:** File exceeds size limit
   - **Solution:** Split file into smaller chunks or increase limit

3. **Format Errors**
   - **Error:** `"Invalid JSON format"` or `"CSV parsing error"`
   - **Cause:** Malformed file
   - **Solution:** Validate file before upload

4. **API Errors**
   - **Error:** `"HTTP 401 Unauthorized"`
   - **Cause:** Invalid API credentials
   - **Solution:** Check API authentication

### Error Response Format

```json
{
  "status": "PARTIAL",
  "errors": [
    {
      "item": "Row 5",
      "error": "violation_number: Field required; title: Field required"
    },
    {
      "item": "Row 12",
      "error": "Invalid date format for violation_date"
    }
  ]
}
```

### Agent Error Handling Strategy

```python
def handle_import_errors(result):
    """Process import errors and take appropriate action"""
    
    if result["status"] == "FAILED":
        # Complete failure
        log_critical(f"Import {result['import_id']} failed: {result.get('error_summary')}")
        alert_administrators(result)
        
    elif result["status"] == "PARTIAL":
        # Partial success - analyze errors
        errors = result.get("errors", [])
        
        # Group errors by type
        error_types = {}
        for error in errors:
            error_msg = error["error"]
            if "Field required" in error_msg:
                error_types.setdefault("missing_fields", []).append(error)
            elif "Invalid format" in error_msg:
                error_types.setdefault("format_errors", []).append(error)
            else:
                error_types.setdefault("other", []).append(error)
        
        # Log and handle each type
        for error_type, error_list in error_types.items():
            log_warning(f"Found {len(error_list)} {error_type}")
            
            # For missing fields, suggest field mapping updates
            if error_type == "missing_fields":
                suggest_field_mapping_fix(error_list)
```

---

## Progress Tracking

### Status Values

- **PENDING** - Import queued, not started
- **PROCESSING** - Import in progress
- **COMPLETED** - All items imported successfully
- **PARTIAL** - Some items imported, some failed
- **FAILED** - Import completely failed

### Progress Calculation

```python
progress = items_processed / total_items  # 0.0 to 1.0
percentage = progress * 100  # 0% to 100%
```

### Polling Strategy

```python
async def wait_for_completion(import_id, timeout=300, poll_interval=2):
    """Wait for import to complete with timeout"""
    
    start_time = time.time()
    
    while True:
        status = await get_import_status(import_id)
        
        # Check timeout
        if time.time() - start_time > timeout:
            raise TimeoutError(f"Import {import_id} timed out after {timeout}s")
        
        # Check completion
        if status["status"] in ["COMPLETED", "PARTIAL", "FAILED"]:
            return status
        
        # Log progress
        progress_pct = status["progress"] * 100
        log_info(f"Import {import_id}: {progress_pct:.1f}% complete "
                f"({status['items_processed']}/{status['total_items']})")
        
        await asyncio.sleep(poll_interval)
```

---

## Best Practices

### 1. Always Preview Large Files

```python
# Before importing, preview to understand structure
preview = await preview_file(large_file_path)

# Check if field mapping is needed
if not preview["detected_mappings"]:
    # Create custom mapping
    field_mapping = create_custom_mapping(preview["fields"])
else:
    # Use auto-detected mapping
    field_mapping = preview["detected_mappings"]
```

### 2. Use Appropriate Import Method

- **File Upload**: For CSV/JSON files from agencies
- **API Integration**: For real-time API connections
- **Workflow Endpoint**: For single violations or programmatic creation

### 3. Monitor Progress for Large Imports

```python
# For files > 1000 rows, always monitor progress
if estimated_rows > 1000:
    result = await import_file(file_path)
    await monitor_import_progress(result["import_id"])
```

### 4. Handle Partial Successes

```python
# Always check for partial imports
if result["status"] == "PARTIAL":
    # Log successful imports
    log_success(f"Imported {result['successful']} violations")
    
    # Analyze and fix errors
    if result["errors"]:
        analyze_errors(result["errors"])
        # Optionally retry failed items
```

### 5. Set Appropriate Timeouts

```python
# File uploads: 5 minutes
# API imports: 30 seconds per request
# Progress polling: 2-5 seconds interval
```

### 6. Log All Import Activities

```python
def log_import_activity(import_id, action, details):
    """Log import activity for audit trail"""
    log_entry = {
        "import_id": import_id,
        "action": action,  # "started", "completed", "failed", etc.
        "timestamp": datetime.utcnow().isoformat(),
        "details": details
    }
    write_to_audit_log(log_entry)
```

---

## Example Scenarios

### Scenario 1: Daily CPSC Import

```python
async def daily_cpsc_import():
    """Daily scheduled import from CPSC API"""
    
    # Configure API
    api_config = {
        "api_url": "https://www.saferproducts.gov/api/recalls",
        "api_method": "GET",
        "api_headers": {"Accept": "application/json"},
        "agency_name": "Consumer Product Safety Commission",
        "auto_classify_risk": True,
        "auto_investigate": True,
        "source_name": "CPSC Daily Sync"
    }
    
    # Import
    result = await import_from_api(api_config)
    
    # Process results
    if result["status"] == "COMPLETED":
        violations = await get_violations_by_import(result["import_id"])
        high_risk = [v for v in violations if v.risk_level == "HIGH"]
        
        if high_risk:
            send_alert(f"Daily import: {len(high_risk)} high-risk violations found")
        
        return result
    else:
        raise Exception(f"Daily import failed: {result.get('error_summary')}")
```

### Scenario 2: Import from Email Attachment

```python
async def import_from_email(email_message):
    """Import violations from email attachment"""
    
    # Extract attachment
    attachment = email_message.get_attachment("violations.csv")
    if not attachment:
        raise ValueError("No CSV attachment found")
    
    # Save to temp file
    temp_file = save_temp_file(attachment.content)
    
    try:
        # Preview to understand structure
        preview = await preview_file(temp_file)
        
        # Import with auto-detected mapping
        result = await import_file(
            temp_file,
            field_mapping=preview["detected_mappings"],
            source_name=f"Email from {email_message.from_address}"
        )
        
        # Monitor progress
        status = await wait_for_completion(result["import_id"])
        
        # Send confirmation email
        send_confirmation_email(
            email_message.from_address,
            f"Imported {status['successful']} violations"
        )
        
        return status
        
    finally:
        # Clean up temp file
        os.remove(temp_file)
```

### Scenario 3: Batch Import Multiple Agencies

```python
async def batch_import_agencies(agencies):
    """Import violations from multiple agencies"""
    
    results = []
    
    for agency in agencies:
        try:
            if agency["type"] == "api":
                # API import
                result = await import_from_api(agency["api_config"])
            elif agency["type"] == "file":
                # File import
                result = await import_file(
                    agency["file_path"],
                    agency_name=agency["name"],
                    field_mapping=agency.get("field_mapping")
                )
            else:
                log_error(f"Unknown import type for {agency['name']}")
                continue
            
            results.append({
                "agency": agency["name"],
                "import_id": result["import_id"],
                "status": result["status"]
            })
            
        except Exception as e:
            log_error(f"Failed to import from {agency['name']}: {e}")
            results.append({
                "agency": agency["name"],
                "status": "FAILED",
                "error": str(e)
            })
    
    # Generate summary report
    generate_import_report(results)
    
    return results
```

---

## Required Agent Capabilities

To autonomously handle imports, the agent needs:

1. **HTTP Client** - For API calls
2. **File Handling** - For reading/uploading files
3. **JSON/CSV Parsing** - For understanding file structures
4. **Async/Await Support** - For handling background processing
5. **Error Handling** - For retries and recovery
6. **Logging** - For audit trails
7. **Scheduling** - For periodic imports
8. **Progress Monitoring** - For long-running imports

---

## API Reference Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/violations/file` | POST | Upload and import violations from file |
| `/violations/file/preview` | POST | Preview file structure before import |
| `/violations/api` | POST | Import violations from external API |
| `/violations/workflow` | POST | Import single violation with full workflow |
| `/history` | GET | List import history |
| `/history/{import_id}` | GET | Get specific import status and progress |

---

## Configuration

### Environment Variables

```bash
# API Base URL
API_BASE_URL=http://localhost:8000/api

# File Upload Settings
UPLOAD_MAX_SIZE_MB=1024  # Maximum file size in MB

# Import Settings
DEFAULT_AUTO_CLASSIFY=true
DEFAULT_AUTO_INVESTIGATE=true
```

### Agent Configuration

```json
{
  "import_settings": {
    "default_agency_name": "Consumer Product Safety Commission",
    "auto_classify_risk": true,
    "auto_investigate": true,
    "poll_interval_seconds": 2,
    "import_timeout_seconds": 300
  },
  "scheduled_imports": [
    {
      "name": "CPSC Daily",
      "type": "api",
      "schedule": "0 2 * * *",  // Daily at 2 AM
      "api_url": "https://www.saferproducts.gov/api/recalls",
      "agency_name": "Consumer Product Safety Commission"
    }
  ]
}
```

---

## Support

For issues or questions:
- Check import history: `GET /api/imports/history`
- Review error details in import status
- Check server logs for detailed error messages

---

**Last Updated:** 2026-01-04
**Version:** 1.0

