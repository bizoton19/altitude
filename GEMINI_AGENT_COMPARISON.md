# Gemini Agent Architecture Comparison

## 📊 What We've Already Implemented

### ✅ Agent Infrastructure
- **Agent Configuration System** (`AgentConfig` model)
  - LLM provider selection (OpenAI, Anthropic, Ollama, Custom)
  - Model selection and API key management (encrypted)
  - Temperature, max tokens configuration
  - Search frequency, depth, sensitivity settings
  - Auto-alerts and thresholds

- **Agent Monitoring & Control**
  - Real-time status monitoring (`AgentMonitoring.jsx`)
  - Start/Stop controls
  - Task tracking (pending, completed, current task)
  - Uptime and schedule information
  - Auto-refresh capabilities

- **Agent Skills System** (`AgentSkill` model - **just added**)
  - Risk Classification skill
  - Query Builder skill
  - Match Analyzer skill
  - Skill management UI (add, edit, delete, enable/disable)
  - Priority-based skill execution
  - Custom skill configuration (JSON settings)

### ✅ Tool Integrations
- **Visual Search Tools**
  - Google Vision API integration
  - TinEye reverse image search
  - Bing Visual Search
  - Custom webhook support
  - Tool enable/disable and API key management

- **MCP Server** (`backend/app/mcp/server.py`)
  - `search_recalls` - Search recall database
  - `get_recall_details` - Get full recall info
  - `classify_risk` - Risk classification
  - `search_marketplaces` - Search enabled marketplaces
  - `create_search_task` - Background task creation
  - `get_task_status` - Task status checking
  - More tools available...

### ✅ Database & Data Models
- **Violations System**
  - `ProductViolation` model with full schema
  - Agency support (any regulatory agency)
  - Products, hazards, remedies, images
  - Risk classification
  - Violation import tracking (planned)

- **Marketplace Management**
  - Marketplace CRUD operations
  - Monitoring frequency configuration
  - Risk level tracking
  - Notification settings (email, portal, webhook)
  - Portal credentials (encrypted)
  - Platform agreements management

- **Investigation System**
  - Investigation scheduling (APScheduler)
  - Daily, weekly, biweekly, monthly schedules
  - Violation and marketplace associations
  - Region-based filtering
  - Investigation status tracking

### ✅ Skills Implementation
- **Risk Classifier** (`risk_classifier.py`)
  - Calculates risk scores (0.0-1.0)
  - Classifies HIGH/MEDIUM/LOW
  - Uses injuries, deaths, units, hazards

- **Query Builder** (`query_builder.py`)
  - Extracts keywords from recall/violation data
  - Builds optimized search queries
  - Supports model numbers, manufacturers

- **Match Analyzer** (`match_analyzer.py`)
  - Calculates match scores for listings
  - Model number matching
  - Product name similarity
  - Keyword overlap analysis

---

## 📋 What's in Our Plan

### Phase 3: Agent-Based Violation Import
- ✅ **Planned** - Agent-based imports from API, database, CSV
- ✅ **MCP Tools Planned** - Import tools for agent
- ✅ **Scheduled Imports** - Cron-like scheduling support

### Marketplace Search & Analysis
- ✅ **Basic Search** - Marketplace search endpoints exist
- ✅ **Visual Search** - Visual search service implemented
- ⚠️ **Autonomous Searching** - Not yet implemented (agent workflow)

---

## ❌ What Gemini Suggests That's Missing

### 1. ReAct (Reasoning and Acting) Pattern
**Status**: ❌ Not Implemented

**What Gemini Suggests:**
- Agent uses LLM to "think" about what to search
- Agent uses tools to "act" (scrape/search)
- Agent "observes" results and iterates

**What We Need:**
```python
# Agent workflow that loops:
# 1. Think: "What should I search for?"
# 2. Act: Call search tool
# 3. Observe: Analyze results
# 4. Think: "Do I need to refine my search?"
# 5. Repeat until task complete
```

**Implementation Needed:**
- Agent orchestration service
- ReAct loop implementation
- Reasoning prompt templates
- Tool execution coordination

### 2. Headless Browser / Search API Tools
**Status**: ❌ Not Implemented

**What Gemini Suggests:**
- Headless browser for scraping (Puppeteer, Playwright)
- Search API tools (Serper.io, Browse AI)
- HTML/screenshot extraction
- Structured data extraction from HTML

**What We Have:**
- ✅ Basic marketplace search endpoints
- ❌ No headless browser integration
- ❌ No Search API integration (Serper.io, Browse AI)
- ❌ No HTML parsing/extraction tools

**Missing Tools:**
```python
# MCP Tools needed:
- "search_with_browser" - Headless browser search
- "extract_listing_data" - Parse HTML to structured JSON
- "search_with_serper" - Use Serper.io API
- "search_with_browse_ai" - Use Browse AI API
```

### 3. Vision/Safety Analysis Workflow
**Status**: ⚠️ Partially Implemented

**What Gemini Suggests:**
1. Agent finds suspicious listing
2. Send image to Cloud Vision API for OCR
3. Extract model numbers/brand names
4. Compare against recall master list
5. Gemini 1.5 Pro makes final decision

**What We Have:**
- ✅ Google Vision API integration (as tool)
- ✅ Visual search service
- ❌ No OCR extraction workflow
- ❌ No automated decision-making workflow
- ❌ No structured vision → recall matching pipeline

**Missing Implementation:**
```python
# Automated workflow:
async def analyze_listing_for_violations(listing_id):
    # 1. Get listing image
    # 2. Call Cloud Vision OCR
    # 3. Extract model numbers, brands
    # 4. Search recall database
    # 5. Use Gemini to determine match confidence
    # 6. Create detection record
```

### 4. Database Schema for Provenance Tracking
**Status**: ⚠️ Partially Implemented

**What Gemini Suggests:**
```sql
scanned_listings (
    id, url, marketplace_source, timestamp, raw_html
)
detections (
    id, listing_id, violation_id, confidence_score, 
    gemini_reasoning, created_at
)
recall_master (
    id, product_name, model_number, brand, recall_date
)
```

**What We Have:**
- ✅ `MarketplaceListing` model (similar to scanned_listings)
- ✅ `ProductViolation` model (similar to recall_master)
- ❌ No `detections` table with confidence scores
- ❌ No raw HTML storage
- ❌ No Gemini reasoning storage
- ⚠️ Using in-memory storage (not Postgres)

**Missing:**
- Detection model with confidence scores
- Provenance tracking fields
- Database migration to Postgres (we're in-memory)

### 5. Operational Workflow Orchestration
**Status**: ⚠️ Partially Implemented

**What Gemini Suggests:**
1. Cron job triggers agent
2. Agent searches marketplace
3. Agent filters suspicious items
4. Agent analyzes with Vision API
5. Agent validates against recall master
6. Agent creates detection report

**What We Have:**
- ✅ APScheduler for investigation scheduling
- ✅ Investigation workflow exists
- ❌ No autonomous agent workflow
- ❌ No ReAct pattern implementation
- ❌ No automated detection pipeline

**Missing:**
- Agent workflow orchestrator
- Automated detection creation
- Detection reporting system

### 6. Gemini-Specific Tool Definitions
**Status**: ⚠️ Partially Implemented

**What Gemini Suggests:**
- Python code for Gemini SDK tool definitions
- Tool calling interface for Gemini models
- Integration with Gemini 1.5 Flash/Pro

**What We Have:**
- ✅ MCP server with tool definitions
- ✅ Generic LLM provider support
- ❌ No Gemini-specific tool wrappers
- ❌ No Gemini SDK integration
- ❌ No Gemini-specific prompt templates

---

## 🎯 Implementation Priority

### High Priority (Critical for Autonomous Operation)

1. **ReAct Pattern Implementation** ⭐⭐⭐
   - Agent orchestration service
   - Reasoning loop
   - Tool execution coordination

2. **Headless Browser / Search API Tools** ⭐⭐⭐
   - Add Serper.io or Browse AI integration
   - HTML extraction tools
   - Structured data parsing

3. **Vision Analysis Workflow** ⭐⭐
   - OCR extraction pipeline
   - Automated decision-making
   - Detection creation workflow

### Medium Priority (Important but not blocking)

4. **Database Migration to Postgres** ⭐⭐
   - Move from in-memory to Postgres
   - Add provenance tracking fields
   - Detection model creation

5. **Operational Workflow** ⭐⭐
   - Complete automation pipeline
   - Detection reporting
   - Alert system integration

### Low Priority (Nice to have)

6. **Gemini-Specific Integration** ⭐
   - Gemini SDK wrappers
   - Gemini-specific prompts
   - Optimized for Gemini models

---

## 🚀 Recommended Next Steps

### Step 1: Add ReAct Pattern Agent Service
Create `backend/app/services/agent_orchestrator.py`:
- Implement ReAct loop
- Coordinate LLM reasoning with tool execution
- Handle iterative search refinement

### Step 2: Add Search API Tools
- Integrate Serper.io or Browse AI
- Add HTML extraction tool
- Create structured data parser

### Step 3: Create Detection Model
- Add `Detection` model with confidence scores
- Store Gemini reasoning
- Link to listings and violations

### Step 4: Implement Vision Analysis Pipeline
- OCR extraction workflow
- Automated matching logic
- Detection creation automation

### Step 5: Database Migration (Optional but Recommended)
- Migrate to Postgres
- Add provenance tracking
- Enable scalable storage

---

## 💰 Cost Considerations (Already Accounted For)

✅ **Token Management** - We track LLM usage in agent config
✅ **Vision Costs** - We have Google Vision integration with cost awareness
✅ **Database Costs** - Currently in-memory (free), Postgres migration will add costs

---

## 📝 Summary

**What We're Missing:**
1. ReAct pattern for autonomous reasoning
2. Headless browser/Search API integration
3. Complete vision analysis automation
4. Detection model with confidence tracking
5. Operational workflow orchestration
6. Gemini-specific tool wrappers

**What We Have (Advantages):**
1. ✅ Full agent infrastructure
2. ✅ Skills system (configurable)
3. ✅ MCP server (agent-ready)
4. ✅ Investigation scheduling
5. ✅ Visual search capabilities
6. ✅ Marketplace management

**Recommendation:** 
Start with **ReAct pattern + Search API tools** to enable true autonomous operation. Then add **vision analysis pipeline** for automated detection. The database migration can come later as we scale.

