# Flexible File Import Enhancement Plan

## Overview

Enhance the violation import system to support flexible file imports (CSV and JSON) with:
- Unified file import endpoint
- File type auto-detection (or user-specified)
- File type validation (CSV/JSON only)
- Field mapping (auto-detect or manual)
- Extended fields support
- Save to database

## Current State

- ✅ `/api/imports/violations/csv` endpoint exists for CSV imports
- ✅ Field mapping support (manual and auto-detect)
- ✅ Extended fields via `agency_metadata` in ViolationCreate model
- ❌ No JSON import support
- ❌ No unified file import endpoint

## Requirements

### 1. New Unified Endpoint
- **Endpoint**: `POST /api/imports/violations/file`
- **Accepts**: File upload (multipart/form-data)
- **Supported formats**: CSV, JSON
- **File type detection**: Auto-detect from file extension or Content-Type header, allow manual override

### 2. File Type Validation
- Only allow CSV and JSON files
- Validate file extension: `.csv`, `.json`
- Validate MIME type: `text/csv`, `application/json`, `text/json`
- Return clear error if unsupported file type

### 3. File Type Detection
- **Priority 1**: User-provided `file_type` parameter (optional)
- **Priority 2**: File extension (.csv, .json)
- **Priority 3**: Content-Type header
- **Default**: Attempt to detect from content (JSON parsing first, then CSV)

### 4. Field Mapping
- **Auto-detection**: Intelligently map common field names
- **Manual mapping**: Allow user to provide field mapping JSON
- **Extended fields**: Map unmapped fields to `agency_metadata` dictionary
- Support nested JSON structures (flatten for CSV-like processing)

### 5. Extended Fields Support
- All fields not in standard ViolationCreate schema go to `agency_metadata`
- Preserve field names and values
- Allow nested structures from JSON

### 6. Processing Pipeline
1. Validate file type
2. Parse file (CSV or JSON)
3. Detect/suggest field mappings
4. Apply field mappings
5. Map extended fields to `agency_metadata`
6. Validate required fields
7. Process each violation through workflow service
8. Save to database
9. Return import result

## Implementation Plan

### Phase 1: Unified File Import Endpoint

#### 1.1 Create New Endpoint
**File**: `backend/app/routers/imports.py`

**Endpoint Signature**:
```python
@router.post("/violations/file", response_model=ViolationImportResult)
async def import_violations_from_file(
    file: UploadFile = File(...),
    file_type: Optional[str] = Form(None),  # "csv" or "json", auto-detect if None
    delimiter: str = Form(","),  # For CSV only
    has_header: bool = Form(True),  # For CSV only
    field_mapping: Optional[str] = Form(None),  # JSON string: {"file_field": "violation_field"}
    agency_name: Optional[str] = Form(None),
    agency_id: Optional[str] = Form(None),
    auto_classify_risk: bool = Form(True),
    auto_investigate: bool = Form(True),
    source_name: Optional[str] = Form("File Upload")
)
```

#### 1.2 File Type Detection Function
```python
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
```

#### 1.3 File Type Validation Function
```python
def validate_file_type(file_type: str) -> bool:
    """Validate that file type is CSV or JSON only."""
    return file_type.lower() in ("csv", "json")
```

### Phase 2: JSON Parsing Support

#### 2.1 JSON Parser Function
```python
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
    - Field mapping application
    """
```

#### 2.2 JSON Structure Support
- Single object: `{"violation_number": "...", ...}`
- Array of objects: `[{"violation_number": "..."}, ...]`
- Wrapped array: `{"data": [...], "violations": [...], "results": [...]}`
- Auto-detect common wrapper keys: "data", "violations", "results", "items", "recalls"

### Phase 3: Enhanced Field Mapping

#### 3.1 Field Mapping Function
```python
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
```

#### 3.2 Auto-Detection Rules
- Common field name mappings:
  - "violation_number", "recall_number", "id", "number" → violation_number
  - "title", "name", "subject" → title
  - "description", "details", "summary" → description
  - "violation_date", "recall_date", "date", "issued_date" → violation_date
  - "units_affected", "units_sold", "units", "quantity" → units_affected
  - "injuries", "injury_count" → injuries
  - "deaths", "death_count" → deaths
  - "incidents", "incident_count" → incidents
  - "country", "country_code" → country
  - "agency_name", "agency" → agency_name

#### 3.3 Extended Fields Handling
- All unmapped fields → `agency_metadata`
- Preserve original field names
- Support nested structures (store as nested dict in metadata)
- Handle arrays (store as arrays in metadata)

### Phase 4: Unified Processing

#### 4.1 Main Import Function
```python
async def process_file_import(
    file: UploadFile,
    file_type: Optional[str],
    delimiter: str,
    has_header: bool,
    field_mapping: Optional[Dict[str, str]],
    agency_name: Optional[str],
    agency_id: Optional[str],
    auto_classify_risk: bool,
    auto_investigate: bool,
    source_name: str
) -> ViolationImportResult:
    """
    Unified file import processor.
    Handles both CSV and JSON files.
    """
    # 1. Read file content
    # 2. Detect/validate file type
    # 3. Parse file (CSV or JSON)
    # 4. Map fields
    # 5. Process each violation
    # 6. Return result
```

### Phase 5: Backward Compatibility

- Keep existing `/api/imports/violations/csv` endpoint
- Mark as deprecated (optional)
- Redirect documentation to new endpoint
- Both endpoints should work during transition

## File Structure

### New/Modified Files

1. **backend/app/routers/imports.py**
   - Add `import_violations_from_file()` endpoint
   - Add file type detection/validation helpers
   - Add JSON parser function
   - Enhance field mapping function
   - Keep existing CSV endpoint for backward compatibility

2. **backend/app/models/import_models.py** (if needed)
   - Add file type enum: `FileType = Enum("csv", "json")`
   - No model changes needed (reuse existing models)

3. **Frontend** (future)
   - Update ViolationCSVImport component to use new endpoint
   - Support JSON file upload
   - Update file type selector

## API Examples

### CSV Import (new endpoint)
```bash
curl -X POST http://localhost:8000/api/imports/violations/file \
  -F "file=@violations.csv" \
  -F "file_type=csv" \
  -F "delimiter=," \
  -F "has_header=true" \
  -F "agency_name=CPSC" \
  -F "auto_classify_risk=true"
```

### JSON Import
```bash
curl -X POST http://localhost:8000/api/imports/violations/file \
  -F "file=@violations.json" \
  -F "file_type=json" \
  -F "agency_name=CPSC" \
  -F "auto_classify_risk=true"
```

### With Field Mapping
```bash
curl -X POST http://localhost:8000/api/imports/violations/file \
  -F "file=@violations.json" \
  -F "field_mapping={\"recall_id\":\"violation_number\",\"product_name\":\"title\"}" \
  -F "agency_name=CPSC"
```

### JSON File Format Examples

**Single Object**:
```json
{
  "violation_number": "CPSC-2024-001",
  "title": "Recall: Graco Stroller",
  "description": "Choking hazard",
  "units_affected": 50000,
  "custom_field": "value"
}
```

**Array of Objects**:
```json
[
  {
    "violation_number": "CPSC-2024-001",
    "title": "Recall: Graco Stroller"
  },
  {
    "violation_number": "CPSC-2024-002",
    "title": "Recall: Toy Car"
  }
]
```

**Wrapped Array**:
```json
{
  "data": [
    {"violation_number": "CPSC-2024-001", "title": "..."}
  ],
  "total": 1
}
```

## Testing

1. **File Type Validation**
   - Test CSV file upload
   - Test JSON file upload
   - Test invalid file type (should reject)
   - Test auto-detection from extension
   - Test auto-detection from content

2. **Field Mapping**
   - Test auto-detection
   - Test manual mapping
   - Test extended fields mapping to agency_metadata

3. **JSON Parsing**
   - Test single object
   - Test array of objects
   - Test wrapped arrays
   - Test nested structures

4. **Backward Compatibility**
   - Test existing CSV endpoint still works
   - Verify both endpoints produce same results

## Migration Strategy

1. Implement new endpoint
2. Test thoroughly
3. Update frontend to use new endpoint (optional)
4. Keep old endpoint for backward compatibility
5. Document new endpoint as preferred method
6. Eventually deprecate old endpoint (future)

## Summary

This enhancement will provide:
- ✅ Unified file import endpoint
- ✅ CSV and JSON support
- ✅ File type auto-detection
- ✅ File type validation (CSV/JSON only)
- ✅ Enhanced field mapping
- ✅ Extended fields support via agency_metadata
- ✅ Backward compatibility with existing CSV endpoint

