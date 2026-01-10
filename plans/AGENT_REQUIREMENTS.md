# AI Agent Requirements for Autonomous Import Handling

## Overview

This document outlines what capabilities and information an AI agent needs to autonomously handle violation imports in the Altitude system.

---

## Required Capabilities

### 1. HTTP Client
- **Purpose**: Make API calls to import endpoints
- **Requirements**:
  - Support for `multipart/form-data` (file uploads)
  - Support for `application/json` (API imports)
  - Async/await support for non-blocking operations
  - Timeout handling
  - Error retry logic

### 2. File Handling
- **Purpose**: Read and upload files (CSV, JSON)
- **Requirements**:
  - Read local files from disk
  - Stream large files (GB-sized) without loading into memory
  - Parse CSV and JSON formats
  - Handle file encoding (UTF-8, etc.)

### 3. Data Processing
- **Purpose**: Transform source data to match ViolationCreate schema
- **Requirements**:
  - Field mapping (source → target)
  - Data type conversion (string → int, date parsing, etc.)
  - Validation of required fields
  - Handling missing/optional fields

### 4. Progress Monitoring
- **Purpose**: Track long-running imports
- **Requirements**:
  - Poll status endpoints
  - Calculate progress percentage
  - Handle timeouts
  - Detect completion states

### 5. Error Handling
- **Purpose**: Handle failures gracefully
- **Requirements**:
  - Parse error responses
  - Retry logic with exponential backoff
  - Logging and reporting
  - Partial success handling

### 6. Scheduling
- **Purpose**: Run periodic imports
- **Requirements**:
  - Cron-like scheduling
  - Timezone handling
  - Job persistence
  - Failure notifications

---

## Required Knowledge

### 1. API Endpoints

The agent must know these endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/imports/violations/file` | POST | Upload file for import |
| `/api/imports/violations/file/preview` | POST | Preview file structure |
| `/api/imports/violations/api` | POST | Import from external API |
| `/api/imports/violations/workflow` | POST | Single violation import |
| `/api/imports/history` | GET | List import history |
| `/api/imports/history/{import_id}` | GET | Get import status |

### 2. Data Models

#### ViolationCreate (Required Fields)
```python
{
  "violation_number": str,  # REQUIRED - Unique identifier
  "title": str,              # REQUIRED - Violation title
  "url": str,                # REQUIRED - Source URL
  "agency_name": str         # REQUIRED - Agency name
}
```

#### ViolationCreate (Optional Fields)
```python
{
  "agency_acronym": str,      # e.g., "CPSC", "FDA"
  "agency_id": str,          # Internal agency ID
  "description": str,         # Detailed description
  "violation_date": datetime, # When violation occurred
  "violation_type": str,     # "RECALL", "WARNING", etc.
  "units_affected": int,     # Number of units
  "injuries": int,           # Injury count
  "deaths": int,             # Death count
  "incidents": int,          # Incident count
  "country": str,            # ISO 3166-1 alpha-2 code
  "region": str,             # Geographic region
  "agency_metadata": dict    # Flexible agency-specific data
}
```

### 3. Import Status Flow

```
PENDING → PROCESSING → COMPLETED / PARTIAL / FAILED
```

- **PENDING**: Import queued, not started
- **PROCESSING**: Import in progress (check `progress` field)
- **COMPLETED**: All items imported successfully
- **PARTIAL**: Some items imported, some failed (check `errors`)
- **FAILED**: Import completely failed (check `error_summary`)

### 4. Field Mapping Rules

Common source field names and their target mappings:

| Source Field | Target Field | Notes |
|--------------|-------------|-------|
| `recall_number`, `id`, `number` | `violation_number` | Auto-detected |
| `title`, `name`, `subject` | `title` | Auto-detected |
| `recall_date`, `date`, `issued_date` | `violation_date` | Auto-detected |
| `units_sold`, `units`, `quantity` | `units_affected` | Auto-detected |
| `injuries`, `injury_count` | `injuries` | Auto-detected |
| `deaths`, `death_count` | `deaths` | Auto-detected |
| `incidents`, `incident_count` | `incidents` | Auto-detected |
| `country`, `country_code` | `country` | Auto-detected |
| `agency_name`, `agency` | `agency_name` | Auto-detected |

### 5. Error Patterns

The agent should recognize and handle:

1. **Validation Errors**
   - Pattern: `"{field}: Field required"`
   - Solution: Check field mapping or provide defaults

2. **File Size Errors**
   - Pattern: `"File too large. Maximum size is {size}MB"`
   - Solution: Split file or increase limit

3. **Format Errors**
   - Pattern: `"Invalid JSON format"` or `"CSV parsing error"`
   - Solution: Validate file before upload

4. **API Errors**
   - Pattern: `"HTTP {code}"` (401, 403, 500, etc.)
   - Solution: Check credentials, retry, or alert

---

## Agent Configuration

The agent should support configuration for:

### 1. API Connection
```json
{
  "api_base_url": "http://localhost:8000/api",
  "timeout_seconds": 30,
  "retry_attempts": 3,
  "retry_delay_seconds": 5
}
```

### 2. Import Settings
```json
{
  "default_agency_name": "Consumer Product Safety Commission",
  "auto_classify_risk": true,
  "auto_investigate": true,
  "poll_interval_seconds": 2,
  "import_timeout_seconds": 300
}
```

### 3. Scheduled Imports
```json
{
  "scheduled_imports": [
    {
      "name": "CPSC Daily",
      "type": "api",
      "schedule": "0 2 * * *",
      "api_url": "https://www.saferproducts.gov/api/recalls",
      "agency_name": "Consumer Product Safety Commission"
    }
  ]
}
```

---

## Workflow Patterns Agent Should Support

### Pattern 1: File Upload with Preview
1. Preview file to understand structure
2. Use auto-detected mappings or create custom ones
3. Upload file with mappings
4. Monitor progress
5. Handle results

### Pattern 2: API Import
1. Configure API connection (URL, auth, headers)
2. Make API request
3. Parse response (handle different formats)
4. Import violations
5. Handle errors

### Pattern 3: Scheduled Import
1. Run on schedule (cron)
2. Fetch data from source
3. Import violations
4. Log results
5. Alert on high-risk violations

### Pattern 4: Error Recovery
1. Detect failure
2. Analyze error type
3. Retry with backoff
4. Log failures
5. Alert if persistent

---

## What the Agent Should NOT Do

1. **Don't modify core import logic** - Use existing endpoints
2. **Don't bypass validation** - Always use proper field mappings
3. **Don't ignore errors** - Always handle and log errors
4. **Don't overload system** - Respect rate limits and timeouts
5. **Don't skip progress monitoring** - Always track large imports

---

## Testing Requirements

Before deploying, the agent should be tested for:

1. ✅ File upload (small and large files)
2. ✅ API import (with and without auth)
3. ✅ Field mapping (auto and manual)
4. ✅ Progress monitoring
5. ✅ Error handling (validation, network, timeout)
6. ✅ Partial success scenarios
7. ✅ Scheduled imports
8. ✅ Concurrent imports

---

## Documentation Files

The agent should reference:

1. **AGENT_IMPORT_GUIDE.md** - Complete guide with examples
2. **AGENT_IMPORT_QUICK_REFERENCE.md** - Quick lookup
3. **AGENT_REQUIREMENTS.md** - This file (capabilities needed)

---

## Integration Points

The agent will interact with:

1. **Import API** (`/api/imports/*`) - Primary interface
2. **Violations API** (`/api/violations/*`) - Query imported violations
3. **Database** - Via API only (no direct access)
4. **File System** - For reading source files
5. **External APIs** - For fetching violation data

---

## Security Considerations

The agent should:

1. **Never expose API keys** - Store securely
2. **Validate file sources** - Only trusted sources
3. **Sanitize inputs** - Prevent injection attacks
4. **Log activities** - For audit trail
5. **Handle errors gracefully** - Don't expose internals

---

## Performance Guidelines

1. **File Uploads**: Stream large files, don't load into memory
2. **API Calls**: Use async/await for concurrent operations
3. **Polling**: 2-5 second intervals (don't spam)
4. **Timeouts**: 5 minutes for files, 30 seconds for API
5. **Batch Size**: Process in batches of 50-100 items

---

## Next Steps for Agent Development

1. **Read Documentation**: Study `AGENT_IMPORT_GUIDE.md`
2. **Implement HTTP Client**: Support multipart and JSON
3. **Implement File Handler**: CSV/JSON parsing
4. **Implement Progress Monitor**: Polling logic
5. **Implement Error Handler**: Retry and recovery
6. **Test with Sample Data**: Use test files/APIs
7. **Deploy with Monitoring**: Track agent performance

---

**Last Updated:** 2026-01-04
**Version:** 1.0

