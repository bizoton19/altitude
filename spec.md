# Recall Monitoring Browser - Technical Specification

## Overview
A barebones, slick, and intelligent web browser application that monitors product recalls across popular marketplaces, aggregates results, and provides risk classification based on recall severity and unit sales volume.

## Core Requirements

### 1. Application Type
- **Web Browser Application** (Single Page Application recommended)
- **CRITICAL: Browser-Like Interface**
  - Application MUST visually resemble an internet browser
  - Include browser chrome elements: address bar, navigation buttons, tabs (optional)
  - The "address bar" serves as the universal search/filter input
  - Clean, minimal browser aesthetic
- Minimal, clean, and modern UI
- Responsive design for desktop and mobile

### 2. Data Source
- **Initial Dataset**: `recalls.json` (located in project root)
  - JSON array format containing recall objects
  - Fields include: RecallID, RecallNumber, RecallDate, Description, URL, Title, Products (with NumberOfUnits), Injuries, Manufacturers, Retailers, etc.
- **Live Updates**: CPSC Recalls API integration
  - Endpoint: https://www.cpsc.gov/Recalls
  - Periodically fetch new recalls and update local dataset
  - Merge new recalls with existing `recalls.json` data

### 3. Core Functionality

#### 3.1 Universal Search Input (Browser Address Bar)
- **Primary Interface**: Browser-style address bar that accepts ANY text related to recalls
- **Search Capabilities**:
  - Search by recall number (e.g., "26156")
  - Search by product name (e.g., "dresser", "toy", "battery")
  - Search by manufacturer name (e.g., "Fisher-Price", "Samsung")
  - Search by hazard type (e.g., "fire", "choking", "lead")
  - Search by keywords in description
  - Full-text search across all recall fields
- **Real-time Filtering**: Results filter as user types (debounced)
- Support for single term or multiple terms
- Display matching recalls immediately upon input

#### 3.1.1 Home Page - Latest Recalls Dashboard
- **Default View**: When no search is active, home page displays latest recalls snapshot
- **Latest Recalls Display**:
  - Show most recent recalls (e.g., last 20-50 recalls by RecallDate)
  - Each recall shows risk classification indicator (High/Medium/Low badge)
  - Card or list view with key information visible at a glance
  - Sort by date (newest first) by default
  - Quick filters by risk level (show all, high only, medium only, low only)
- **Risk Distribution Summary**: Visual summary showing count of High/Medium/Low risk recalls
- **Auto-refresh**: Option to auto-update when new recalls are available

#### 3.2 Marketplace Monitoring
- **CRITICAL REQUIREMENT**: The browser can **ONLY** monitor platforms that are explicitly added to the monitoring list. No marketplace monitoring occurs until platforms are added by the user.
- **Supported Platforms** (examples that can be added):
  - Facebook Marketplace
  - eBay
  - Amazon
  - Craigslist
  - OfferUp
  - Mercari
  - Walmart
  - Wayfair
  - Target
  - Etsy
  - Other marketplaces (user-configurable)
- **Platform Addition Requirements**:
  - User must explicitly add each platform before it can be monitored
  - No default/automatic platform monitoring
  - User interface to add/remove platforms from monitoring list
  - Configuration for marketplace API endpoints or scraping rules
  - Store marketplace configurations in local storage or backend database
  - Support for marketplace-specific search parameters
  - Visual indicator showing which platforms are currently active for monitoring
- **Initial State**: Application starts with NO platforms added - user must add platforms before any monitoring can occur

#### 3.3 Marketplace Search & Aggregation
- For each recall number:
  - Search **ONLY** across platforms that have been explicitly added to the monitoring list
  - If no platforms are added, display message prompting user to add platforms
  - Look for products matching recall criteria (product name, model, UPC, manufacturer)
  - Aggregate results from all active (added) marketplaces
  - Display unified results with marketplace source attribution
  - Show product listings, prices, availability status
  - **Clickable listing URLs** - Direct links to marketplace listings
  - Track if recalled products are still being sold
  - Indicate which platforms were searched and which returned results

#### 3.3.1 Selected Recall Detail View
- **Image Gallery**:
  - Horizontal scrolling gallery for recall product images
  - Thumbnail navigation
  - Click to enlarge/modal view
  - Show image captions from CPSC data
- **Marketplace Listings Display**:
  - Group listings by marketplace platform
  - Show for each listing: title, price, seller, location, URL
  - **Clickable URLs** to view listing on marketplace
  - Match score indicator (how well product matches recall)
  - Listing date/freshness indicator

#### 3.3.2 AI Agent for Marketplace Monitoring
- **Built-in Agent**: AI agent that searches marketplaces for recalled products
- **Agent Settings** (accessible via Settings):
  - Search frequency (how often to scan marketplaces)
  - Search depth (how many pages/results to scan per platform)
  - Match sensitivity (how strict product matching should be)
  - Auto-alert on high-confidence matches
  - Agent on/off toggle per platform
- **Agent Capabilities**:
  - Parse recall details (product name, model, UPC, images, description)
  - Construct search queries for each marketplace
  - Analyze search results for potential matches
  - Report findings with confidence scores

#### 3.3.3 Tool Integrations
- **Integration Settings** (accessible via Settings):
  - **Google Lens Integration**: Use image recognition to find similar products
  - **Reverse Image Search**: Search by recall product images
  - **Visual Search APIs**: Integration with visual search tools
  - **Custom Tool Webhooks**: Add custom tool integrations via webhooks
- **Tool Configuration**:
  - API keys for each tool
  - Enable/disable per tool
  - Rate limiting settings
  - Fallback options when tools unavailable
- **Supported Tools** (initial):
  - Google Lens / Google Vision API
  - TinEye (reverse image search)
  - Bing Visual Search
  - Custom visual search endpoints

#### 3.4 Risk Classification System
- **Classification Criteria**:
  - **HIGH RISK**:
    - Units sold: > 10,000 units OR
    - Severity: Death, serious injury, or multiple injuries reported OR
    - Hazard type: Fire, electrocution, choking, lead poisoning, or other life-threatening hazards
  - **MEDIUM RISK**:
    - Units sold: 1,000 - 10,000 units OR
    - Severity: Minor injuries reported OR
    - Hazard type: Moderate safety concerns (cuts, burns, falls)
  - **LOW RISK**:
    - Units sold: < 1,000 units AND
    - Severity: No injuries reported OR
    - Hazard type: Minor defects, labeling issues, or non-safety related concerns
- **Visual Indicators**: Color-coded badges/labels (Red=High, Yellow=Medium, Green=Low)
- **Filtering**: Allow users to filter recalls by risk level

#### 3.5 Data Export & API Integration
- **Download Options**:
  - CSV export (recall data + marketplace results)
  - JSON export (full structured data)
  - PDF report (formatted summary)
- **API Integration**:
  - RESTful API endpoint for POST requests
  - Accept recall numbers via POST
  - Return aggregated marketplace results
  - Support webhook configuration for automated monitoring
  - API authentication/authorization (API keys or OAuth)

### 4. User Interface Design

#### 4.1 Design System
- **Style Guide**: Futuristic Liquid Glass / Glassmorphism Design
  - **NOT USWDS** - Custom futuristic aesthetic
  - Inspired by Apple Liquid Glass (iOS 26) and retro-futuristic Atari aesthetics
  - **Glass Effects**: Frosted glass panels, blur backgrounds, transparency
  - **Color Palette**:
    - Dark mode primary: Deep space black (#0a0a0f) with blue/purple gradients
    - Glass panels: Semi-transparent white/blue with blur (backdrop-filter)
    - Accent colors: Neon cyan (#00f0ff), electric purple (#bf00ff), hot pink (#ff0080)
    - Risk colors: Neon red (#ff3366), amber glow (#ffaa00), matrix green (#00ff88)
  - **Typography**: 
    - Modern sans-serif: "SF Pro", "Inter", or "Space Grotesk"
    - Monospace for data: "JetBrains Mono" or "Fira Code"
  - **Effects**:
    - Glassmorphism: backdrop-filter: blur(20px), semi-transparent backgrounds
    - Subtle glow effects on interactive elements
    - Smooth animations and transitions
    - Gradient borders and shadows
  - **Accessibility**: Maintain WCAG 2.1 AA compliance despite visual effects

#### 4.2 Key UI Components
- **Browser Chrome (Top Bar)**:
  - **Tab Bar** (REQUIRED):
    - Multiple tabs like a real browser
    - Each tab can hold a different search/recall view
    - New tab button (+)
    - Close tab button (×) on each tab
    - Active tab highlighted with glow effect
    - Tab titles show search term or "New Tab"
    - Draggable tabs (optional)
  - Back/Forward navigation buttons (browser-style, with glass effect)
  - Refresh button
  - **Address Bar**: Large, prominent input field (browser URL bar style)
    - Glass/frosted appearance
    - Placeholder text: "Search recalls by number, product, manufacturer, hazard..."
    - Search icon on left with subtle glow
    - Clear button on right when text entered
    - Glowing border on focus
  - Settings/menu button (gear icon)
- **Header/Navigation**:
  - Application title/logo (can be in browser title bar area)
  - Main navigation menu (can be tabs or sidebar)
  - User settings/preferences
- **Home Page Components**:
  - **Risk Summary Bar**: Visual display of High/Medium/Low counts
  - **Latest Recalls Grid/List**: Scrollable list of recent recalls
  - **Quick Filter Buttons**: Filter by risk level
  - **Search Prompt**: When idle, show "Enter search term or browse latest recalls"
- **Results Display**:
  - Card-based layout for recall information
  - Risk classification badge
  - Marketplace results grid/list view
  - Expandable sections for detailed information
  - Images from recall data
- **Marketplace Management**:
  - Settings page for managing marketplaces
  - Add/remove marketplace interface (required before monitoring)
  - Marketplace configuration form
  - Visual list of active/inactive platforms
  - Warning/notification when no platforms are added
  - Quick-add buttons for common platforms (Facebook, eBay, Amazon, Craigslist, OfferUp, Mercari)
- **Data Export Panel**:
  - Export button with format options
  - API endpoint display
  - Webhook configuration interface

#### 4.3 Visual Design Principles
- **Futuristic Browser Aesthetic**: 
  - Looks like a next-gen web browser from the future
  - Glass/transparent panels floating over dark gradient background
  - Neon accents and subtle glow effects
  - Smooth, fluid animations
- **Glassmorphism Elements**:
  - Cards with frosted glass effect
  - Semi-transparent navigation
  - Blur effects on overlays
  - Gradient borders
- Clean, minimal interface with futuristic flair
- High contrast for readability (light text on dark backgrounds)
- Clear visual hierarchy with depth (glass layers)
- Consistent spacing and alignment
- Neon glow accents for interactive elements
- Loading states with animated effects (pulsing, scanning)
- Error messages with warning glow effects

#### 4.4 Futuristic Browser Layout
```
╔═══════════════════════════════════════════════════════════════════╗
║  ┌─────────────┐ ┌─────────────┐ ┌───┐                           ║  <- TAB BAR
║  │ 🔍 Dresser  │ │ 🏠 Home     │ │ + │                           ║     (Glass tabs)
║  └─────────────┘ └─────────────┘ └───┘                           ║
╠═══════════════════════════════════════════════════════════════════╣
║  ◀  ▶  ⟳  ┃ 🔍 Search recalls...                           ┃ ⚙️ ║  <- ADDRESS BAR
║           ┃    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ┃    ║     (Frosted glass)
╠═══════════════════════════════════════════════════════════════════╣
║  ⬡ All    ⬡ High Risk    ⬡ Medium Risk    ⬡ Low Risk    ▼ Sort  ║  <- FILTER BAR
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   ╭─────────────────────────────────────────────────────────────╮ ║
║   │  RISK OVERVIEW          ▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ║  <- RISK SUMMARY
║   │  🔴 23 HIGH  │  🟡 45 MEDIUM  │  🟢 89 LOW                  │ ║     (Glass panel)
║   ╰─────────────────────────────────────────────────────────────╯ ║
║                                                                   ║
║   ╭─────────────────────────────────────────────────────────────╮ ║
║   │ 🔴 HIGH RISK                                    ⟐ EXPAND   │ ║  <- RECALL CARD
║   │ ═══════════════════════════════════════════════════════════ │ ║     (Glass card
║   │ 17 Stories Furniture 18-Drawer Dresser Recall               │ ║      with glow)
║   │ #26156  •  Dec 18, 2025  •  2,800 units  •  Tip-Over Hazard │ ║
║   ╰─────────────────────────────────────────────────────────────╯ ║
║                                                                   ║
║   ╭─────────────────────────────────────────────────────────────╮ ║
║   │ 🟡 MEDIUM RISK                                  ⟐ EXPAND   │ ║
║   │ ═══════════════════════════════════════════════════════════ │ ║
║   │ Battery Pack Recall - Fire Hazard                           │ ║
║   │ #26155  •  Dec 17, 2025  •  5,000 units                     │ ║
║   ╰─────────────────────────────────────────────────────────────╯ ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
        ▲ Dark gradient background with subtle grid/scan lines
```

### 5. Technical Architecture

#### 5.1 Frontend Stack (Recommended)
- **Framework**: React, Vue.js, or vanilla JavaScript
- **Styling**: Custom CSS with glassmorphism effects (no USWDS)
- **State Management**: Context API, Redux, or Vuex (if using framework)
- **HTTP Client**: Axios or Fetch API
- **Build Tool**: Vite, Webpack, or Parcel

#### 5.2 Backend Stack (If Required)
- **Runtime**: Node.js, Python (Flask/FastAPI), or Go
- **Database**: SQLite (for local), PostgreSQL/MongoDB (for production)
- **API Framework**: Express.js, FastAPI, or Gin
- **Task Queue**: For marketplace scraping (Celery, Bull, or similar)

#### 5.3 Marketplace Integration
- **Approach Options**:
  1. **Official APIs**: Use marketplace APIs where available (Amazon Product Advertising API, eBay API, etc.)
  2. **Web Scraping**: Use libraries like Puppeteer, Playwright, or Scrapy
  3. **Hybrid**: Combine APIs and scraping based on marketplace capabilities
- **Rate Limiting**: Implement rate limiting to respect marketplace terms of service
- **Caching**: Cache marketplace results to reduce API calls
- **Error Handling**: Graceful degradation when marketplace is unavailable

#### 5.4 Data Processing
- **Recall Data Parsing**: Parse `recalls.json` on application load
- **Risk Classification Algorithm**: Implement classification logic based on criteria in section 3.4
- **Data Normalization**: Standardize marketplace results into common format
- **Deduplication**: Remove duplicate listings across marketplaces

### 6. Data Flow

```
User Input (Recall Number)
    ↓
Validate & Parse Input
    ↓
Query Local recalls.json Database
    ↓
Fetch from CPSC API (if needed/update)
    ↓
Classify Risk Level
    ↓
Check if Platforms are Added to Monitoring List
    ↓
[If No Platforms Added] → Prompt User to Add Platforms
    ↓
[If Platforms Added] → Search ONLY Added Marketplaces (Parallel)
    ↓
Aggregate Results from Active Platforms
    ↓
Display Results to User
    ↓
[Optional] Export or POST to API
```

### 7. Configuration & Settings

#### 7.1 Marketplace Configuration Schema
```json
{
  "marketplace_id": "amazon",
  "name": "Amazon",
  "enabled": true,
  "api_endpoint": "https://api.amazon.com/products",
  "api_key": "optional",
  "search_params": {
    "method": "api|scraping",
    "rate_limit": 100,
    "timeout": 5000
  },
  "custom_fields": {}
}
```

#### 7.2 Application Settings
- CPSC API update frequency (default: daily)
- Marketplace search timeout
- Cache duration
- Default export format
- API endpoint configuration
- Authentication settings

### 8. Security & Privacy

- **API Keys**: Store securely (environment variables, encrypted storage)
- **Rate Limiting**: Prevent abuse of marketplace APIs
- **Data Privacy**: Don't store personal information unnecessarily
- **HTTPS**: All API communications over HTTPS
- **Input Validation**: Sanitize all user inputs
- **CORS**: Configure appropriately for API access

### 9. Performance Requirements

- **Initial Load**: < 3 seconds
- **Search Response**: < 5 seconds for marketplace aggregation
- **Concurrent Searches**: Support multiple recall searches simultaneously
- **Caching**: Cache marketplace results for 1 hour (configurable)
- **Lazy Loading**: Load marketplace results on demand

### 10. Accessibility

- **WCAG 2.1 AA Compliance**: Follow accessibility guidelines despite visual effects
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Focus Management**: Clear focus indicators
- **Color Contrast**: Meet WCAG contrast requirements (ensure text readable over glass effects)

### 11. Testing Requirements

- **Unit Tests**: Core functionality (risk classification, data parsing)
- **Integration Tests**: Marketplace API integration
- **E2E Tests**: Critical user flows
- **Accessibility Tests**: Automated a11y testing

### 12. Deployment

- **Environment**: Web application (hosted or local)
- **Dependencies**: Document all required dependencies
- **Environment Variables**: Document required configuration
- **Docker**: Optional containerization for easy deployment

### 13. Future Enhancements (Optional)

- Email/SMS alerts for new recalls
- Dashboard with recall statistics
- Historical tracking of marketplace listings
- Machine learning for improved product matching
- Multi-language support
- Mobile app version

## Implementation Notes

1. **recalls.json Structure**: The initial dataset contains recall objects with fields like RecallID, RecallNumber, Products (with NumberOfUnits), Injuries, etc. Parse this structure carefully.

2. **CPSC API**: Research the CPSC Recalls API endpoint structure and authentication requirements. May need to scrape if no official API exists.

3. **Marketplace APIs**: Each marketplace has different API requirements, rate limits, and authentication. Plan for varying integration approaches. **IMPORTANT**: Only monitor platforms that users explicitly add - implement a whitelist approach where no monitoring occurs until platforms are added.

4. **Design System**: Custom futuristic glassmorphism CSS. Use CSS variables for theming. Consider using a glass effect library or custom backdrop-filter implementations.

5. **Risk Classification**: The algorithm should be flexible and configurable. Consider making thresholds adjustable via settings.

6. **Scalability**: Design for potential growth in number of marketplaces and recall volume. Consider background job processing for large batches.

## Backend Architecture (Python + MCP Server)

### Backend Stack
- **Runtime**: Python 3.11+
- **Framework**: FastAPI (async, modern, auto-documentation)
- **MCP Server**: Model Context Protocol for AI agent integration

### Skills vs MCP Tools

#### Skills (Internal Logic - NOT MCP Tools)
Internal processing functions used by the backend:
- **Risk Classifier**: Algorithm to calculate risk score and level
- **Query Builder**: Generate optimized search queries from recall data
- **Match Analyzer**: Calculate listing match scores

#### MCP Tools (External Actions - For AI Agents)
Actions exposed via MCP protocol for AI agents:
- `search_recalls` - Query recall database
- `get_recall_details` - Get full recall information
- `classify_risk` - Run risk classification
- `search_marketplaces` - Search enabled platforms
- `get_marketplace_listings` - Get found listings
- `list_marketplaces` - List configured platforms
- `toggle_marketplace` - Enable/disable platform
- `get_risk_summary` - Get risk distribution
- `get_latest_recalls` - Get recent recalls
- `build_search_query` - Generate search queries

#### MCP Resources
Read-only data access:
- `altitude://recalls/all` - All recalls
- `altitude://recalls/high-risk` - High-risk recalls
- `altitude://marketplaces/enabled` - Active platforms
- `altitude://config/agent` - Agent settings

### API Endpoints
- `GET /api/recalls/` - List recalls
- `GET /api/recalls/summary` - Risk counts
- `GET /api/recalls/search` - Search recalls
- `GET /api/recalls/{id}` - Recall details
- `GET /api/marketplaces/` - List platforms
- `POST /api/search/marketplace` - Search platforms
- `POST /api/search/visual` - Visual search
- `GET /api/agent/config` - Agent settings

## File Structure Recommendation

```
altitude/
├── spec.md (this file)
├── recalls.json (initial dataset)
├── README.md
├── package.json
├── mcp-config.json (MCP server config)
├── src/                          # React Frontend
│   ├── components/
│   │   ├── BrowserChrome.jsx
│   │   ├── SearchInput.jsx
│   │   ├── RecallCard.jsx
│   │   ├── RecallDetailView.jsx
│   │   ├── ImageGallery.jsx
│   │   ├── MarketplaceResults.jsx
│   │   ├── MarketplaceManager.jsx
│   │   ├── AgentSettings.jsx
│   │   ├── ToolIntegrations.jsx
│   │   └── RiskBadge.jsx
│   ├── services/
│   │   ├── api.js (backend client)
│   │   └── riskClassifier.js
│   ├── styles/
│   │   ├── main.css
│   │   └── glass-theme.css
│   └── App.jsx
├── backend/                       # Python Backend
│   ├── app/
│   │   ├── main.py               # FastAPI entry
│   │   ├── config.py             # Settings
│   │   ├── models/               # Pydantic models
│   │   │   ├── recall.py
│   │   │   ├── marketplace.py
│   │   │   └── agent.py
│   │   ├── routers/              # API routes
│   │   │   ├── recalls.py
│   │   │   ├── marketplaces.py
│   │   │   ├── search.py
│   │   │   └── agent.py
│   │   ├── services/             # Business logic
│   │   │   ├── database.py
│   │   │   ├── cpsc_api.py
│   │   │   └── visual_search.py
│   │   ├── skills/               # Agent skills
│   │   │   ├── risk_classifier.py
│   │   │   ├── query_builder.py
│   │   │   └── match_analyzer.py
│   │   └── mcp/                  # MCP server
│   │       └── server.py
│   ├── run.py                    # API server entry
│   ├── run_mcp.py                # MCP server entry
│   └── requirements.txt
├── public/
└── tests/
```

## Success Criteria

- ✅ **Application looks like an internet browser** with address bar, navigation buttons, and browser chrome
- ✅ **Home page shows latest recalls snapshot** with risk classification indicators
- ✅ **Universal search accepts ANY text** - recall numbers, product names, manufacturers, hazards, keywords
- ✅ **Real-time filtering** as user types in the browser-style address bar
- ✅ **Risk summary dashboard** shows distribution of High/Medium/Low recalls
- ✅ Users can input recall numbers and see results
- ✅ Application searches **ONLY** marketplaces that have been explicitly added to monitoring list
- ✅ No marketplace monitoring occurs until platforms are added by user
- ✅ Recalls are classified by risk level (High/Medium/Low)
- ✅ Users can add/remove marketplaces for monitoring (Facebook, eBay, Amazon, Craigslist, OfferUp, Mercari, etc.)
- ✅ Data can be exported or sent via API
- ✅ **Browser tabs** for multiple searches/views
- ✅ **Futuristic Liquid Glass design** - NOT USWDS, modern glassmorphism aesthetic
- ✅ Application updates from CPSC API
- ✅ Application loads and uses recalls.json as initial dataset


---

## Listings Management & Review Workflow

### Performance Requirements for Large Datasets
- **Scale Consideration**: System must handle millions of marketplace listings
- **Pagination**: All listing endpoints use cursor-based or page-based pagination
- **Infinite Scroll**: Frontend uses infinite scroll with intersection observer for smooth UX
- **Default Page Size**: 50 listings per page (configurable up to 200)
- **Lazy Loading**: Only load visible listings, defer loading of images and metadata
- **Indexing**: Backend should index on: recall_id, marketplace_id, status, match_score, found_at

### Listing Review Workflow

#### Listing Statuses
| Status | Description |
|--------|-------------|
| `pending` | Awaiting human review |
| `accepted` | Human confirmed as valid match |
| `rejected` | Human marked as false positive |
| `auto_accepted` | System auto-accepted (≥90% confidence) |

#### Auto-Accept Rule
- **Threshold**: Listings with `match_score >= 0.90` (90%+ confidence) are automatically accepted
- **Status**: Set to `auto_accepted` to distinguish from human-reviewed
- **Learning**: Still stored for training data validation

#### Accept Flow
- User clicks "Accept" button
- Listing status changes to `accepted`
- Review metadata recorded (reviewer, timestamp)
- Listing remains in active listings view

#### Reject Flow
- User clicks "Reject" button
- **Rejection Modal** prompts for:
  - **Category** (required): `wrong_product`, `wrong_brand`, `not_recalled`, `duplicate`, `sold`, `other`
  - **Details/Notes** (optional): Free-text explanation
- Listing status changes to `rejected`
- Listing removed from default listings view (hidden by default)
- **All metadata preserved** for agent learning

### Agent Learning from Rejections

#### Stored Metadata for Learning
```json
{
  "listing_id": "abc123",
  "recall_id": "cpsc-26156",
  "original_match_score": 0.72,
  "corrected_match_score": 0.1,  // Optional: what score should have been
  "status": "rejected",
  "rejection_reason": "Product is different model, not affected by recall",
  "rejection_category": "wrong_product",
  "match_factors": ["title_match", "brand_match"],
  "reviewed_by": "user_123",
  "reviewed_at": "2024-12-24T10:30:00Z",
  "time_to_review_seconds": 8,
  "notes": "Similar brand name but completely different product line"
}
```

#### Learning Endpoints
- `GET /api/listings/learning-data` - Export reviewed listings for training
- `GET /api/listings/rejected` - View all rejected listings for analysis
- Query params: `limit`, `category`, `date_from`, `date_to`

#### Pattern Recognition Goals
Over time, the agent should learn to:
1. **Reduce false positives** for specific rejection categories
2. **Adjust match scoring** based on human corrections
3. **Identify product families** that look similar but aren't recalled
4. **Recognize seller patterns** (e.g., trusted sellers with legitimate products)
5. **Weight different match factors** appropriately

### Bulk Operations
- **Bulk Accept**: Select multiple listings and accept all at once
- **Bulk Reject**: Select multiple listings and reject with single reason
- **Keyboard Shortcuts**: `A` for accept, `R` for reject, `Space` for select

### Filtering Options
| Filter | Options |
|--------|---------|
| Status | pending, accepted, rejected, auto_accepted, all |
| Risk Level | HIGH, MEDIUM, LOW, all |
| Marketplace | facebook, ebay, amazon, etc. |
| Match Score | Slider or min threshold |
| Date Range | found_at date picker |

### Sorting Options
- Risk Level (recall risk, not listing)
- Match Score (confidence)
- Date Found (newest/oldest)
- Price (low/high)
- Recall Number

    ↓
Check if Platforms are Added to Monitoring List
    ↓
[If No Platforms Added] → Prompt User to Add Platforms
    ↓
[If Platforms Added] → Search ONLY Added Marketplaces (Parallel)
    ↓
Aggregate Results from Active Platforms
    ↓
Display Results to User
    ↓
[Optional] Export or POST to API
```

### 7. Configuration & Settings

#### 7.1 Marketplace Configuration Schema
```json
{
  "marketplace_id": "amazon",
  "name": "Amazon",
  "enabled": true,
  "api_endpoint": "https://api.amazon.com/products",
  "api_key": "optional",
  "search_params": {
    "method": "api|scraping",
    "rate_limit": 100,
    "timeout": 5000
  },
  "custom_fields": {}
}
```

#### 7.2 Application Settings
- CPSC API update frequency (default: daily)
- Marketplace search timeout
- Cache duration
- Default export format
- API endpoint configuration
- Authentication settings

### 8. Security & Privacy

- **API Keys**: Store securely (environment variables, encrypted storage)
- **Rate Limiting**: Prevent abuse of marketplace APIs
- **Data Privacy**: Don't store personal information unnecessarily
- **HTTPS**: All API communications over HTTPS
- **Input Validation**: Sanitize all user inputs
- **CORS**: Configure appropriately for API access

### 9. Performance Requirements

- **Initial Load**: < 3 seconds
- **Search Response**: < 5 seconds for marketplace aggregation
- **Concurrent Searches**: Support multiple recall searches simultaneously
- **Caching**: Cache marketplace results for 1 hour (configurable)
- **Lazy Loading**: Load marketplace results on demand

### 10. Accessibility

- **WCAG 2.1 AA Compliance**: Follow accessibility guidelines despite visual effects
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Focus Management**: Clear focus indicators
- **Color Contrast**: Meet WCAG contrast requirements (ensure text readable over glass effects)

### 11. Testing Requirements

- **Unit Tests**: Core functionality (risk classification, data parsing)
- **Integration Tests**: Marketplace API integration
- **E2E Tests**: Critical user flows
- **Accessibility Tests**: Automated a11y testing

### 12. Deployment

- **Environment**: Web application (hosted or local)
- **Dependencies**: Document all required dependencies
- **Environment Variables**: Document required configuration
- **Docker**: Optional containerization for easy deployment

### 13. Future Enhancements (Optional)

- Email/SMS alerts for new recalls
- Dashboard with recall statistics
- Historical tracking of marketplace listings
- Machine learning for improved product matching
- Multi-language support
- Mobile app version

## Implementation Notes

1. **recalls.json Structure**: The initial dataset contains recall objects with fields like RecallID, RecallNumber, Products (with NumberOfUnits), Injuries, etc. Parse this structure carefully.

2. **CPSC API**: Research the CPSC Recalls API endpoint structure and authentication requirements. May need to scrape if no official API exists.

3. **Marketplace APIs**: Each marketplace has different API requirements, rate limits, and authentication. Plan for varying integration approaches. **IMPORTANT**: Only monitor platforms that users explicitly add - implement a whitelist approach where no monitoring occurs until platforms are added.

4. **Design System**: Custom futuristic glassmorphism CSS. Use CSS variables for theming. Consider using a glass effect library or custom backdrop-filter implementations.

5. **Risk Classification**: The algorithm should be flexible and configurable. Consider making thresholds adjustable via settings.

6. **Scalability**: Design for potential growth in number of marketplaces and recall volume. Consider background job processing for large batches.

## Backend Architecture (Python + MCP Server)

### Backend Stack
- **Runtime**: Python 3.11+
- **Framework**: FastAPI (async, modern, auto-documentation)
- **MCP Server**: Model Context Protocol for AI agent integration

### Skills vs MCP Tools

#### Skills (Internal Logic - NOT MCP Tools)
Internal processing functions used by the backend:
- **Risk Classifier**: Algorithm to calculate risk score and level
- **Query Builder**: Generate optimized search queries from recall data
- **Match Analyzer**: Calculate listing match scores

#### MCP Tools (External Actions - For AI Agents)
Actions exposed via MCP protocol for AI agents:
- `search_recalls` - Query recall database
- `get_recall_details` - Get full recall information
- `classify_risk` - Run risk classification
- `search_marketplaces` - Search enabled platforms
- `get_marketplace_listings` - Get found listings
- `list_marketplaces` - List configured platforms
- `toggle_marketplace` - Enable/disable platform
- `get_risk_summary` - Get risk distribution
- `get_latest_recalls` - Get recent recalls
- `build_search_query` - Generate search queries

#### MCP Resources
Read-only data access:
- `altitude://recalls/all` - All recalls
- `altitude://recalls/high-risk` - High-risk recalls
- `altitude://marketplaces/enabled` - Active platforms
- `altitude://config/agent` - Agent settings

### API Endpoints
- `GET /api/recalls/` - List recalls
- `GET /api/recalls/summary` - Risk counts
- `GET /api/recalls/search` - Search recalls
- `GET /api/recalls/{id}` - Recall details
- `GET /api/marketplaces/` - List platforms
- `POST /api/search/marketplace` - Search platforms
- `POST /api/search/visual` - Visual search
- `GET /api/agent/config` - Agent settings

## File Structure Recommendation

```
altitude/
├── spec.md (this file)
├── recalls.json (initial dataset)
├── README.md
├── package.json
├── mcp-config.json (MCP server config)
├── src/                          # React Frontend
│   ├── components/
│   │   ├── BrowserChrome.jsx
│   │   ├── SearchInput.jsx
│   │   ├── RecallCard.jsx
│   │   ├── RecallDetailView.jsx
│   │   ├── ImageGallery.jsx
│   │   ├── MarketplaceResults.jsx
│   │   ├── MarketplaceManager.jsx
│   │   ├── AgentSettings.jsx
│   │   ├── ToolIntegrations.jsx
│   │   └── RiskBadge.jsx
│   ├── services/
│   │   ├── api.js (backend client)
│   │   └── riskClassifier.js
│   ├── styles/
│   │   ├── main.css
│   │   └── glass-theme.css
│   └── App.jsx
├── backend/                       # Python Backend
│   ├── app/
│   │   ├── main.py               # FastAPI entry
│   │   ├── config.py             # Settings
│   │   ├── models/               # Pydantic models
│   │   │   ├── recall.py
│   │   │   ├── marketplace.py
│   │   │   └── agent.py
│   │   ├── routers/              # API routes
│   │   │   ├── recalls.py
│   │   │   ├── marketplaces.py
│   │   │   ├── search.py
│   │   │   └── agent.py
│   │   ├── services/             # Business logic
│   │   │   ├── database.py
│   │   │   ├── cpsc_api.py
│   │   │   └── visual_search.py
│   │   ├── skills/               # Agent skills
│   │   │   ├── risk_classifier.py
│   │   │   ├── query_builder.py
│   │   │   └── match_analyzer.py
│   │   └── mcp/                  # MCP server
│   │       └── server.py
│   ├── run.py                    # API server entry
│   ├── run_mcp.py                # MCP server entry
│   └── requirements.txt
├── public/
└── tests/
```

## Success Criteria

- ✅ **Application looks like an internet browser** with address bar, navigation buttons, and browser chrome
- ✅ **Home page shows latest recalls snapshot** with risk classification indicators
- ✅ **Universal search accepts ANY text** - recall numbers, product names, manufacturers, hazards, keywords
- ✅ **Real-time filtering** as user types in the browser-style address bar
- ✅ **Risk summary dashboard** shows distribution of High/Medium/Low recalls
- ✅ Users can input recall numbers and see results
- ✅ Application searches **ONLY** marketplaces that have been explicitly added to monitoring list
- ✅ No marketplace monitoring occurs until platforms are added by user
- ✅ Recalls are classified by risk level (High/Medium/Low)
- ✅ Users can add/remove marketplaces for monitoring (Facebook, eBay, Amazon, Craigslist, OfferUp, Mercari, etc.)
- ✅ Data can be exported or sent via API
- ✅ **Browser tabs** for multiple searches/views
- ✅ **Futuristic Liquid Glass design** - NOT USWDS, modern glassmorphism aesthetic
- ✅ Application updates from CPSC API
- ✅ Application loads and uses recalls.json as initial dataset


---

## Listings Management & Review Workflow

### Performance Requirements for Large Datasets
- **Scale Consideration**: System must handle millions of marketplace listings
- **Pagination**: All listing endpoints use cursor-based or page-based pagination
- **Infinite Scroll**: Frontend uses infinite scroll with intersection observer for smooth UX
- **Default Page Size**: 50 listings per page (configurable up to 200)
- **Lazy Loading**: Only load visible listings, defer loading of images and metadata
- **Indexing**: Backend should index on: recall_id, marketplace_id, status, match_score, found_at

### Listing Review Workflow

#### Listing Statuses
| Status | Description |
|--------|-------------|
| `pending` | Awaiting human review |
| `accepted` | Human confirmed as valid match |
| `rejected` | Human marked as false positive |
| `auto_accepted` | System auto-accepted (≥90% confidence) |

#### Auto-Accept Rule
- **Threshold**: Listings with `match_score >= 0.90` (90%+ confidence) are automatically accepted
- **Status**: Set to `auto_accepted` to distinguish from human-reviewed
- **Learning**: Still stored for training data validation

#### Accept Flow
- User clicks "Accept" button
- Listing status changes to `accepted`
- Review metadata recorded (reviewer, timestamp)
- Listing remains in active listings view

#### Reject Flow
- User clicks "Reject" button
- **Rejection Modal** prompts for:
  - **Category** (required): `wrong_product`, `wrong_brand`, `not_recalled`, `duplicate`, `sold`, `other`
  - **Details/Notes** (optional): Free-text explanation
- Listing status changes to `rejected`
- Listing removed from default listings view (hidden by default)
- **All metadata preserved** for agent learning

### Agent Learning from Rejections

#### Stored Metadata for Learning
```json
{
  "listing_id": "abc123",
  "recall_id": "cpsc-26156",
  "original_match_score": 0.72,
  "corrected_match_score": 0.1,  // Optional: what score should have been
  "status": "rejected",
  "rejection_reason": "Product is different model, not affected by recall",
  "rejection_category": "wrong_product",
  "match_factors": ["title_match", "brand_match"],
  "reviewed_by": "user_123",
  "reviewed_at": "2024-12-24T10:30:00Z",
  "time_to_review_seconds": 8,
  "notes": "Similar brand name but completely different product line"
}
```

#### Learning Endpoints
- `GET /api/listings/learning-data` - Export reviewed listings for training
- `GET /api/listings/rejected` - View all rejected listings for analysis
- Query params: `limit`, `category`, `date_from`, `date_to`

#### Pattern Recognition Goals
Over time, the agent should learn to:
1. **Reduce false positives** for specific rejection categories
2. **Adjust match scoring** based on human corrections
3. **Identify product families** that look similar but aren't recalled
4. **Recognize seller patterns** (e.g., trusted sellers with legitimate products)
5. **Weight different match factors** appropriately

### Bulk Operations
- **Bulk Accept**: Select multiple listings and accept all at once
- **Bulk Reject**: Select multiple listings and reject with single reason
- **Keyboard Shortcuts**: `A` for accept, `R` for reject, `Space` for select

### Filtering Options
| Filter | Options |
|--------|---------|
| Status | pending, accepted, rejected, auto_accepted, all |
| Risk Level | HIGH, MEDIUM, LOW, all |
| Marketplace | facebook, ebay, amazon, etc. |
| Match Score | Slider or min threshold |
| Date Range | found_at date picker |

### Sorting Options
- Risk Level (recall risk, not listing)
- Match Score (confidence)
- Date Found (newest/oldest)
- Price (low/high)
- Recall Number

    ↓
Check if Platforms are Added to Monitoring List
    ↓
[If No Platforms Added] → Prompt User to Add Platforms
    ↓
[If Platforms Added] → Search ONLY Added Marketplaces (Parallel)
    ↓
Aggregate Results from Active Platforms
    ↓
Display Results to User
    ↓
[Optional] Export or POST to API
```

### 7. Configuration & Settings

#### 7.1 Marketplace Configuration Schema
```json
{
  "marketplace_id": "amazon",
  "name": "Amazon",
  "enabled": true,
  "api_endpoint": "https://api.amazon.com/products",
  "api_key": "optional",
  "search_params": {
    "method": "api|scraping",
    "rate_limit": 100,
    "timeout": 5000
  },
  "custom_fields": {}
}
```

#### 7.2 Application Settings
- CPSC API update frequency (default: daily)
- Marketplace search timeout
- Cache duration
- Default export format
- API endpoint configuration
- Authentication settings

### 8. Security & Privacy

- **API Keys**: Store securely (environment variables, encrypted storage)
- **Rate Limiting**: Prevent abuse of marketplace APIs
- **Data Privacy**: Don't store personal information unnecessarily
- **HTTPS**: All API communications over HTTPS
- **Input Validation**: Sanitize all user inputs
- **CORS**: Configure appropriately for API access

### 9. Performance Requirements

- **Initial Load**: < 3 seconds
- **Search Response**: < 5 seconds for marketplace aggregation
- **Concurrent Searches**: Support multiple recall searches simultaneously
- **Caching**: Cache marketplace results for 1 hour (configurable)
- **Lazy Loading**: Load marketplace results on demand

### 10. Accessibility

- **WCAG 2.1 AA Compliance**: Follow accessibility guidelines despite visual effects
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Focus Management**: Clear focus indicators
- **Color Contrast**: Meet WCAG contrast requirements (ensure text readable over glass effects)

### 11. Testing Requirements

- **Unit Tests**: Core functionality (risk classification, data parsing)
- **Integration Tests**: Marketplace API integration
- **E2E Tests**: Critical user flows
- **Accessibility Tests**: Automated a11y testing

### 12. Deployment

- **Environment**: Web application (hosted or local)
- **Dependencies**: Document all required dependencies
- **Environment Variables**: Document required configuration
- **Docker**: Optional containerization for easy deployment

### 13. Future Enhancements (Optional)

- Email/SMS alerts for new recalls
- Dashboard with recall statistics
- Historical tracking of marketplace listings
- Machine learning for improved product matching
- Multi-language support
- Mobile app version

## Implementation Notes

1. **recalls.json Structure**: The initial dataset contains recall objects with fields like RecallID, RecallNumber, Products (with NumberOfUnits), Injuries, etc. Parse this structure carefully.

2. **CPSC API**: Research the CPSC Recalls API endpoint structure and authentication requirements. May need to scrape if no official API exists.

3. **Marketplace APIs**: Each marketplace has different API requirements, rate limits, and authentication. Plan for varying integration approaches. **IMPORTANT**: Only monitor platforms that users explicitly add - implement a whitelist approach where no monitoring occurs until platforms are added.

4. **Design System**: Custom futuristic glassmorphism CSS. Use CSS variables for theming. Consider using a glass effect library or custom backdrop-filter implementations.

5. **Risk Classification**: The algorithm should be flexible and configurable. Consider making thresholds adjustable via settings.

6. **Scalability**: Design for potential growth in number of marketplaces and recall volume. Consider background job processing for large batches.

## Backend Architecture (Python + MCP Server)

### Backend Stack
- **Runtime**: Python 3.11+
- **Framework**: FastAPI (async, modern, auto-documentation)
- **MCP Server**: Model Context Protocol for AI agent integration

### Skills vs MCP Tools

#### Skills (Internal Logic - NOT MCP Tools)
Internal processing functions used by the backend:
- **Risk Classifier**: Algorithm to calculate risk score and level
- **Query Builder**: Generate optimized search queries from recall data
- **Match Analyzer**: Calculate listing match scores

#### MCP Tools (External Actions - For AI Agents)
Actions exposed via MCP protocol for AI agents:
- `search_recalls` - Query recall database
- `get_recall_details` - Get full recall information
- `classify_risk` - Run risk classification
- `search_marketplaces` - Search enabled platforms
- `get_marketplace_listings` - Get found listings
- `list_marketplaces` - List configured platforms
- `toggle_marketplace` - Enable/disable platform
- `get_risk_summary` - Get risk distribution
- `get_latest_recalls` - Get recent recalls
- `build_search_query` - Generate search queries

#### MCP Resources
Read-only data access:
- `altitude://recalls/all` - All recalls
- `altitude://recalls/high-risk` - High-risk recalls
- `altitude://marketplaces/enabled` - Active platforms
- `altitude://config/agent` - Agent settings

### API Endpoints
- `GET /api/recalls/` - List recalls
- `GET /api/recalls/summary` - Risk counts
- `GET /api/recalls/search` - Search recalls
- `GET /api/recalls/{id}` - Recall details
- `GET /api/marketplaces/` - List platforms
- `POST /api/search/marketplace` - Search platforms
- `POST /api/search/visual` - Visual search
- `GET /api/agent/config` - Agent settings

## File Structure Recommendation

```
altitude/
├── spec.md (this file)
├── recalls.json (initial dataset)
├── README.md
├── package.json
├── mcp-config.json (MCP server config)
├── src/                          # React Frontend
│   ├── components/
│   │   ├── BrowserChrome.jsx
│   │   ├── SearchInput.jsx
│   │   ├── RecallCard.jsx
│   │   ├── RecallDetailView.jsx
│   │   ├── ImageGallery.jsx
│   │   ├── MarketplaceResults.jsx
│   │   ├── MarketplaceManager.jsx
│   │   ├── AgentSettings.jsx
│   │   ├── ToolIntegrations.jsx
│   │   └── RiskBadge.jsx
│   ├── services/
│   │   ├── api.js (backend client)
│   │   └── riskClassifier.js
│   ├── styles/
│   │   ├── main.css
│   │   └── glass-theme.css
│   └── App.jsx
├── backend/                       # Python Backend
│   ├── app/
│   │   ├── main.py               # FastAPI entry
│   │   ├── config.py             # Settings
│   │   ├── models/               # Pydantic models
│   │   │   ├── recall.py
│   │   │   ├── marketplace.py
│   │   │   └── agent.py
│   │   ├── routers/              # API routes
│   │   │   ├── recalls.py
│   │   │   ├── marketplaces.py
│   │   │   ├── search.py
│   │   │   └── agent.py
│   │   ├── services/             # Business logic
│   │   │   ├── database.py
│   │   │   ├── cpsc_api.py
│   │   │   └── visual_search.py
│   │   ├── skills/               # Agent skills
│   │   │   ├── risk_classifier.py
│   │   │   ├── query_builder.py
│   │   │   └── match_analyzer.py
│   │   └── mcp/                  # MCP server
│   │       └── server.py
│   ├── run.py                    # API server entry
│   ├── run_mcp.py                # MCP server entry
│   └── requirements.txt
├── public/
└── tests/
```

## Success Criteria

- ✅ **Application looks like an internet browser** with address bar, navigation buttons, and browser chrome
- ✅ **Home page shows latest recalls snapshot** with risk classification indicators
- ✅ **Universal search accepts ANY text** - recall numbers, product names, manufacturers, hazards, keywords
- ✅ **Real-time filtering** as user types in the browser-style address bar
- ✅ **Risk summary dashboard** shows distribution of High/Medium/Low recalls
- ✅ Users can input recall numbers and see results
- ✅ Application searches **ONLY** marketplaces that have been explicitly added to monitoring list
- ✅ No marketplace monitoring occurs until platforms are added by user
- ✅ Recalls are classified by risk level (High/Medium/Low)
- ✅ Users can add/remove marketplaces for monitoring (Facebook, eBay, Amazon, Craigslist, OfferUp, Mercari, etc.)
- ✅ Data can be exported or sent via API
- ✅ **Browser tabs** for multiple searches/views
- ✅ **Futuristic Liquid Glass design** - NOT USWDS, modern glassmorphism aesthetic
- ✅ Application updates from CPSC API
- ✅ Application loads and uses recalls.json as initial dataset


---

## Listings Management & Review Workflow

### Performance Requirements for Large Datasets
- **Scale Consideration**: System must handle millions of marketplace listings
- **Pagination**: All listing endpoints use cursor-based or page-based pagination
- **Infinite Scroll**: Frontend uses infinite scroll with intersection observer for smooth UX
- **Default Page Size**: 50 listings per page (configurable up to 200)
- **Lazy Loading**: Only load visible listings, defer loading of images and metadata
- **Indexing**: Backend should index on: recall_id, marketplace_id, status, match_score, found_at

### Listing Review Workflow

#### Listing Statuses
| Status | Description |
|--------|-------------|
| `pending` | Awaiting human review |
| `accepted` | Human confirmed as valid match |
| `rejected` | Human marked as false positive |
| `auto_accepted` | System auto-accepted (≥90% confidence) |

#### Auto-Accept Rule
- **Threshold**: Listings with `match_score >= 0.90` (90%+ confidence) are automatically accepted
- **Status**: Set to `auto_accepted` to distinguish from human-reviewed
- **Learning**: Still stored for training data validation

#### Accept Flow
- User clicks "Accept" button
- Listing status changes to `accepted`
- Review metadata recorded (reviewer, timestamp)
- Listing remains in active listings view

#### Reject Flow
- User clicks "Reject" button
- **Rejection Modal** prompts for:
  - **Category** (required): `wrong_product`, `wrong_brand`, `not_recalled`, `duplicate`, `sold`, `other`
  - **Details/Notes** (optional): Free-text explanation
- Listing status changes to `rejected`
- Listing removed from default listings view (hidden by default)
- **All metadata preserved** for agent learning

### Agent Learning from Rejections

#### Stored Metadata for Learning
```json
{
  "listing_id": "abc123",
  "recall_id": "cpsc-26156",
  "original_match_score": 0.72,
  "corrected_match_score": 0.1,  // Optional: what score should have been
  "status": "rejected",
  "rejection_reason": "Product is different model, not affected by recall",
  "rejection_category": "wrong_product",
  "match_factors": ["title_match", "brand_match"],
  "reviewed_by": "user_123",
  "reviewed_at": "2024-12-24T10:30:00Z",
  "time_to_review_seconds": 8,
  "notes": "Similar brand name but completely different product line"
}
```

#### Learning Endpoints
- `GET /api/listings/learning-data` - Export reviewed listings for training
- `GET /api/listings/rejected` - View all rejected listings for analysis
- Query params: `limit`, `category`, `date_from`, `date_to`

#### Pattern Recognition Goals
Over time, the agent should learn to:
1. **Reduce false positives** for specific rejection categories
2. **Adjust match scoring** based on human corrections
3. **Identify product families** that look similar but aren't recalled
4. **Recognize seller patterns** (e.g., trusted sellers with legitimate products)
5. **Weight different match factors** appropriately

### Bulk Operations
- **Bulk Accept**: Select multiple listings and accept all at once
- **Bulk Reject**: Select multiple listings and reject with single reason
- **Keyboard Shortcuts**: `A` for accept, `R` for reject, `Space` for select

### Filtering Options
| Filter | Options |
|--------|---------|
| Status | pending, accepted, rejected, auto_accepted, all |
| Risk Level | HIGH, MEDIUM, LOW, all |
| Marketplace | facebook, ebay, amazon, etc. |
| Match Score | Slider or min threshold |
| Date Range | found_at date picker |

### Sorting Options
- Risk Level (recall risk, not listing)
- Match Score (confidence)
- Date Found (newest/oldest)
- Price (low/high)
- Recall Number

    ↓
Check if Platforms are Added to Monitoring List
    ↓
[If No Platforms Added] → Prompt User to Add Platforms
    ↓
[If Platforms Added] → Search ONLY Added Marketplaces (Parallel)
    ↓
Aggregate Results from Active Platforms
    ↓
Display Results to User
    ↓
[Optional] Export or POST to API
```

### 7. Configuration & Settings

#### 7.1 Marketplace Configuration Schema
```json
{
  "marketplace_id": "amazon",
  "name": "Amazon",
  "enabled": true,
  "api_endpoint": "https://api.amazon.com/products",
  "api_key": "optional",
  "search_params": {
    "method": "api|scraping",
    "rate_limit": 100,
    "timeout": 5000
  },
  "custom_fields": {}
}
```

#### 7.2 Application Settings
- CPSC API update frequency (default: daily)
- Marketplace search timeout
- Cache duration
- Default export format
- API endpoint configuration
- Authentication settings

### 8. Security & Privacy

- **API Keys**: Store securely (environment variables, encrypted storage)
- **Rate Limiting**: Prevent abuse of marketplace APIs
- **Data Privacy**: Don't store personal information unnecessarily
- **HTTPS**: All API communications over HTTPS
- **Input Validation**: Sanitize all user inputs
- **CORS**: Configure appropriately for API access

### 9. Performance Requirements

- **Initial Load**: < 3 seconds
- **Search Response**: < 5 seconds for marketplace aggregation
- **Concurrent Searches**: Support multiple recall searches simultaneously
- **Caching**: Cache marketplace results for 1 hour (configurable)
- **Lazy Loading**: Load marketplace results on demand

### 10. Accessibility

- **WCAG 2.1 AA Compliance**: Follow accessibility guidelines despite visual effects
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Focus Management**: Clear focus indicators
- **Color Contrast**: Meet WCAG contrast requirements (ensure text readable over glass effects)

### 11. Testing Requirements

- **Unit Tests**: Core functionality (risk classification, data parsing)
- **Integration Tests**: Marketplace API integration
- **E2E Tests**: Critical user flows
- **Accessibility Tests**: Automated a11y testing

### 12. Deployment

- **Environment**: Web application (hosted or local)
- **Dependencies**: Document all required dependencies
- **Environment Variables**: Document required configuration
- **Docker**: Optional containerization for easy deployment

### 13. Future Enhancements (Optional)

- Email/SMS alerts for new recalls
- Dashboard with recall statistics
- Historical tracking of marketplace listings
- Machine learning for improved product matching
- Multi-language support
- Mobile app version

## Implementation Notes

1. **recalls.json Structure**: The initial dataset contains recall objects with fields like RecallID, RecallNumber, Products (with NumberOfUnits), Injuries, etc. Parse this structure carefully.

2. **CPSC API**: Research the CPSC Recalls API endpoint structure and authentication requirements. May need to scrape if no official API exists.

3. **Marketplace APIs**: Each marketplace has different API requirements, rate limits, and authentication. Plan for varying integration approaches. **IMPORTANT**: Only monitor platforms that users explicitly add - implement a whitelist approach where no monitoring occurs until platforms are added.

4. **Design System**: Custom futuristic glassmorphism CSS. Use CSS variables for theming. Consider using a glass effect library or custom backdrop-filter implementations.

5. **Risk Classification**: The algorithm should be flexible and configurable. Consider making thresholds adjustable via settings.

6. **Scalability**: Design for potential growth in number of marketplaces and recall volume. Consider background job processing for large batches.

## Backend Architecture (Python + MCP Server)

### Backend Stack
- **Runtime**: Python 3.11+
- **Framework**: FastAPI (async, modern, auto-documentation)
- **MCP Server**: Model Context Protocol for AI agent integration

### Skills vs MCP Tools

#### Skills (Internal Logic - NOT MCP Tools)
Internal processing functions used by the backend:
- **Risk Classifier**: Algorithm to calculate risk score and level
- **Query Builder**: Generate optimized search queries from recall data
- **Match Analyzer**: Calculate listing match scores

#### MCP Tools (External Actions - For AI Agents)
Actions exposed via MCP protocol for AI agents:
- `search_recalls` - Query recall database
- `get_recall_details` - Get full recall information
- `classify_risk` - Run risk classification
- `search_marketplaces` - Search enabled platforms
- `get_marketplace_listings` - Get found listings
- `list_marketplaces` - List configured platforms
- `toggle_marketplace` - Enable/disable platform
- `get_risk_summary` - Get risk distribution
- `get_latest_recalls` - Get recent recalls
- `build_search_query` - Generate search queries

#### MCP Resources
Read-only data access:
- `altitude://recalls/all` - All recalls
- `altitude://recalls/high-risk` - High-risk recalls
- `altitude://marketplaces/enabled` - Active platforms
- `altitude://config/agent` - Agent settings

### API Endpoints
- `GET /api/recalls/` - List recalls
- `GET /api/recalls/summary` - Risk counts
- `GET /api/recalls/search` - Search recalls
- `GET /api/recalls/{id}` - Recall details
- `GET /api/marketplaces/` - List platforms
- `POST /api/search/marketplace` - Search platforms
- `POST /api/search/visual` - Visual search
- `GET /api/agent/config` - Agent settings

## File Structure Recommendation

```
altitude/
├── spec.md (this file)
├── recalls.json (initial dataset)
├── README.md
├── package.json
├── mcp-config.json (MCP server config)
├── src/                          # React Frontend
│   ├── components/
│   │   ├── BrowserChrome.jsx
│   │   ├── SearchInput.jsx
│   │   ├── RecallCard.jsx
│   │   ├── RecallDetailView.jsx
│   │   ├── ImageGallery.jsx
│   │   ├── MarketplaceResults.jsx
│   │   ├── MarketplaceManager.jsx
│   │   ├── AgentSettings.jsx
│   │   ├── ToolIntegrations.jsx
│   │   └── RiskBadge.jsx
│   ├── services/
│   │   ├── api.js (backend client)
│   │   └── riskClassifier.js
│   ├── styles/
│   │   ├── main.css
│   │   └── glass-theme.css
│   └── App.jsx
├── backend/                       # Python Backend
│   ├── app/
│   │   ├── main.py               # FastAPI entry
│   │   ├── config.py             # Settings
│   │   ├── models/               # Pydantic models
│   │   │   ├── recall.py
│   │   │   ├── marketplace.py
│   │   │   └── agent.py
│   │   ├── routers/              # API routes
│   │   │   ├── recalls.py
│   │   │   ├── marketplaces.py
│   │   │   ├── search.py
│   │   │   └── agent.py
│   │   ├── services/             # Business logic
│   │   │   ├── database.py
│   │   │   ├── cpsc_api.py
│   │   │   └── visual_search.py
│   │   ├── skills/               # Agent skills
│   │   │   ├── risk_classifier.py
│   │   │   ├── query_builder.py
│   │   │   └── match_analyzer.py
│   │   └── mcp/                  # MCP server
│   │       └── server.py
│   ├── run.py                    # API server entry
│   ├── run_mcp.py                # MCP server entry
│   └── requirements.txt
├── public/
└── tests/
```

## Success Criteria

- ✅ **Application looks like an internet browser** with address bar, navigation buttons, and browser chrome
- ✅ **Home page shows latest recalls snapshot** with risk classification indicators
- ✅ **Universal search accepts ANY text** - recall numbers, product names, manufacturers, hazards, keywords
- ✅ **Real-time filtering** as user types in the browser-style address bar
- ✅ **Risk summary dashboard** shows distribution of High/Medium/Low recalls
- ✅ Users can input recall numbers and see results
- ✅ Application searches **ONLY** marketplaces that have been explicitly added to monitoring list
- ✅ No marketplace monitoring occurs until platforms are added by user
- ✅ Recalls are classified by risk level (High/Medium/Low)
- ✅ Users can add/remove marketplaces for monitoring (Facebook, eBay, Amazon, Craigslist, OfferUp, Mercari, etc.)
- ✅ Data can be exported or sent via API
- ✅ **Browser tabs** for multiple searches/views
- ✅ **Futuristic Liquid Glass design** - NOT USWDS, modern glassmorphism aesthetic
- ✅ Application updates from CPSC API
- ✅ Application loads and uses recalls.json as initial dataset


---

## Listings Management & Review Workflow

### Performance Requirements for Large Datasets
- **Scale Consideration**: System must handle millions of marketplace listings
- **Pagination**: All listing endpoints use cursor-based or page-based pagination
- **Infinite Scroll**: Frontend uses infinite scroll with intersection observer for smooth UX
- **Default Page Size**: 50 listings per page (configurable up to 200)
- **Lazy Loading**: Only load visible listings, defer loading of images and metadata
- **Indexing**: Backend should index on: recall_id, marketplace_id, status, match_score, found_at

### Listing Review Workflow

#### Listing Statuses
| Status | Description |
|--------|-------------|
| `pending` | Awaiting human review |
| `accepted` | Human confirmed as valid match |
| `rejected` | Human marked as false positive |
| `auto_accepted` | System auto-accepted (≥90% confidence) |

#### Auto-Accept Rule
- **Threshold**: Listings with `match_score >= 0.90` (90%+ confidence) are automatically accepted
- **Status**: Set to `auto_accepted` to distinguish from human-reviewed
- **Learning**: Still stored for training data validation

#### Accept Flow
- User clicks "Accept" button
- Listing status changes to `accepted`
- Review metadata recorded (reviewer, timestamp)
- Listing remains in active listings view

#### Reject Flow
- User clicks "Reject" button
- **Rejection Modal** prompts for:
  - **Category** (required): `wrong_product`, `wrong_brand`, `not_recalled`, `duplicate`, `sold`, `other`
  - **Details/Notes** (optional): Free-text explanation
- Listing status changes to `rejected`
- Listing removed from default listings view (hidden by default)
- **All metadata preserved** for agent learning

### Agent Learning from Rejections

#### Stored Metadata for Learning
```json
{
  "listing_id": "abc123",
  "recall_id": "cpsc-26156",
  "original_match_score": 0.72,
  "corrected_match_score": 0.1,  // Optional: what score should have been
  "status": "rejected",
  "rejection_reason": "Product is different model, not affected by recall",
  "rejection_category": "wrong_product",
  "match_factors": ["title_match", "brand_match"],
  "reviewed_by": "user_123",
  "reviewed_at": "2024-12-24T10:30:00Z",
  "time_to_review_seconds": 8,
  "notes": "Similar brand name but completely different product line"
}
```

#### Learning Endpoints
- `GET /api/listings/learning-data` - Export reviewed listings for training
- `GET /api/listings/rejected` - View all rejected listings for analysis
- Query params: `limit`, `category`, `date_from`, `date_to`

#### Pattern Recognition Goals
Over time, the agent should learn to:
1. **Reduce false positives** for specific rejection categories
2. **Adjust match scoring** based on human corrections
3. **Identify product families** that look similar but aren't recalled
4. **Recognize seller patterns** (e.g., trusted sellers with legitimate products)
5. **Weight different match factors** appropriately

### Bulk Operations
- **Bulk Accept**: Select multiple listings and accept all at once
- **Bulk Reject**: Select multiple listings and reject with single reason
- **Keyboard Shortcuts**: `A` for accept, `R` for reject, `Space` for select

### Filtering Options
| Filter | Options |
|--------|---------|
| Status | pending, accepted, rejected, auto_accepted, all |
| Risk Level | HIGH, MEDIUM, LOW, all |
| Marketplace | facebook, ebay, amazon, etc. |
| Match Score | Slider or min threshold |
| Date Range | found_at date picker |

### Sorting Options
- Risk Level (recall risk, not listing)
- Match Score (confidence)
- Date Found (newest/oldest)
- Price (low/high)
- Recall Number
