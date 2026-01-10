# Agent-Based Violation Import Implementation Plan

## Overview

Instead of manually coding importers for each source (API, database, CSV), we'll use an AI agent with MCP (Model Context Protocol) tools to intelligently handle violation imports. The agent will:
- Connect to various data sources
- Understand data schemas
- Map fields automatically
- Handle different formats (API JSON, database tables, CSV files)
- Create violations with proper field mapping

## Current Infrastructure ✅

### What We Already Have:
1. **MCP Server** (`backend/app/mcp/server.py`)
   - Model Context Protocol implementation
   - Tool-based architecture for AI agents
   - Already has tools for: search_recalls, get_recall_details, search_marketplaces, etc.

2. **Agent Models** (`backend/app/models/agent.py`)
   - `TaskType` enum (includes `FETCH_RECALLS`)
   - `SearchTask` model for task execution
   - `AgentConfig` for agent settings

3. **Agent Router** (`backend/app/routers/agent.py`)
   - Endpoints for agent management
   - Task creation and status tracking

## What We Need to Add

### 1. New MCP Tools for Violation Import

Add these tools to `backend/app/mcp/server.py`:

#### Tool 1: `import_violations_from_api`
```python
{
    "name": "import_violations_from_api",
    "description": "Import violations from a REST API endpoint. The agent will fetch data, understand the schema, and map fields to violation format.",
    "inputSchema": {
        "type": "object",
        "properties": {
            "api_url": {"type": "string", "description": "API endpoint URL"},
            "api_key": {"type": "string", "description": "Optional API key for authentication"},
            "auth_type": {"type": "string", "enum": ["none", "bearer", "api_key", "basic"], "default": "none"},
            "method": {"type": "string", "enum": ["GET", "POST"], "default": "GET"},
            "request_body": {"type": "object", "description": "Optional request body for POST requests"},
            "field_mapping": {"type": "object", "description": "Optional manual field mapping (if agent can't auto-detect)"},
            "limit": {"type": "integer", "description": "Maximum violations to import"}
        },
        "required": ["api_url"]
    }
}
```

#### Tool 2: `import_violations_from_database`
```python
{
    "name": "import_violations_from_database",
    "description": "Import violations from a database connection. Supports PostgreSQL, MySQL, SQLite. Agent will query, understand schema, and map fields.",
    "inputSchema": {
        "type": "object",
        "properties": {
            "database_type": {"type": "string", "enum": ["postgresql", "mysql", "sqlite"], "description": "Database type"},
            "connection_string": {"type": "string", "description": "Database connection string"},
            "table_name": {"type": "string", "description": "Table name to query"},
            "query": {"type": "string", "description": "Optional custom SQL query (if not using table_name)"},
            "field_mapping": {"type": "object", "description": "Optional manual field mapping"},
            "limit": {"type": "integer", "description": "Maximum violations to import"}
        },
        "required": ["database_type", "connection_string"]
    }
}
```

#### Tool 3: `import_violations_from_csv`
```python
{
    "name": "import_violations_from_csv",
    "description": "Import violations from a CSV file. Agent will parse CSV, detect headers, and map columns to violation fields.",
    "inputSchema": {
        "type": "object",
        "properties": {
            "file_path": {"type": "string", "description": "Path to CSV file (local or URL)"},
            "file_url": {"type": "string", "description": "URL to CSV file (if remote)"},
            "file_content": {"type": "string", "description": "Base64 encoded CSV content (if uploading)"},
            "has_header": {"type": "boolean", "default": true, "description": "Whether CSV has header row"},
            "delimiter": {"type": "string", "default": ",", "description": "CSV delimiter"},
            "field_mapping": {"type": "object", "description": "Optional manual field mapping"},
            "skip_rows": {"type": "integer", "default": 0, "description": "Number of rows to skip"}
        },
        "required": ["file_path", "file_url", "file_content"]  # One of these
    }
}
```

#### Tool 4: `create_violation` (Already exists but verify)
```python
{
    "name": "create_violation",
    "description": "Create a new violation in the system. Used by import tools after mapping fields.",
    "inputSchema": {
        "type": "object",
        "properties": {
            "violation_data": {
                "type": "object",
                "description": "Violation data matching ViolationCreate schema"
            }
        },
        "required": ["violation_data"]
    }
}
```

### 2. New Task Type

Add to `backend/app/models/agent.py`:
```python
class TaskType(str, Enum):
    SEARCH_MARKETPLACE = "search_marketplace"
    VISUAL_SEARCH = "visual_search"
    FETCH_RECALLS = "fetch_recalls"
    ANALYZE_LISTING = "analyze_listing"
    IMPORT_VIOLATIONS = "import_violations"  # NEW
```

### 3. Violation Import Model

Create `backend/app/models/violation_import.py`:
```python
class ViolationImportSource(str, Enum):
    API = "api"
    DATABASE = "database"
    CSV = "csv"
    MANUAL = "manual"
    AGENT = "agent"

class ViolationImport(BaseModel):
    import_id: str
    name: str
    description: Optional[str] = None
    source_type: ViolationImportSource
    source_config: Dict[str, Any]  # Source-specific configuration
    schedule: Optional[str] = None  # Cron expression
    enabled: bool = True
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    violations_imported: int = 0
    last_import_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

### 4. Agent Service for Import Tasks

Create `backend/app/services/violation_import_agent.py`:
```python
"""
Agent service for violation imports.
Uses MCP tools to let AI agent handle import logic.
"""

async def execute_import_task(import_config: ViolationImport):
    """
    Execute a violation import task using the agent.
    The agent will:
    1. Connect to the source (API/DB/CSV)
    2. Fetch/query data
    3. Understand schema and map fields
    4. Create violations
    """
    # This will call the MCP server with appropriate tools
    # The agent (Claude/GPT) will handle the actual import logic
    pass
```

### 5. MCP Tool Implementations

Add tool handlers to `backend/app/mcp/server.py`:

```python
async def handle_tool_call(self, tool_name: str, arguments: dict):
    """Handle tool calls from the agent."""
    if tool_name == "import_violations_from_api":
        return await self._import_from_api(arguments)
    elif tool_name == "import_violations_from_database":
        return await self._import_from_database(arguments)
    elif tool_name == "import_violations_from_csv":
        return await self._import_from_csv(arguments)
    # ... existing tools
```

## Implementation Steps

### Step 1: Extend MCP Server with Import Tools
- [ ] Add new tool definitions to `_define_tools()`
- [ ] Implement tool handlers:
  - [ ] `_import_from_api()` - HTTP client, JSON parsing, field detection
  - [ ] `_import_from_database()` - DB connection, schema inspection, query execution
  - [ ] `_import_from_csv()` - CSV parsing, header detection, field mapping
- [ ] Add `create_violation` tool if not exists

### Step 2: Create Violation Import Models
- [ ] Create `violation_import.py` model file
- [ ] Add import-related fields to `Violation` model
- [ ] Create import configuration models

### Step 3: Create Import Task Service
- [ ] Create `violation_import_agent.py` service
- [ ] Implement task execution that calls MCP tools
- [ ] Add field mapping intelligence (agent will handle this)

### Step 4: Create API Endpoints
- [ ] `POST /api/violation-imports/` - Create import configuration
- [ ] `GET /api/violation-imports/` - List imports
- [ ] `POST /api/violation-imports/{id}/run` - Trigger import (creates agent task)
- [ ] `GET /api/violation-imports/{id}/history` - Import history

### Step 5: Frontend UI
- [ ] Add "Violation Imports" section to Settings
- [ ] Create import configuration form:
  - [ ] Source type selector (API/Database/CSV)
  - [ ] Source-specific configuration fields
  - [ ] Schedule configuration
  - [ ] Field mapping preview (agent will suggest)
- [ ] Import history view
- [ ] Manual trigger button

## Dependencies Needed

### Python Packages:
```python
# Already in requirements.txt:
httpx>=0.27.0  # For API calls
aiohttp>=3.10.0  # For async HTTP

# Need to add:
pandas>=2.0.0  # For CSV parsing and data manipulation
sqlalchemy>=2.0.30  # Already have, for database connections
psycopg2-binary>=2.9.0  # PostgreSQL support
pymysql>=1.1.0  # MySQL support
python-dateutil>=2.9.0  # Already have, for date parsing
```

### MCP Client/Agent:
- **Claude (Anthropic)** - Via MCP SDK
- **GPT-4** - Via OpenAI MCP SDK
- Or any MCP-compatible agent

## How It Works

### Example: Import from CPSC API

1. **User Configures Import:**
   ```
   Source: API
   URL: https://www.cpsc.gov/api/recalls
   Auth: None
   Schedule: Daily at 2 AM
   ```

2. **System Creates Import Task:**
   - Creates `ViolationImport` record
   - Schedules task via APScheduler

3. **Agent Executes Import:**
   - Agent receives task via MCP
   - Calls `import_violations_from_api` tool with:
     ```json
     {
       "api_url": "https://www.cpsc.gov/api/recalls",
       "method": "GET"
     }
     ```
   - Tool fetches data, agent analyzes schema
   - Agent maps fields intelligently:
     - `recall_number` → `violation_number`
     - `title` → `title`
     - `hazards` → `hazards[]`
     - etc.
   - Agent calls `create_violation` for each record

4. **Results:**
   - Violations created in database
   - Import history updated
   - User notified of results

### Example: Import from CSV Upload

1. **User Uploads CSV:**
   ```
   File: violations.csv
   Columns: Recall Number, Product Name, Hazard Description, Date
   ```

2. **Agent Processes:**
   - Calls `import_violations_from_csv` tool
   - Agent detects headers and data types
   - Agent maps columns:
     - "Recall Number" → `violation_number`
     - "Product Name" → `products[0].name`
     - "Hazard Description" → `hazards[0].description`
     - "Date" → `violation_date`
   - Creates violations

## Field Mapping Intelligence

The agent will:
1. **Detect field names** from source (column names, JSON keys, DB columns)
2. **Match semantically** using embeddings/similarity:
   - "Recall Number" ≈ "violation_number"
   - "Product Name" ≈ "products.name"
   - "Hazard" ≈ "hazards.description"
3. **Handle nested data** (products, hazards, remedies arrays)
4. **Parse dates** in various formats
5. **Extract agency info** from source data
6. **Suggest mappings** to user for approval

## Benefits of Agent Approach

1. **No Manual Coding** - Agent handles field mapping
2. **Flexible** - Works with any API/DB/CSV schema
3. **Intelligent** - Understands semantic meaning
4. **Self-Improving** - Can learn from user corrections
5. **Handles Edge Cases** - Different date formats, nested data, etc.

## Next Steps to Start

### Minimum Viable Implementation:

1. **Add MCP Import Tools** (2-3 hours)
   - Add tool definitions
   - Implement basic handlers (API, CSV, DB)
   - Add `create_violation` tool

2. **Create Import Models** (1 hour)
   - ViolationImport model
   - Add import fields to Violation

3. **Create Import Task Endpoint** (1 hour)
   - POST endpoint to create import task
   - Task calls MCP tools via agent

4. **Test with Simple CSV** (1 hour)
   - Upload CSV
   - Agent imports and maps fields
   - Verify violations created

### Full Implementation:

5. **Add Scheduling** (2 hours)
   - APScheduler integration
   - Cron expression parsing
   - Scheduled import execution

6. **Frontend UI** (4-6 hours)
   - Import configuration form
   - Import history view
   - Field mapping preview/edit

7. **Error Handling & Logging** (2 hours)
   - Import error tracking
   - Retry logic
   - Detailed logging

## Testing Strategy

1. **Unit Tests:**
   - MCP tool handlers
   - Field mapping logic
   - Data parsing

2. **Integration Tests:**
   - End-to-end import flow
   - Agent task execution
   - Violation creation

3. **Manual Tests:**
   - Import from CPSC API
   - Import from sample CSV
   - Import from test database

## Questions to Answer

1. **Which LLM/Agent?**
   - Claude (Anthropic) - Best for structured tasks
   - GPT-4 (OpenAI) - Good general purpose
   - Local model (Ollama) - Privacy, cost

2. **MCP Host?**
   - Claude Desktop (if using Claude)
   - Custom MCP client
   - Direct API integration

3. **Field Mapping UI?**
   - Show agent's suggested mapping
   - Allow user to edit before import
   - Save mapping for reuse

4. **Error Handling?**
   - What if agent can't map fields?
   - What if source data is malformed?
   - Retry logic?

## Estimated Timeline

- **MVP (Basic Import)**: 1-2 days
- **Full Implementation**: 1-2 weeks
- **Production Ready**: 2-3 weeks (with testing, error handling, UI)

## Files to Create/Modify

### New Files:
- `backend/app/models/violation_import.py`
- `backend/app/services/violation_import_agent.py`
- `backend/app/routers/violation_imports.py`
- `src/components/ViolationImportManager.jsx`
- `src/components/ViolationImportForm.jsx`

### Modified Files:
- `backend/app/mcp/server.py` - Add import tools
- `backend/app/models/agent.py` - Add IMPORT_VIOLATIONS task type
- `backend/app/models/violation.py` - Add import fields
- `backend/app/services/database.py` - Add import storage
- `backend/requirements.txt` - Add pandas, psycopg2-binary, pymysql
- `src/components/MarketplaceManager.jsx` - Add imports section



