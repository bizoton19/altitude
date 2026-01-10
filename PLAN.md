# Development Plan - Altitude Violation Monitoring System

## Current Status Summary

### ✅ Completed
- Glass theme UI design system
- Violation and Investigation forms with beautiful styling
- Menu bar component for navigation
- Basic violation and investigation CRUD operations
- Risk classification system
- Marketplace search infrastructure

---

## Phase 1: Navigation & UI Consistency (Priority: HIGH)

### 1.1 Menu Bar Present Everywhere
**Status**: ⚠️ Partial - Menu bar missing in some views

**Tasks**:
- [ ] Add MenuBar component to all view components:
  - [ ] InvestigationList view (when form is shown)
  - [ ] InvestigationDetail view
  - [ ] ReviewQueue view
  - [ ] Settings view
  - [ ] AllListingsView
  - [ ] RecallDetailView (violation detail)
- [ ] Ensure MenuBar is always rendered after BrowserChrome
- [ ] Update MenuBar to handle active state based on current route/view
- [ ] Test navigation between all views maintains menu bar visibility

**Files to Modify**:
- `src/App.jsx` - Ensure MenuBar is in all conditional renders
- `src/components/MenuBar.jsx` - Add view detection logic
- All view components to ensure BrowserChrome + MenuBar structure

### 1.2 Back Button Functionality
**Status**: ⚠️ Partial - Back button doesn't work from InvestigationForm

**Tasks**:
- [ ] Fix back button in InvestigationList when form is shown
  - Current issue: `onBack` only handles detail view, not form view
  - Solution: Track form state and handle back navigation properly
- [ ] Ensure back button works from:
  - [ ] InvestigationForm (create/edit)
  - [ ] ViolationForm (already works)
  - [ ] ReviewQueue detail views
  - [ ] Settings sub-sections
  - [ ] AllListingsView detail views
- [ ] Implement navigation history stack for proper back/forward
- [ ] Update `handleBack` function to handle all view states

**Files to Modify**:
- `src/App.jsx` - Update `handleBack` function
- `src/components/InvestigationList.jsx` - Add back button handler for form
- `src/components/InvestigationForm.jsx` - Ensure onCancel triggers back navigation

**Implementation Notes**:
```javascript
// In App.jsx, update handleBack to handle form states
const handleBack = () => {
  if (showViolationForm) {
    setShowViolationForm(false)
  } else if (showInvestigations && showForm) {
    setShowForm(false) // Close form, stay in investigations
  } else if (selectedInvestigation) {
    setSelectedInvestigation(null)
  } else if (showInvestigations) {
    setShowInvestigations(false)
  }
  // ... other conditions
}
```

---

## Phase 2: Backend API Completeness (Priority: HIGH)

### 2.1 Violation Creation API
**Status**: ✅ Complete - Endpoint exists at `POST /api/violations/`

**Verification Tasks**:
- [ ] Verify ViolationCreate model accepts all required fields
- [ ] Test creating violation with products, hazards, remedies, images
- [ ] Ensure violation_id generation is unique
- [ ] Verify risk classification runs on creation
- [ ] Test validation errors return proper messages

**Current Endpoint**: `POST /api/violations/`
**Model**: `ViolationCreate` in `backend/app/models/violation.py`

**Potential Issues**:
- Products, hazards, remedies, images may need separate endpoints or nested creation
- Need to verify if ViolationCreate accepts nested objects

**Files to Check**:
- `backend/app/routers/violations.py` - `create_violation` function
- `backend/app/models/violation.py` - `ViolationCreate` model
- `backend/app/services/database.py` - `add_violation` function

### 2.2 Investigation Creation API
**Status**: ✅ Complete - Endpoint exists at `POST /api/investigations/`

**Verification Tasks**:
- [ ] Verify InvestigationCreate model accepts all required fields
- [ ] Test creating investigation with violation_ids and marketplace_ids
- [ ] Ensure investigation_id generation is unique
- [ ] Verify investigation scheduler is triggered on creation
- [ ] Test PATCH endpoint for updating investigations
- [ ] Verify region_ids handling works correctly

**Current Endpoint**: `POST /api/investigations/`
**Model**: `InvestigationCreate` in `backend/app/models/investigation.py`

**Files to Check**:
- `backend/app/routers/investigations.py` - `create_investigation` function
- `backend/app/models/investigation.py` - `InvestigationCreate` model
- `backend/app/services/investigation_scheduler.py` - Scheduling logic

### 2.2.1 Investigation Scheduler System
**Status**: ✅ Complete - Fully implemented using APScheduler

**Overview**:
The Investigation Scheduler is a service that automatically runs scheduled investigations at their configured times. It uses APScheduler (AsyncIOScheduler) to manage job execution and automatically reschedules recurring investigations.

**Location**: `backend/app/services/investigation_scheduler.py`

**Key Components**:

1. **Scheduler Instance** (`get_scheduler()`)
   - Creates and manages a singleton `AsyncIOScheduler` instance
   - Initialized once and reused across the application
   - Starts automatically with FastAPI app lifecycle

2. **Schedule Types** (`InvestigationSchedule` enum):
   - `DAILY` - Runs daily at the same time
   - `WEEKLY` - Runs once per week
   - `BIWEEKLY` - Runs every 2 weeks
   - `MONTHLY` - Runs monthly on the same date/time
   - `CUSTOM` - One-time execution at scheduled time

3. **Core Functions**:
   - `schedule_investigation(investigation)` - Schedules an investigation for its next run
   - `calculate_next_run_time(start_time, schedule)` - Calculates next execution time based on schedule type
   - `run_investigation_task(investigation_id)` - Executes the investigation when triggered
   - `start_scheduler()` - Starts scheduler and loads all scheduled investigations on app startup
   - `stop_scheduler()` - Stops scheduler on app shutdown
   - `remove_investigation_job(investigation_id)` - Removes a scheduled job

4. **Investigation Execution Flow**:
   - When triggered, updates investigation status to `RUNNING`
   - Generates marketplace listings for target violations (MVP: mock listings)
   - Links listings to the investigation via join records
   - Updates investigation status to `COMPLETED` or `FAILED`
   - Automatically reschedules for next run (if recurring and not cancelled)

5. **Integration Points**:
   - **App Lifecycle** (`backend/app/main.py`): Started on app startup, stopped on shutdown
   - **Investigation Creation** (`backend/app/services/workflow_service.py`): Automatically schedules new investigations
   - **Investigation Router** (`backend/app/routers/investigations.py`): Provides endpoints to schedule/unschedule investigations
   - **Manual Execution**: Can trigger investigations manually via API endpoint

6. **Job Management**:
   - Each investigation has a unique job ID: `investigation_{investigation_id}`
   - Jobs are automatically replaced when an investigation is updated
   - Only investigations with status `SCHEDULED` are loaded on startup
   - Failed investigations are not automatically rescheduled

**Dependencies**:
- `apscheduler` - Must be installed: `pip install APScheduler`
- Uses `DateTrigger` for one-time scheduling
- Can be extended to use `CronTrigger` for more complex schedules

**Status Flow**:
```
SCHEDULED → (scheduler triggers) → RUNNING → COMPLETED → (rescheduled if recurring)
                                    ↓
                                 FAILED
```

### 2.3 API Testing & Documentation
**Tasks**:
- [ ] Create Postman/Insomnia collection for API testing
- [ ] Document all endpoints with examples
- [ ] Add request/response validation
- [ ] Test error handling and edge cases

---

## Phase 3: Agent-Based Violation Import (Priority: MEDIUM)

### 3.1 Agent-Based Import System Design
**Status**: 📋 Planning - **See AGENT_IMPORT_PLAN.md for detailed implementation plan**

**Approach**: Use AI agent with MCP tools instead of manually coding importers

**Requirements**:
- Violations can be imported from API, database, or CSV
- Agent intelligently maps fields (no manual coding per source)
- Support scheduled imports (cron-like)
- Support on-demand imports
- Track import source and metadata

**Key Components Needed**:

1. **MCP Tools** (Add to `backend/app/mcp/server.py`):
   - [ ] `import_violations_from_api` - Import from REST API
   - [ ] `import_violations_from_database` - Import from DB (PostgreSQL/MySQL/SQLite)
   - [ ] `import_violations_from_csv` - Import from CSV file
   - [ ] `create_violation` - Create violation (verify exists)

2. **Models**:
   - [ ] Create `ViolationImport` model
   - [ ] Add import fields to `Violation` model (`import_source`, `imported_at`, etc.)
   - [ ] Add `IMPORT_VIOLATIONS` to `TaskType` enum

3. **Services**:
   - [ ] Create `violation_import_agent.py` - Agent task execution
   - [ ] Add import storage to `database.py`

4. **API Endpoints**:
   - [ ] `POST /api/violation-imports/` - Create import config
   - [ ] `GET /api/violation-imports/` - List imports
   - [ ] `POST /api/violation-imports/{id}/run` - Trigger import
   - [ ] `GET /api/violation-imports/{id}/history` - Import history

5. **Frontend**:
   - [ ] ViolationImportManager component
   - [ ] ViolationImportForm component
   - [ ] Add to Settings UI

**Dependencies to Add**:
- `pandas>=2.0.0` - CSV parsing
- `psycopg2-binary>=2.9.0` - PostgreSQL
- `pymysql>=1.1.0` - MySQL

**Agent Requirements**:
- MCP-compatible agent (Claude, GPT-4, or local model)
- MCP client/host configured
- Agent can call MCP tools

**See `AGENT_IMPORT_PLAN.md` for complete implementation details.**

---

## Phase 4: Marketplace Management System (Priority: HIGH)

### 4.1 Marketplace Detail View & Edit
**Status**: 📋 Planning

**Current State**: Basic marketplace model exists, but no detailed management UI

**Requirements**:
1. View marketplace details
2. Edit marketplace configuration
3. Monitor frequency settings
4. Risk level tracking based on violation listings
5. Notification configuration
6. Portal credentials management
7. Platform agreement management

### 4.2 Marketplace Model Extensions

**Tasks**:
- [ ] Extend Marketplace model with new fields:
  ```python
  class Marketplace(BaseModel):
      # ... existing fields ...
      
      # Monitoring configuration
      monitoring_frequency: MonitoringFrequency  # daily, weekly, etc.
      monitoring_enabled: bool = True
      last_monitored_at: Optional[datetime] = None
      
      # Risk tracking
      risk_level: RiskLevel  # Based on violation listings found
      violation_listings_count: int = 0
      risk_calculation_date: Optional[datetime] = None
      
      # Notification configuration
      notification_types: List[NotificationType] = []
      notification_email: Optional[str] = None
      notification_portal_url: Optional[str] = None
      notification_portal_credentials: Optional[Dict[str, str]] = {}  # Encrypted
      
      # Platform agreement
      platform_agreements: List[PlatformAgreement] = []
      
      # Additional metadata
      metadata: Dict[str, Any] = Field(default_factory=dict)
  ```

- [ ] Create supporting models:
  ```python
  class MonitoringFrequency(str, Enum):
      HOURLY = "hourly"
      DAILY = "daily"
      WEEKLY = "weekly"
      BIWEEKLY = "biweekly"
      MONTHLY = "monthly"
      CUSTOM = "custom"
  
  class NotificationType(str, Enum):
      EMAIL = "email"
      PORTAL = "portal"
      WEBHOOK = "webhook"
      SMS = "sms"
  
  class PlatformAgreement(BaseModel):
      agreement_id: str
      agreement_type: str  # "terms_of_service", "api_agreement", etc.
      agreement_date: datetime
      agreement_url: Optional[str] = None
      email_attachments: List[str] = []  # File paths or URLs
      metadata: Dict[str, Any] = Field(default_factory=dict)
  ```

**Files to Modify**:
- `backend/app/models/marketplace.py` - Add new fields and models
- `backend/app/services/database.py` - Update marketplace CRUD operations

### 4.3 Marketplace Management UI

**Tasks**:
- [ ] Create MarketplaceDetailView component
- [ ] Create MarketplaceEditForm component
- [ ] Add sections for:
  - [ ] **Basic Information**: Name, URL, enabled status
  - [ ] **Monitoring Configuration**:
    - [ ] Frequency selector (hourly, daily, weekly, etc.)
    - [ ] Enable/disable toggle
    - [ ] Last monitored timestamp
    - [ ] Next scheduled monitoring time
  - [ ] **Risk Level Tracking**:
    - [ ] Display current risk level (based on violation listings)
    - [ ] Show violation listings count
    - [ ] Show risk calculation date
    - [ ] Manual risk recalculation button
  - [ ] **Notification Settings**:
    - [ ] Notification type checkboxes (Email, Portal, Webhook, SMS)
    - [ ] Email input field
    - [ ] Portal URL input
    - [ ] Portal credentials form (username, password, encrypted storage)
    - [ ] Test notification button
  - [ ] **Platform Agreements**:
    - [ ] List of agreements
    - [ ] Add new agreement form:
      - [ ] Agreement type dropdown
      - [ ] Agreement date picker
      - [ ] Agreement URL input
      - [ ] Email attachments upload
      - [ ] Key-value metadata editor
    - [ ] Edit/delete existing agreements
  - [ ] **Additional Metadata**:
    - [ ] Key-value pair editor for custom metadata
    - [ ] Add/remove metadata entries

**Files to Create**:
- `src/components/MarketplaceDetailView.jsx`
- `src/components/MarketplaceEditForm.jsx`
- `src/components/PlatformAgreementForm.jsx`
- `src/components/NotificationConfigForm.jsx`

**Files to Modify**:
- `src/components/MarketplaceManager.jsx` - Add detail/edit views
- `src/App.jsx` - Add marketplace detail route

### 4.4 Backend API for Marketplace Management

**Tasks**:
- [ ] Create/update marketplace endpoints:
  - [ ] `GET /api/marketplaces/{marketplace_id}` - Get full details
  - [ ] `PATCH /api/marketplaces/{marketplace_id}` - Update marketplace
  - [ ] `POST /api/marketplaces/{marketplace_id}/agreements` - Add agreement
  - [ ] `PATCH /api/marketplaces/{marketplace_id}/agreements/{agreement_id}` - Update agreement
  - [ ] `DELETE /api/marketplaces/{marketplace_id}/agreements/{agreement_id}` - Delete agreement
  - [ ] `POST /api/marketplaces/{marketplace_id}/calculate-risk` - Recalculate risk
  - [ ] `POST /api/marketplaces/{marketplace_id}/test-notification` - Test notification
- [ ] Add credential encryption service
- [ ] Add risk calculation service based on violation listings

**Files to Create**:
- `backend/app/services/credential_encryption.py`
- `backend/app/services/marketplace_risk_calculator.py`

**Files to Modify**:
- `backend/app/routers/marketplaces.py` - Add new endpoints
- `backend/app/services/database.py` - Add marketplace detail operations

### 4.5 Risk Level Calculation Logic

**Tasks**:
- [ ] Implement risk calculation based on:
  - [ ] Number of violation listings found in past X days
  - [ ] Severity of violations found
  - [ ] Frequency of violations
  - [ ] Marketplace compliance history
- [ ] Create risk calculation algorithm
- [ ] Schedule automatic risk recalculation
- [ ] Allow manual recalculation trigger

**Risk Calculation Formula** (to be refined):
```
risk_score = (
    (violation_listings_count / time_period_days) * weight_frequency +
    (avg_violation_severity) * weight_severity +
    (compliance_score) * weight_compliance
)
```

---

## Implementation Priority Order

1. **Phase 1.1 & 1.2** - Navigation fixes (CRITICAL - blocks user workflow)
2. **Phase 2** - Backend API verification (HIGH - ensures core functionality works)
3. **Phase 4** - Marketplace Management (HIGH - core feature)
4. **Phase 3** - Automated Import (MEDIUM - nice to have)

---

## Testing Checklist

### Navigation Testing
- [ ] Menu bar visible in all views
- [ ] Back button works from all components
- [ ] Navigation history works correctly
- [ ] Active menu item highlights correctly

### Backend API Testing
- [ ] Create violation with all fields
- [ ] Create investigation with all fields
- [ ] Update investigation
- [ ] Error handling works correctly

### Marketplace Management Testing
- [ ] View marketplace details
- [ ] Edit marketplace settings
- [ ] Add/edit platform agreements
- [ ] Configure notifications
- [ ] Test notification sending
- [ ] Risk level calculation works
- [ ] Credentials are encrypted

---

## Notes & Considerations

1. **Credential Security**: Portal credentials must be encrypted at rest. Consider using environment-based encryption keys.

2. **Risk Calculation**: Risk level should be recalculated:
   - Automatically after each investigation run
   - Manually on demand
   - On a scheduled basis (e.g., daily)

3. **Notification Testing**: Need a way to test notifications without actually sending them in production.

4. **Import Scheduling**: Consider using APScheduler or similar for cron-like scheduling.

5. **Metadata Storage**: Key-value metadata should be flexible but validated to prevent abuse.

6. **Agreement Attachments**: Consider file storage solution (local filesystem, S3, etc.) for email attachments.

---

## Future Enhancements (Out of Scope for Now)

- Multi-user support with permissions
- Audit logging
- Advanced analytics and reporting
- Mobile app
- Real-time notifications via WebSocket
- Integration with more violation sources
- Machine learning for better violation detection

