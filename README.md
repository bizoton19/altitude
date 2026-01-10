# ⚡ Altitude - Product Recall Monitor

AI-powered product recall monitoring across marketplaces with risk classification and MCP integration.

**[📖 Documentation](https://your-username.github.io/altitude/)** · **[🔗 API Docs](http://localhost:8000/docs)**

![Futuristic Glass UI](docs/screenshot.png)

## Features

- **🔍 Universal Search** — Search by recall number, product name, manufacturer, or hazard
- **⚠️ Risk Classification** — Automatic HIGH/MEDIUM/LOW scoring based on severity
- **🛒 Marketplace Monitoring** — Search eBay, Amazon, Facebook, Craigslist, and more
- **🤖 AI Agent** — Automated scanning with configurable frequency
- **🖼️ Visual Search** — Google Vision and TinEye integration
- **📊 Export** — CSV, JSON, PDF reports
- **🔌 MCP Server** — AI agent integration via Model Context Protocol

## Quick Start

### Prerequisites

- Node.js 18+ / pnpm 8+
- Python 3.11+

### 1. Frontend (React + Vite)

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

Frontend runs at `http://localhost:5173`

### 2. Backend (Python + FastAPI)

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server
python run.py
```

Backend runs at `http://localhost:8000`

- **API Docs:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/health

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ALTITUDE STACK                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FRONTEND (React)              BACKEND (FastAPI)            │
│  ─────────────────             ─────────────────            │
│  • Futuristic Glass UI         • REST API                   │
│  • Browser-like tabs           • MCP Server                 │
│  • Risk dashboard              • CPSC Integration           │
│  • Marketplace manager         • Visual Search              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  SKILLS (Internal)             MCP TOOLS (AI-accessible)    │
│  ─────────────────             ────────────────────────     │
│  • Risk Classifier             • search_recalls             │
│  • Query Builder               • search_marketplaces        │
│  • Match Analyzer              • classify_risk + 7 more     │
└─────────────────────────────────────────────────────────────┘
```

## Risk Classification

| Level | Criteria |
|-------|----------|
| 🔴 **HIGH** | Deaths, serious injuries, 10k+ units, fire/choking/lead hazards |
| 🟡 **MEDIUM** | Minor injuries, 1k-10k units, cuts/burns/falls |
| 🟢 **LOW** | No injuries, <1k units, labeling issues |

## Supported Marketplaces

- ✅ Facebook Marketplace
- ✅ eBay
- ✅ Amazon
- ✅ Craigslist
- ✅ OfferUp
- ✅ Mercari

*Add custom marketplaces in Settings*

## MCP Integration (AI Agents)

Run the MCP server for Claude Desktop or other AI systems:

```bash
cd backend && source venv/bin/activate
python run_mcp.py
```

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "altitude": {
      "command": "python",
      "args": ["/path/to/altitude/backend/run_mcp.py"]
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `search_recalls` | Search recalls by query |
| `get_recall_details` | Full recall info |
| `classify_risk` | Risk classification |
| `search_marketplaces` | Search platforms |
| `list_marketplaces` | List platforms |
| `get_risk_summary` | Risk counts |

## Project Structure

```
altitude/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── services/           # API client
│   └── styles/             # Glass theme CSS
├── backend/                # Python backend
│   ├── app/
│   │   ├── routers/        # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── skills/         # Risk classifier, etc.
│   │   └── mcp/            # MCP server
│   ├── run.py              # API entry point
│   └── run_mcp.py          # MCP entry point
├── docs/                   # GitHub Pages help site
└── recalls.json            # Initial dataset
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recalls/` | List recalls |
| GET | `/api/recalls/search?q=` | Search |
| GET | `/api/recalls/{id}` | Details |
| POST | `/api/search/marketplace` | Search platforms |
| GET | `/api/marketplaces/` | List platforms |
| GET | `/api/agent/config` | Agent settings |

## Development

```bash
# Frontend
pnpm dev          # Dev server
pnpm build        # Production build

# Backend
python run.py     # API server (hot reload)
python run_mcp.py # MCP server
```

## License

MIT


## Supported Marketplaces

- ✅ Facebook Marketplace
- ✅ eBay
- ✅ Amazon
- ✅ Craigslist
- ✅ OfferUp
- ✅ Mercari

*Add custom marketplaces in Settings*

## MCP Integration (AI Agents)

Run the MCP server for Claude Desktop or other AI systems:

```bash
cd backend && source venv/bin/activate
python run_mcp.py
```

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "altitude": {
      "command": "python",
      "args": ["/path/to/altitude/backend/run_mcp.py"]
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `search_recalls` | Search recalls by query |
| `get_recall_details` | Full recall info |
| `classify_risk` | Risk classification |
| `search_marketplaces` | Search platforms |
| `list_marketplaces` | List platforms |
| `get_risk_summary` | Risk counts |

## Project Structure

```
altitude/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── services/           # API client
│   └── styles/             # Glass theme CSS
├── backend/                # Python backend
│   ├── app/
│   │   ├── routers/        # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── skills/         # Risk classifier, etc.
│   │   └── mcp/            # MCP server
│   ├── run.py              # API entry point
│   └── run_mcp.py          # MCP entry point
├── docs/                   # GitHub Pages help site
└── recalls.json            # Initial dataset
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recalls/` | List recalls |
| GET | `/api/recalls/search?q=` | Search |
| GET | `/api/recalls/{id}` | Details |
| POST | `/api/search/marketplace` | Search platforms |
| GET | `/api/marketplaces/` | List platforms |
| GET | `/api/agent/config` | Agent settings |

## Development

```bash
# Frontend
pnpm dev          # Dev server
pnpm build        # Production build

# Backend
python run.py     # API server (hot reload)
python run_mcp.py # MCP server
```

## License

MIT


## Supported Marketplaces

- ✅ Facebook Marketplace
- ✅ eBay
- ✅ Amazon
- ✅ Craigslist
- ✅ OfferUp
- ✅ Mercari

*Add custom marketplaces in Settings*

## MCP Integration (AI Agents)

Run the MCP server for Claude Desktop or other AI systems:

```bash
cd backend && source venv/bin/activate
python run_mcp.py
```

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "altitude": {
      "command": "python",
      "args": ["/path/to/altitude/backend/run_mcp.py"]
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `search_recalls` | Search recalls by query |
| `get_recall_details` | Full recall info |
| `classify_risk` | Risk classification |
| `search_marketplaces` | Search platforms |
| `list_marketplaces` | List platforms |
| `get_risk_summary` | Risk counts |

## Project Structure

```
altitude/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── services/           # API client
│   └── styles/             # Glass theme CSS
├── backend/                # Python backend
│   ├── app/
│   │   ├── routers/        # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── skills/         # Risk classifier, etc.
│   │   └── mcp/            # MCP server
│   ├── run.py              # API entry point
│   └── run_mcp.py          # MCP entry point
├── docs/                   # GitHub Pages help site
└── recalls.json            # Initial dataset
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recalls/` | List recalls |
| GET | `/api/recalls/search?q=` | Search |
| GET | `/api/recalls/{id}` | Details |
| POST | `/api/search/marketplace` | Search platforms |
| GET | `/api/marketplaces/` | List platforms |
| GET | `/api/agent/config` | Agent settings |

## Development

```bash
# Frontend
pnpm dev          # Dev server
pnpm build        # Production build

# Backend
python run.py     # API server (hot reload)
python run_mcp.py # MCP server
```

## License

MIT


## Supported Marketplaces

- ✅ Facebook Marketplace
- ✅ eBay
- ✅ Amazon
- ✅ Craigslist
- ✅ OfferUp
- ✅ Mercari

*Add custom marketplaces in Settings*

## MCP Integration (AI Agents)

Run the MCP server for Claude Desktop or other AI systems:

```bash
cd backend && source venv/bin/activate
python run_mcp.py
```

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "altitude": {
      "command": "python",
      "args": ["/path/to/altitude/backend/run_mcp.py"]
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `search_recalls` | Search recalls by query |
| `get_recall_details` | Full recall info |
| `classify_risk` | Risk classification |
| `search_marketplaces` | Search platforms |
| `list_marketplaces` | List platforms |
| `get_risk_summary` | Risk counts |

## Project Structure

```
altitude/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── services/           # API client
│   └── styles/             # Glass theme CSS
├── backend/                # Python backend
│   ├── app/
│   │   ├── routers/        # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── skills/         # Risk classifier, etc.
│   │   └── mcp/            # MCP server
│   ├── run.py              # API entry point
│   └── run_mcp.py          # MCP entry point
├── docs/                   # GitHub Pages help site
└── recalls.json            # Initial dataset
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recalls/` | List recalls |
| GET | `/api/recalls/search?q=` | Search |
| GET | `/api/recalls/{id}` | Details |
| POST | `/api/search/marketplace` | Search platforms |
| GET | `/api/marketplaces/` | List platforms |
| GET | `/api/agent/config` | Agent settings |

## Development

```bash
# Frontend
pnpm dev          # Dev server
pnpm build        # Production build

# Backend
python run.py     # API server (hot reload)
python run_mcp.py # MCP server
```

## License

MIT
