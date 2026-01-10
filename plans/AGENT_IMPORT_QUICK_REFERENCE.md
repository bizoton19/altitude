# AI Agent Import Quick Reference

## Quick Start

### 1. File Upload (Most Common)
```python
# Upload file → Get import_id → Poll status
result = POST /api/imports/violations/file
  - file: <file>
  - agency_name: "Consumer Product Safety Commission"
  - auto_classify_risk: "true"
  - auto_investigate: "true"

import_id = result["import_id"]

# Poll for completion
while True:
    status = GET /api/imports/history/{import_id}
    if status["status"] in ["COMPLETED", "PARTIAL", "FAILED"]:
        break
    sleep(2)
```

### 2. API Import
```python
POST /api/imports/violations/api
{
  "api_url": "https://api.example.com/violations",
  "api_method": "GET",
  "api_auth": {"type": "bearer", "token": "..."},
  "agency_name": "Consumer Product Safety Commission"
}
```

### 3. Single Violation
```python
POST /api/imports/violations/workflow
{
  "violation_data": {
    "violation_number": "CPSC-26156",
    "title": "Product Recall",
    "url": "https://...",
    "agency_name": "Consumer Product Safety Commission"
  },
  "auto_classify": true,
  "auto_investigate": true
}
```

## Status Values

- `PENDING` → `PROCESSING` → `COMPLETED` / `PARTIAL` / `FAILED`
- `progress`: 0.0 to 1.0
- `items_processed` / `total_items`

## Required Fields for ViolationCreate

```python
{
  "violation_number": str,  # REQUIRED
  "title": str,              # REQUIRED
  "url": str,                # REQUIRED
  "agency_name": str,        # REQUIRED
  "agency_acronym": str,     # Optional
  "agency_id": str,          # Optional
  "description": str,        # Optional
  "violation_date": datetime, # Optional
  "violation_type": "RECALL" | "WARNING" | "ADVISORY" | ...,
  "units_affected": int,     # Optional
  "injuries": int,           # Default: 0
  "deaths": int,             # Default: 0
  "incidents": int,          # Default: 0
  "country": str,            # Optional (ISO 3166-1 alpha-2)
  "region": str,             # Optional
  "agency_metadata": dict    # Optional (flexible)
}
```

## Field Mapping

Common source fields → Target fields:
- `recall_number` → `violation_number`
- `title` / `name` → `title`
- `recall_date` / `date` → `violation_date`
- `units_sold` / `units` → `units_affected`
- `injuries` / `injury_count` → `injuries`
- `deaths` / `death_count` → `deaths`
- `incidents` / `incident_count` → `incidents`
- `country` / `country_code` → `country`
- `agency_name` / `agency` → `agency_name`

## Error Handling

```python
# Check status
if status["status"] == "FAILED":
    error = status["error_summary"]
    # Handle complete failure

elif status["status"] == "PARTIAL":
    errors = status.get("errors", [])
    # Handle partial success
    # errors = [{"item": "Row 5", "error": "..."}]
```

## Polling Strategy

```python
# Recommended polling interval: 2-5 seconds
# Timeout: 300 seconds (5 minutes) for large files

async def wait_for_completion(import_id, timeout=300):
    start = time.time()
    while True:
        status = get_status(import_id)
        if status["status"] in ["COMPLETED", "PARTIAL", "FAILED"]:
            return status
        if time.time() - start > timeout:
            raise TimeoutError()
        await asyncio.sleep(2)
```

## Import Sources

- `MANUAL` - Manual entry
- `CSV_UPLOAD` - CSV file upload
- `API` - External API
- `EMAIL` - Email ingestion (future)
- `BROWSER_EXTENSION` - Browser extension
- `AGENT_AUTOMATED` - AI agent automated

## Best Practices

1. **Always preview large files first** → `POST /violations/file/preview`
2. **Use field mapping** for non-standard CSV/JSON formats
3. **Monitor progress** for files > 1000 rows
4. **Handle partial successes** - check `errors` array
5. **Set appropriate timeouts** - 5 min for files, 30s for API
6. **Log all activities** for audit trail

## Common Patterns

### Pattern: Scheduled Daily Import
```python
# Run daily at 2 AM
result = import_from_api(api_config)
if result["status"] == "COMPLETED":
    violations = get_violations_by_import(result["import_id"])
    high_risk = [v for v in violations if v.risk_level == "HIGH"]
    if high_risk:
        send_alert(f"Found {len(high_risk)} high-risk violations")
```

### Pattern: File Import with Preview
```python
# 1. Preview
preview = preview_file(file_path)
# 2. Use suggested mapping or customize
field_mapping = preview["detected_mappings"]
# 3. Import
result = import_file(file_path, field_mapping=field_mapping)
# 4. Monitor
status = wait_for_completion(result["import_id"])
```

---

**See `AGENT_IMPORT_GUIDE.md` for complete documentation.**

