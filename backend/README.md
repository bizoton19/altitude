# Altitude Recall Monitor - Backend

Python FastAPI backend with MCP (Model Context Protocol) server for AI agent integration.

## 🚀 Quick Run with uv

**Easiest way to run the backend:**

```bash
# From project root
npm run backend

# Or from backend directory
cd backend && ./run.sh

# Or directly with uv
cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Install uv** (if needed): `curl -LsSf https://astral.sh/uv/install.sh | sh`

## Architecture

```
backend/
├── app/
│   ├── main.py              # FastAPI application entry
│   ├── config.py            # Configuration settings
│   ├── models/              # Pydantic data models
│   │   ├── recall.py        # Recall data models
│   │   ├── marketplace.py   # Marketplace models
│   │   └── agent.py         # Agent configuration models
│   ├── routers/             # API route handlers
│   │   ├── recalls.py       # /api/recalls endpoints
│   │   ├── marketplaces.py  # /api/marketplaces endpoints
│   │   ├── search.py        # /api/search endpoints
│   │   └── agent.py         # /api/agent endpoints
│   ├── services/            # Business logic services
│   │   ├── database.py      # In-memory data storage
│   │   ├── cpsc_api.py      # CPSC API integration
│   │   └── visual_search.py # Visual search providers
│   ├── skills/              # Agent skills (internal logic)
│   │   ├── risk_classifier.py  # Risk classification
│   │   ├── query_builder.py    # Search query generation
│   │   └── match_analyzer.py   # Listing match analysis
│   └── mcp/                 # MCP server implementation
│       └── server.py        # MCP tools and resources
├── run.py                   # FastAPI server entry point
├── run_mcp.py              # MCP server entry point
└── requirements.txt         # Python dependencies
```

## Quick Start

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the API Server

```bash
python run.py
```

The API will be available at `http://localhost:8000`

- API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

## MCP Server

The MCP server allows AI agents (like Claude) to interact with the recall monitoring system.

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `search_recalls` | Search recalls by text query |
| `get_recall_details` | Get full details of a recall |
| `classify_risk` | Classify risk level for given parameters |
| `search_marketplaces` | Search enabled marketplaces for recalled products |
| `get_marketplace_listings` | Get listings found for a recall |
| `list_marketplaces` | List all configured marketplaces |
| `toggle_marketplace` | Enable/disable a marketplace |
| `get_risk_summary` | Get counts by risk level |
| `get_latest_recalls` | Get most recent recalls |
| `build_search_query` | Generate search queries from recall data |

### Available MCP Resources

| URI | Description |
|-----|-------------|
| `altitude://recalls/all` | All recalls in database |
| `altitude://recalls/high-risk` | High-risk recalls only |
| `altitude://marketplaces/enabled` | Enabled marketplaces |
| `altitude://config/agent` | Agent configuration |

### Running MCP Server Standalone

```bash
python run_mcp.py
```

### Claude Desktop Integration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "altitude-recall-monitor": {
      "command": "python",
      "args": ["/path/to/altitude/backend/run_mcp.py"],
      "env": {
        "PYTHONPATH": "/path/to/altitude/backend"
      }
    }
  }
}
```

## API Endpoints

### Recalls

- `GET /api/recalls/` - List all recalls
- `GET /api/recalls/summary` - Risk level counts
- `GET /api/recalls/search?q=query` - Search recalls
- `GET /api/recalls/{recall_id}` - Get recall details
- `GET /api/recalls/{recall_id}/listings` - Get marketplace listings

### Marketplaces

- `GET /api/marketplaces/` - List marketplaces
- `POST /api/marketplaces/` - Add marketplace
- `PATCH /api/marketplaces/{id}` - Update settings
- `POST /api/marketplaces/{id}/toggle` - Toggle enabled

### Search

- `POST /api/search/marketplace` - Search marketplaces
- `POST /api/search/task` - Create background task
- `GET /api/search/task/{id}` - Get task status
- `POST /api/search/visual` - Visual search
- `POST /api/search/visual/recall/{id}` - Visual search using recall images

### Agent

- `GET /api/agent/config` - Get agent config
- `PATCH /api/agent/config` - Update config
- `GET /api/agent/status` - Get agent status
- `POST /api/agent/start` - Start agent
- `POST /api/agent/stop` - Stop agent
- `GET /api/agent/tools` - List tool integrations
- `PATCH /api/agent/tools/{type}` - Update tool

## Skills vs MCP Tools

**Skills** are internal processing functions used by the backend:
- Risk classification algorithm
- Search query building
- Match score calculation

**MCP Tools** are external actions for AI agents:
- Database queries
- Marketplace searches
- Configuration changes

Skills are used *by* MCP tools, not exposed as tools themselves.

## Environment Variables

Copy `env.template` to `.env` and configure:

```
HOST=0.0.0.0
PORT=8000
DEBUG=true
GOOGLE_VISION_API_KEY=your_key_here
TINEYE_API_KEY=your_key_here
```




Python FastAPI backend with MCP (Model Context Protocol) server for AI agent integration.

## Architecture

```
backend/
├── app/
│   ├── main.py              # FastAPI application entry
│   ├── config.py            # Configuration settings
│   ├── models/              # Pydantic data models
│   │   ├── recall.py        # Recall data models
│   │   ├── marketplace.py   # Marketplace models
│   │   └── agent.py         # Agent configuration models
│   ├── routers/             # API route handlers
│   │   ├── recalls.py       # /api/recalls endpoints
│   │   ├── marketplaces.py  # /api/marketplaces endpoints
│   │   ├── search.py        # /api/search endpoints
│   │   └── agent.py         # /api/agent endpoints
│   ├── services/            # Business logic services
│   │   ├── database.py      # In-memory data storage
│   │   ├── cpsc_api.py      # CPSC API integration
│   │   └── visual_search.py # Visual search providers
│   ├── skills/              # Agent skills (internal logic)
│   │   ├── risk_classifier.py  # Risk classification
│   │   ├── query_builder.py    # Search query generation
│   │   └── match_analyzer.py   # Listing match analysis
│   └── mcp/                 # MCP server implementation
│       └── server.py        # MCP tools and resources
├── run.py                   # FastAPI server entry point
├── run_mcp.py              # MCP server entry point
└── requirements.txt         # Python dependencies
```

## Quick Start

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the API Server

```bash
python run.py
```

The API will be available at `http://localhost:8000`

- API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

## MCP Server

The MCP server allows AI agents (like Claude) to interact with the recall monitoring system.

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `search_recalls` | Search recalls by text query |
| `get_recall_details` | Get full details of a recall |
| `classify_risk` | Classify risk level for given parameters |
| `search_marketplaces` | Search enabled marketplaces for recalled products |
| `get_marketplace_listings` | Get listings found for a recall |
| `list_marketplaces` | List all configured marketplaces |
| `toggle_marketplace` | Enable/disable a marketplace |
| `get_risk_summary` | Get counts by risk level |
| `get_latest_recalls` | Get most recent recalls |
| `build_search_query` | Generate search queries from recall data |

### Available MCP Resources

| URI | Description |
|-----|-------------|
| `altitude://recalls/all` | All recalls in database |
| `altitude://recalls/high-risk` | High-risk recalls only |
| `altitude://marketplaces/enabled` | Enabled marketplaces |
| `altitude://config/agent` | Agent configuration |

### Running MCP Server Standalone

```bash
python run_mcp.py
```

### Claude Desktop Integration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "altitude-recall-monitor": {
      "command": "python",
      "args": ["/path/to/altitude/backend/run_mcp.py"],
      "env": {
        "PYTHONPATH": "/path/to/altitude/backend"
      }
    }
  }
}
```

## API Endpoints

### Recalls

- `GET /api/recalls/` - List all recalls
- `GET /api/recalls/summary` - Risk level counts
- `GET /api/recalls/search?q=query` - Search recalls
- `GET /api/recalls/{recall_id}` - Get recall details
- `GET /api/recalls/{recall_id}/listings` - Get marketplace listings

### Marketplaces

- `GET /api/marketplaces/` - List marketplaces
- `POST /api/marketplaces/` - Add marketplace
- `PATCH /api/marketplaces/{id}` - Update settings
- `POST /api/marketplaces/{id}/toggle` - Toggle enabled

### Search

- `POST /api/search/marketplace` - Search marketplaces
- `POST /api/search/task` - Create background task
- `GET /api/search/task/{id}` - Get task status
- `POST /api/search/visual` - Visual search
- `POST /api/search/visual/recall/{id}` - Visual search using recall images

### Agent

- `GET /api/agent/config` - Get agent config
- `PATCH /api/agent/config` - Update config
- `GET /api/agent/status` - Get agent status
- `POST /api/agent/start` - Start agent
- `POST /api/agent/stop` - Stop agent
- `GET /api/agent/tools` - List tool integrations
- `PATCH /api/agent/tools/{type}` - Update tool

## Skills vs MCP Tools

**Skills** are internal processing functions used by the backend:
- Risk classification algorithm
- Search query building
- Match score calculation

**MCP Tools** are external actions for AI agents:
- Database queries
- Marketplace searches
- Configuration changes

Skills are used *by* MCP tools, not exposed as tools themselves.

## Environment Variables

Copy `env.template` to `.env` and configure:

```
HOST=0.0.0.0
PORT=8000
DEBUG=true
GOOGLE_VISION_API_KEY=your_key_here
TINEYE_API_KEY=your_key_here
```





Python FastAPI backend with MCP (Model Context Protocol) server for AI agent integration.

## Architecture

```
backend/
├── app/
│   ├── main.py              # FastAPI application entry
│   ├── config.py            # Configuration settings
│   ├── models/              # Pydantic data models
│   │   ├── recall.py        # Recall data models
│   │   ├── marketplace.py   # Marketplace models
│   │   └── agent.py         # Agent configuration models
│   ├── routers/             # API route handlers
│   │   ├── recalls.py       # /api/recalls endpoints
│   │   ├── marketplaces.py  # /api/marketplaces endpoints
│   │   ├── search.py        # /api/search endpoints
│   │   └── agent.py         # /api/agent endpoints
│   ├── services/            # Business logic services
│   │   ├── database.py      # In-memory data storage
│   │   ├── cpsc_api.py      # CPSC API integration
│   │   └── visual_search.py # Visual search providers
│   ├── skills/              # Agent skills (internal logic)
│   │   ├── risk_classifier.py  # Risk classification
│   │   ├── query_builder.py    # Search query generation
│   │   └── match_analyzer.py   # Listing match analysis
│   └── mcp/                 # MCP server implementation
│       └── server.py        # MCP tools and resources
├── run.py                   # FastAPI server entry point
├── run_mcp.py              # MCP server entry point
└── requirements.txt         # Python dependencies
```

## Quick Start

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the API Server

```bash
python run.py
```

The API will be available at `http://localhost:8000`

- API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

## MCP Server

The MCP server allows AI agents (like Claude) to interact with the recall monitoring system.

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `search_recalls` | Search recalls by text query |
| `get_recall_details` | Get full details of a recall |
| `classify_risk` | Classify risk level for given parameters |
| `search_marketplaces` | Search enabled marketplaces for recalled products |
| `get_marketplace_listings` | Get listings found for a recall |
| `list_marketplaces` | List all configured marketplaces |
| `toggle_marketplace` | Enable/disable a marketplace |
| `get_risk_summary` | Get counts by risk level |
| `get_latest_recalls` | Get most recent recalls |
| `build_search_query` | Generate search queries from recall data |

### Available MCP Resources

| URI | Description |
|-----|-------------|
| `altitude://recalls/all` | All recalls in database |
| `altitude://recalls/high-risk` | High-risk recalls only |
| `altitude://marketplaces/enabled` | Enabled marketplaces |
| `altitude://config/agent` | Agent configuration |

### Running MCP Server Standalone

```bash
python run_mcp.py
```

### Claude Desktop Integration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "altitude-recall-monitor": {
      "command": "python",
      "args": ["/path/to/altitude/backend/run_mcp.py"],
      "env": {
        "PYTHONPATH": "/path/to/altitude/backend"
      }
    }
  }
}
```

## API Endpoints

### Recalls

- `GET /api/recalls/` - List all recalls
- `GET /api/recalls/summary` - Risk level counts
- `GET /api/recalls/search?q=query` - Search recalls
- `GET /api/recalls/{recall_id}` - Get recall details
- `GET /api/recalls/{recall_id}/listings` - Get marketplace listings

### Marketplaces

- `GET /api/marketplaces/` - List marketplaces
- `POST /api/marketplaces/` - Add marketplace
- `PATCH /api/marketplaces/{id}` - Update settings
- `POST /api/marketplaces/{id}/toggle` - Toggle enabled

### Search

- `POST /api/search/marketplace` - Search marketplaces
- `POST /api/search/task` - Create background task
- `GET /api/search/task/{id}` - Get task status
- `POST /api/search/visual` - Visual search
- `POST /api/search/visual/recall/{id}` - Visual search using recall images

### Agent

- `GET /api/agent/config` - Get agent config
- `PATCH /api/agent/config` - Update config
- `GET /api/agent/status` - Get agent status
- `POST /api/agent/start` - Start agent
- `POST /api/agent/stop` - Stop agent
- `GET /api/agent/tools` - List tool integrations
- `PATCH /api/agent/tools/{type}` - Update tool

## Skills vs MCP Tools

**Skills** are internal processing functions used by the backend:
- Risk classification algorithm
- Search query building
- Match score calculation

**MCP Tools** are external actions for AI agents:
- Database queries
- Marketplace searches
- Configuration changes

Skills are used *by* MCP tools, not exposed as tools themselves.

## Environment Variables

Copy `env.template` to `.env` and configure:

```
HOST=0.0.0.0
PORT=8000
DEBUG=true
GOOGLE_VISION_API_KEY=your_key_here
TINEYE_API_KEY=your_key_here
```




Python FastAPI backend with MCP (Model Context Protocol) server for AI agent integration.

## Architecture

```
backend/
├── app/
│   ├── main.py              # FastAPI application entry
│   ├── config.py            # Configuration settings
│   ├── models/              # Pydantic data models
│   │   ├── recall.py        # Recall data models
│   │   ├── marketplace.py   # Marketplace models
│   │   └── agent.py         # Agent configuration models
│   ├── routers/             # API route handlers
│   │   ├── recalls.py       # /api/recalls endpoints
│   │   ├── marketplaces.py  # /api/marketplaces endpoints
│   │   ├── search.py        # /api/search endpoints
│   │   └── agent.py         # /api/agent endpoints
│   ├── services/            # Business logic services
│   │   ├── database.py      # In-memory data storage
│   │   ├── cpsc_api.py      # CPSC API integration
│   │   └── visual_search.py # Visual search providers
│   ├── skills/              # Agent skills (internal logic)
│   │   ├── risk_classifier.py  # Risk classification
│   │   ├── query_builder.py    # Search query generation
│   │   └── match_analyzer.py   # Listing match analysis
│   └── mcp/                 # MCP server implementation
│       └── server.py        # MCP tools and resources
├── run.py                   # FastAPI server entry point
├── run_mcp.py              # MCP server entry point
└── requirements.txt         # Python dependencies
```

## Quick Start

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the API Server

```bash
python run.py
```

The API will be available at `http://localhost:8000`

- API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

## MCP Server

The MCP server allows AI agents (like Claude) to interact with the recall monitoring system.

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `search_recalls` | Search recalls by text query |
| `get_recall_details` | Get full details of a recall |
| `classify_risk` | Classify risk level for given parameters |
| `search_marketplaces` | Search enabled marketplaces for recalled products |
| `get_marketplace_listings` | Get listings found for a recall |
| `list_marketplaces` | List all configured marketplaces |
| `toggle_marketplace` | Enable/disable a marketplace |
| `get_risk_summary` | Get counts by risk level |
| `get_latest_recalls` | Get most recent recalls |
| `build_search_query` | Generate search queries from recall data |

### Available MCP Resources

| URI | Description |
|-----|-------------|
| `altitude://recalls/all` | All recalls in database |
| `altitude://recalls/high-risk` | High-risk recalls only |
| `altitude://marketplaces/enabled` | Enabled marketplaces |
| `altitude://config/agent` | Agent configuration |

### Running MCP Server Standalone

```bash
python run_mcp.py
```

### Claude Desktop Integration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "altitude-recall-monitor": {
      "command": "python",
      "args": ["/path/to/altitude/backend/run_mcp.py"],
      "env": {
        "PYTHONPATH": "/path/to/altitude/backend"
      }
    }
  }
}
```

## API Endpoints

### Recalls

- `GET /api/recalls/` - List all recalls
- `GET /api/recalls/summary` - Risk level counts
- `GET /api/recalls/search?q=query` - Search recalls
- `GET /api/recalls/{recall_id}` - Get recall details
- `GET /api/recalls/{recall_id}/listings` - Get marketplace listings

### Marketplaces

- `GET /api/marketplaces/` - List marketplaces
- `POST /api/marketplaces/` - Add marketplace
- `PATCH /api/marketplaces/{id}` - Update settings
- `POST /api/marketplaces/{id}/toggle` - Toggle enabled

### Search

- `POST /api/search/marketplace` - Search marketplaces
- `POST /api/search/task` - Create background task
- `GET /api/search/task/{id}` - Get task status
- `POST /api/search/visual` - Visual search
- `POST /api/search/visual/recall/{id}` - Visual search using recall images

### Agent

- `GET /api/agent/config` - Get agent config
- `PATCH /api/agent/config` - Update config
- `GET /api/agent/status` - Get agent status
- `POST /api/agent/start` - Start agent
- `POST /api/agent/stop` - Stop agent
- `GET /api/agent/tools` - List tool integrations
- `PATCH /api/agent/tools/{type}` - Update tool

## Skills vs MCP Tools

**Skills** are internal processing functions used by the backend:
- Risk classification algorithm
- Search query building
- Match score calculation

**MCP Tools** are external actions for AI agents:
- Database queries
- Marketplace searches
- Configuration changes

Skills are used *by* MCP tools, not exposed as tools themselves.

## Environment Variables

Copy `env.template` to `.env` and configure:

```
HOST=0.0.0.0
PORT=8000
DEBUG=true
GOOGLE_VISION_API_KEY=your_key_here
TINEYE_API_KEY=your_key_here
```




