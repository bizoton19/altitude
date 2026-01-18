# REST API Import UI Implementation Plan

## Overview

Add REST API import functionality to the ViolationImport component. The backend endpoint `/api/imports/violations/api` is already implemented - we need to add the UI section.

## Current State

### Backend (✅ Complete)
- ✅ Endpoint: `POST /api/imports/violations/api`
- ✅ Supports: HTTP methods (GET, POST, etc.), authentication (Bearer, Basic), flexible response parsing
- ✅ Request model: `ViolationImportRequest` with fields:
  - `api_url` (required)
  - `api_method` (default: "GET")
  - `api_headers` (optional)
  - `api_auth` (optional: `{"type": "bearer|basic", "token": "..."}`)
  - `agency_name` (optional)
  - `organization_id` / `organization_name` (optional)
  - `auto_classify_risk` (default: true)
  - `source_name` (optional)

### Frontend (❌ Missing)
- ❌ API import section in ViolationImport component
- ❌ API function in `src/services/api.js`
- ❌ Form UI for API configuration

## Implementation Plan

### Step 1: Add API Function

**File**: `src/services/api.js`

Add function to call the REST API import endpoint:

```javascript
/**
 * Import violations from a REST API endpoint
 */
export async function importViolationsFromAPI(requestData) {
  return fetchAPI('/imports/violations/api', {
    method: 'POST',
    body: JSON.stringify(requestData),
  });
}
```

**Request Data Structure**:
```javascript
{
  source: 'api',
  api_url: 'https://api.example.com/violations',
  api_method: 'GET', // or 'POST', 'PUT', etc.
  api_headers: {}, // optional custom headers
  api_auth: { // optional
    type: 'bearer', // or 'basic'
    token: 'your-token-here'
  },
  agency_name: 'CPSC',
  organization_id: 'org-123', // optional
  organization_name: 'CPSC', // optional
  auto_classify_risk: true,
  source_name: 'CPSC API Import' // optional
}
```

### Step 2: Add Tabs/Sections to ViolationImport Component

**File**: `src/components/ViolationImport.jsx`

Add import method selection (tabs or toggle):

1. **Option A: Tabs** (Recommended - clearer separation)
   - Tab 1: "File Upload" (existing)
   - Tab 2: "REST API" (new)

2. **Option B: Accordion/Sections**
   - Section 1: "Upload File"
   - Section 2: "Import from API"

**Recommendation**: Use tabs for cleaner UX

### Step 3: Create REST API Import Form

**Form Fields**:

1. **API Configuration**
   - API URL (required, text input, URL validation)
   - HTTP Method (dropdown: GET, POST, PUT, PATCH, DELETE - default: GET)
   - Custom Headers (optional, JSON textarea or key-value pairs)

2. **Authentication** (optional)
   - Auth Type (dropdown: None, Bearer Token, Basic Auth)
   - Token/Credentials (text input, password type)

3. **Organization Settings** (reuse from file import)
   - Organization (auto-populated from current user)
   - Agency Name (text input)
   - Auto-classify Risk (checkbox, default: true)

4. **Metadata**
   - Source Name (optional, text input)
   - Notes (optional, textarea)

5. **Actions**
   - "Test Connection" button (preview API response)
   - "Import" button

### Step 4: Add Test Connection/Preview Feature

**Optional Enhancement**: Before importing, allow users to test the API connection and preview the response to verify field mapping.

**Implementation**:
- Add "Test Connection" button
- Call API endpoint in preview mode (or create separate preview endpoint)
- Display sample response data
- Show field mapping suggestions

**For MVP**: Can skip this and go straight to import (backend handles field mapping automatically)

### Step 5: Error Handling & Results Display

Reuse existing result display pattern from file import:
- Show import status (completed, partial, failed)
- Display success/failure counts
- Show errors if any
- Display created violation IDs

## UI Design

### Layout Structure

```
┌─────────────────────────────────────┐
│  Import Violations                  │
├─────────────────────────────────────┤
│  [File Upload] [REST API]  ← Tabs  │
├─────────────────────────────────────┤
│                                     │
│  API Configuration:                 │
│  ┌─────────────────────────────┐   │
│  │ API URL: [____________]     │   │
│  │ Method:  [GET ▼]            │   │
│  └─────────────────────────────┘   │
│                                     │
│  Authentication:                    │
│  ┌─────────────────────────────┐   │
│  │ Type: [Bearer Token ▼]      │   │
│  │ Token: [____________]        │   │
│  └─────────────────────────────┘   │
│                                     │
│  Organization:                      │
│  ┌─────────────────────────────┐   │
│  │ Agency: [CPSC]              │   │
│  │ ☑ Auto-classify Risk        │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Test Connection] [Import]         │
└─────────────────────────────────────┘
```

### Styling

- Follow existing glass theme CSS variables
- Use `glass-panel` class for containers
- Use `glass-input` class for inputs
- Match styling of file import section

## Implementation Details

### State Management

Add new state variables:

```javascript
const [importMethod, setImportMethod] = useState('file') // 'file' or 'api'

// API import state
const [apiUrl, setApiUrl] = useState('')
const [apiMethod, setApiMethod] = useState('GET')
const [apiHeaders, setApiHeaders] = useState({})
const [authType, setAuthType] = useState('none') // 'none', 'bearer', 'basic'
const [authToken, setAuthToken] = useState('')
const [sourceName, setSourceName] = useState('')
```

### Form Validation

- Validate API URL format (must be valid HTTP/HTTPS URL)
- If auth type is selected, require token
- Require agency_name (or use organization default)

### API Request Building

```javascript
const handleAPIImport = async () => {
  setLoading(true)
  setError(null)
  
  try {
    const requestData = {
      source: 'api',
      api_url: apiUrl,
      api_method: apiMethod,
      agency_name: currentOrganization?.organization_name || agencyName,
      organization_id: organizationId,
      auto_classify_risk: autoClassifyRisk,
      source_name: sourceName || `API Import: ${apiUrl}`
    }
    
    // Add auth if provided
    if (authType !== 'none' && authToken) {
      requestData.api_auth = {
        type: authType,
        token: authToken
      }
    }
    
    // Add custom headers if provided
    if (Object.keys(apiHeaders).length > 0) {
      requestData.api_headers = apiHeaders
    }
    
    const result = await api.importViolationsFromAPI(requestData)
    setResult(result)
  } catch (err) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}
```

## Files to Modify

1. **src/services/api.js**
   - Add `importViolationsFromAPI()` function

2. **src/components/ViolationImport.jsx**
   - Add import method tabs/selector
   - Add API import form section
   - Add API import state management
   - Add API import handler function
   - Reuse existing result display

## Testing Checklist

- [ ] API URL validation works
- [ ] HTTP method selection works
- [ ] Bearer token authentication works
- [ ] Basic auth works (if implemented)
- [ ] Custom headers are sent correctly
- [ ] Organization/agency settings are applied
- [ ] Auto-classify risk setting is respected
- [ ] Error handling displays correctly
- [ ] Import results display correctly
- [ ] Success/failure counts are accurate
- [ ] Created violation IDs are shown
- [ ] Form resets after successful import

## Future Enhancements (Not in MVP)

1. **API Response Preview**
   - Test connection button
   - Preview sample data before import
   - Field mapping preview

2. **Saved API Configurations**
   - Save frequently used API configs
   - Quick-select from saved configs

3. **Scheduled Imports**
   - Schedule recurring API imports
   - Integration with APScheduler

4. **API Response Mapping**
   - Advanced field mapping for API responses
   - Handle nested JSON structures
   - Map array responses vs single object responses

5. **Multiple API Endpoints**
   - Import from multiple APIs in one operation
   - Merge results from different sources

## Success Criteria

✅ Users can import violations from REST APIs via UI
✅ API authentication (Bearer token) works
✅ Custom HTTP methods are supported
✅ Error handling is clear and helpful
✅ Import results are displayed accurately
✅ UI matches existing design patterns
✅ Code is maintainable and follows existing patterns

## Timeline Estimate

- **Step 1** (API function): 15 minutes
- **Step 2** (Tabs/sections): 30 minutes
- **Step 3** (Form UI): 2-3 hours
- **Step 4** (Test connection - optional): 1-2 hours (skip for MVP)
- **Step 5** (Error handling - reuse existing): 30 minutes
- **Testing**: 1 hour

**Total**: ~4-5 hours for MVP (without test connection feature)
