---
name: Organization Risk Classification System
overview: Implement per-organization customizable risk classification rules with baseline templates (CPSC-style), separate rule sets for violations and marketplaces, and a risk rating history/log system for violations that tracks reassessments and reviews over time.
todos:
  - id: schema-marketplace
    content: "PHASE 1: Create marketplace schema changes - Add marketplace fields (initial_review_date, initial_analyst, review_days, assigned_analyst), create marketplace_contacts and marketplace_contact_events tables. These must be done first as marketplace risk calculations depend on these fields."
    status: pending
    dependencies: []
  - id: schema-violations
    content: "PHASE 2: Create violation schema changes - Add violation fields (current_risk_rating_id, last_risk_calculation_date, risk_calculation_version). Extend violations table with CPSC required fields validation."
    status: pending
    dependencies: []
  - id: schema-risk-ratings
    content: "PHASE 3: Create risk rating history tables - Create violation_risk_ratings and marketplace_risk_ratings tables for storing calculated risk ratings and intermediate rank values. Note: Rank values are NOT stored as columns in main entities, but in calculation_metadata JSON within risk_ratings tables."
    status: pending
    dependencies: ['schema-marketplace', 'schema-violations']
  - id: schema-org-rules
    content: "PHASE 4: Create organization risk rules table - Create organization_risk_rules table with sharing fields (is_public, is_shareable, shared_with_orgs, etc.). This stores the rule configurations, not the calculated ranks."
    status: pending
    dependencies: ['schema-risk-ratings']
  - id: models
    content: Create Pydantic models for ViolationRiskRating and OrganizationRiskRules
    status: pending
    dependencies:
      - schema
  - id: extend-violation
    content: Extend violations table/entity with current_risk_rating_id, last_risk_calculation_date, risk_calculation_version
    status: pending
    dependencies:
      - schema
  - id: cpsc-template
    content: Create CPSC baseline template with ranking rules (Incidents, Lot/Serial, Units, Remedy, Lifespan) and risk rating matrix
    status: pending
    dependencies:
      - models
  - id: field-selection
    content: Implement field selection system for organizations to choose which violation/marketplace fields to include
    status: pending
    dependencies:
      - models
  - id: ranking-calculator
    content: Implement CPSC-style ranking calculator (1-5 ranks) and probability/impact score calculation
    status: pending
    dependencies:
      - cpsc-template
  - id: org-rules-service
    content: Create organization_risk_service.py to manage org-specific rules and template copying
    status: pending
    dependencies:
      - models
      - cpsc-template
  - id: update-classifier
    content: Update risk_classifier.py to use organization-specific rules instead of global config
    status: pending
    dependencies:
      - org-rules-service
      - ranking-calculator
  - id: rating-history
    content: Implement risk rating history system with reassessment tracking and review dates
    status: pending
    dependencies:
      - models
      - update-classifier
  - id: api-endpoints
    content: Create API endpoints for organization risk rules, violation risk rating history, and shared risk rules (public/shared rules browsing, copying, sharing settings)
    status: pending
    dependencies:
      - org-rules-service
      - rating-history
  - id: rule-sharing
    content: Implement risk rule sharing system - sharing permissions, rule discovery/marketplace, copying rules, and automatic application when importing violations
    status: pending
    dependencies:
      - api-endpoints
      - models
  - id: ui-config
    content: Build comprehensive UI component for configuring organization risk classification rules - must support editing all thresholds, formulas, matrix values, field selection, and ranking rules with validation and preview
    status: pending
    dependencies:
      - api-endpoints
  - id: ui-history
    content: Build UI component for viewing risk rating history and performing reassessments
    status: pending
    dependencies:
      - api-endpoints
  - id: ui-sharing
    content: Build UI components for risk rules marketplace (browse shared rules), sharing settings, and import-with-rules dialog
    status: pending
    dependencies:
      - rule-sharing
      - api-endpoints
---

# Organization Risk Classification System

## Overview

Each organization will have their own customizable risk classification rules that can be based on baseline templates (like CPSC). Organizations can select which fields from violations and marketplaces to include in risk calculations. Violations will maintain a history of risk ratings with reassessment tracking.

**Collaboration Feature:** Organizations can share their risk classification rules with other organizations, allowing them to view and use each other's risk assessments when importing bans/violations. This enables:
- Learning from other agencies' risk assessment approaches
- Standardizing risk classification across collaborating organizations
- Automatically applying source organization's risk rules when importing their violations
- Building a library/marketplace of proven risk classification strategies

## Architecture

### 1. Database Schema Changes

#### New Table: `violation_risk_ratings`

Track risk rating history for violations (one-to-many relationship):

- `id` (PK)
- `violation_id` (FK to violations)
- `calculated_risk_rating` (Critical, Severe, Moderate, Minor, etc.)
- `probability_score` (Very High, High, Medium, Low, Very Low)
- `impact_score` (Very High, High, Medium, Low, Very Low)
- `notes` (TEXT, free text)
- `monitoring_results` (JSON, structured monitoring data)
- `reassessed_rating` (nullable, can increase/decrease from calculated)
- `reviewed_date` (datetime, when reviewed)
- `reviewed_by` (string, user ID or name)
- `calculation_metadata` (JSON, stores intermediate calculations like rank values)
- `created_at` (datetime)
- `updated_at` (datetime)

#### New Table: `organization_risk_rules`

Store organization-specific risk classification rules:

- `id` (PK)
- `organization_id` (FK to organizations)
- `rule_type` (enum: 'violation', 'marketplace')
- `rule_name` (string, e.g., "CPSC Baseline", "Custom Rules v1")
- `is_baseline` (boolean, true for template-based rules)
- `baseline_template` (string, e.g., "CPSC", "FDA", "custom")
- `config_data` (JSON, full RiskClassificationConfig)
- `enabled` (boolean)
- **Sharing & Visibility:**
  - `is_public` (boolean, default false) - Whether this rule set is visible to other organizations
  - `is_shareable` (boolean, default false) - Whether other organizations can copy/use this rule set
  - `shared_with_orgs` (JSON array of organization_ids, nullable) - Specific organizations that can access this rule (if not public)
  - `description` (text, nullable) - Description of the rule set for sharing purposes
  - `usage_count` (integer, default 0) - Number of times other organizations have copied this rule
  - `created_by_org_id` (FK to organizations, nullable) - Original creator if copied from another org
- `created_at`, `updated_at`

#### Update: `violations` table

Add fields for current/latest risk rating:

- `current_risk_rating_id` (FK to violation_risk_ratings, nullable)
- `last_risk_calculation_date` (datetime, nullable)
- `risk_calculation_version` (string, which rule version was used)

**Required Fields for US CPSC (Consumer Product Safety Commission):**

- `violation_number` (already exists, must be required for CPSC organizations)
- `violation_date` (already exists as optional, must be required for CPSC organizations - represents ban/recall/violation date)

**Note on Terminology:**

- CPSC uses "ban/recall/violation" terminology
- The `violation_date` field represents when the ban/recall/violation was issued
- These fields must be validated before risk calculation can proceed for CPSC organizations

#### Update: `marketplaces` table

Add fields for CPSC platform tracking and risk rating:

- `current_risk_rating_id` (FK to marketplace_risk_ratings, nullable)
- `initial_review_date` (date, nullable) - Date platform was first assessed
- `initial_analyst` (varchar(10), nullable) - Analyst initials (e.g., "MMR", "SED")
- `review_days` (integer, nullable) - Days between reviews (drives monitoring frequency)
- `last_review_date` (date, nullable) - Date last assessment completed (may be same as `last_monitored_at` or separate)
- `assigned_analyst` (varchar(50), nullable) - Analyst responsible (can contain multiple initials like "MMR/CWG")

**Optional: Store in metadata JSON** (for flexibility, can add direct fields later if needed):
- `metadata["sales_format"]` - Sales format (Direct, Auction/3rd Party, Funnel)
- `metadata["platform_origin"]` - Platform origin (Domestic, Foreign)
- `metadata["sales_turnaround"]` - Sales turnaround (Days, Weeks, Months, Years)
- `metadata["site_legitimacy"]` - Site legitimacy (Trustworthy, Questionable, Phishing/illegitimate)
- `metadata["last_search_region"]` - Last search region used (State, Local, National)
- `metadata["num_products_found_category"]` - Categorical count: "75+", "50-75", "31-50", "11-30", "0-10"

**Note:** Many categorical fields can be stored in `metadata` JSON field for flexibility. Consider adding direct fields if they need frequent queries or indexing. Fields like `photo_availability` can be derived from listings aggregation.

**CPSC Table Structure Mapping:**

Our design maps to CPSC's `Platform_Core_Assessment` table:
- All assessment data, ranking scores, and calculated risk/review metrics are stored in `marketplaces` table + `marketplace_risk_ratings` table
- Contact information is separated into `marketplace_contacts` table (maps to CPSC `Platform_Contact_Info` table)
- This separation allows one marketplace to have multiple contacts, which is more flexible than CPSC's single contact per platform

#### New Table: `marketplace_risk_ratings`

Track risk rating history for marketplaces (one-to-many relationship, similar to violation_risk_ratings):
- `id` (PK)
- `marketplace_id` (FK to marketplaces)
- `calculated_risk_rating` (Critical, Severe, Moderate, Minor, etc.)
- `probability_score` (Very High, High, Medium, Low, Very Low)
- `impact_score` (Very High, High, Medium, Low, Very Low)
- `notes` (TEXT, free text)
- `monitoring_results` (JSON, structured monitoring data)
- `reassessed_rating` (nullable, can increase/decrease from calculated)
- `reviewed_date` (datetime, when reviewed)
- `reviewed_by` (string, user ID or name)
- `calculation_metadata` (JSON, stores intermediate calculations like rank values for all 8 ranks: Sales_Method, Platform_Origin, Products_Found, Region, Search_Feature, Photo_Availability, Sales_Turnaround, Site_Legitimacy)
- `created_at` (datetime)
- `updated_at` (datetime)

#### New Table: `marketplace_contacts` (Platform_Contact_Info)

Store multiple contacts per marketplace (one marketplace can have many contacts). Maps to CPSC Platform_Contact_Info table:
- `id` (PK)
- `marketplace_id` (FK to marketplaces, corresponds to Platform_ID)
- `contact_name` (varchar(50)) - Primary or Portal contact name/description
- `contact_email` (text) - Email address or link for compliance/takedown requests (can be URL format)
- `firm_address` (text) - Physical address of the platform/firm
- `contact_type` (enum: 'primary', 'technical', 'legal', 'compliance', 'portal', 'other', nullable) - Optional categorization
- `contact_phone` (varchar, nullable) - Optional phone number
- `contact_title` (varchar, nullable) - Optional contact title
- `is_active` (boolean, default true)
- `created_at` (datetime)
- `updated_at` (datetime)

**Note:** CPSC table structure is simpler (Platform_ID, Contact_Name, Contact_Email, Firm_Address). Additional fields (contact_type, phone, title) are optional enhancements for better organization.

#### CPSC Platform_Core_Assessment Table Structure

**Mapping to Our Design:**

CPSC's `Platform_Core_Assessment` table maps to our `marketplaces` table + `marketplace_risk_ratings` table:

| CPSC Column | Our Field/Table | Notes |
|------------|----------------|-------|
| Platform_ID (PK) | `marketplaces.id` | Direct mapping |
| Initial_Review_Date | `marketplaces.initial_review_date` | New field needed |
| Initial_Analyst | `marketplaces.initial_analyst` | New field needed (Varchar(10)) |
| Sales_Format | `marketplaces.metadata["sales_format"]` or direct field | Categorical: Direct, Auction/3rd Party, Funnel |
| Platform_Origin | `marketplaces.metadata["platform_origin"]` or direct field | Categorical: Domestic, Foreign |
| Num_Products_Found | `marketplaces.metadata["num_products_found_category"]` | Categorical: 75+, 50-75, 31-50, 11-30, 0-10 |
| Search_Region | `marketplaces.metadata["last_search_region"]` | Categorical: State, Local, National |
| Search_Feature_Available | Derived from `marketplaces.search_url_template` | Boolean: Yes/No |
| Photo_Availability | Derived from listings aggregation | Categorical: Yes, Mix, No |
| Sales_Turnaround | `marketplaces.metadata["sales_turnaround"]` or direct field | Categorical: Days, Weeks, Months, Years |
| Site_Legitimacy | `marketplaces.metadata["site_legitimacy"]` or direct field | Categorical: Trustworthy, Questionable, Phishing/illegitimate |
| Sales_Method_Rank (L) | Calculated, stored in `marketplace_risk_ratings.calculation_metadata` | Rank 1-5 |
| Platform_Origin_Rank (M) | Calculated, stored in `marketplace_risk_ratings.calculation_metadata` | Rank 1-5 |
| Products_Found_Rank (N) | Calculated, stored in `marketplace_risk_ratings.calculation_metadata` | Rank 1-5 |
| Region_Rank (O) | Calculated, stored in `marketplace_risk_ratings.calculation_metadata` | Rank 1-5 |
| Search_Feature_Rank (P) | Calculated, stored in `marketplace_risk_ratings.calculation_metadata` | Rank 1-5 |
| Photo_Availability_Rank (Q) | Calculated, stored in `marketplace_risk_ratings.calculation_metadata` | Rank 1-5 |
| Sales_Turnaround_Rank (R) | Calculated, stored in `marketplace_risk_ratings.calculation_metadata` | Rank 1-5 |
| Site_Legitimacy_Rank (S) | Calculated, stored in `marketplace_risk_ratings.calculation_metadata` | Rank 1-5 |
| Probability_Score | `marketplace_risk_ratings.probability_score` | Categorical: Very High, High, Medium, Low, Very Low |
| Impact_Score | `marketplace_risk_ratings.impact_score` | Categorical: Very High, High, Medium, Low, Very Low |
| Monitoring_Frequency | `marketplaces.monitoring_frequency` (calculated from Review_Days) | Daily, Weekly, Bi-Weekly, Monthly, Out of Scope |
| Last_Review_Date | `marketplaces.last_review_date` or `last_monitored_at` | Date field |
| Next_Due_Date | `marketplaces.next_monitoring_at` | Calculated: Last_Review_Date + Review_Days |
| Review_Days | `marketplaces.review_days` | Hidden field, drives Monitoring_Frequency |
| Notes | `marketplace_risk_ratings.notes` or separate notes table | Free-form text |
| Caution_EM_Date | `marketplace_contact_events` table | Date when caution email sent |
| Follow_Up_EM | `marketplace_contact_events` table | Can contain multiple dates (Text field) |
| Assigned_Analyst | `marketplaces.assigned_analyst` | Varchar(50), can contain multiple initials |

**CPSC Platform_Contact_Info Table Mapping:**

| CPSC Column | Our Field/Table | Notes |
|------------|----------------|-------|
| Platform_ID (FK) | `marketplace_contacts.marketplace_id` | Foreign key to marketplaces |
| Contact_Name | `marketplace_contacts.contact_name` | Varchar(50) |
| Contact_Email | `marketplace_contacts.contact_email` | Text (can be email or URL) |
| Firm_Address | `marketplace_contacts.firm_address` | Text |

#### New Table: `marketplace_contact_events`

Track contact/notification history (caution emails, follow-ups, etc.):
- `id` (PK)
- `marketplace_id` (FK to marketplaces)
- `contact_id` (FK to marketplace_contacts, nullable)
- `event_type` (enum: 'caution_email', 'followup_email', 'initial_contact', 'cease_desist', 'other')
- `event_date` (date)
- `sent_by` (varchar, analyst initials)
- `notes` (TEXT, optional)
- `created_at` (datetime)
- `updated_at` (datetime)

### 2. Data Models

#### New Model: `ViolationRiskRating` (Pydantic)

```python
class RiskRatingLevel(str, Enum):
    CRITICAL = "Critical"
    SEVERE = "Severe"
    MODERATE = "Moderate"
    MINOR = "Minor"
    # ... extensible

class ProbabilityScore(str, Enum):
    VERY_HIGH = "Very High"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"
    VERY_LOW = "Very Low"

class ImpactScore(str, Enum):
    VERY_HIGH = "Very High"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"
    VERY_LOW = "Very Low"
```

#### Enhanced: `RiskClassificationConfig`

Extend to support CPSC-style ranking system with **fully user-configurable** thresholds and formulas:

- Add `field_selection` - which fields from violation/marketplace to include (user configurable)
- Add `ranking_rules` - **user-editable** rules for calculating ranks (1-5) for different factors:
  - `incidents_rank_rules` - **configurable** thresholds/mappings for incidents/injury/death → rank (1-5)
  - `lot_serial_rank_rules` - **configurable** mapping for identifier presence → rank (default: Yes=1, No=5)
  - `units_rank_rules` - **configurable** threshold ranges for units affected → rank (1-5). Users can modify:
    - Threshold values (e.g., change "1,001 to 25,000" to "1,001 to 30,000")
    - Rank assignments (e.g., swap rank 2 and 3)
    - Add/remove threshold tiers
  - `remedy_rank_rules` - **configurable** mapping for remedy type → rank (1-5). Users can:
    - Modify keyword patterns for each remedy type
    - Change rank assignments (e.g., Repair=1, Replace=2, etc.)
    - Add custom remedy types
  - `lifespan_rank_rules` - **configurable** age range mappings → rank. Users can:
    - Modify age ranges (e.g., change "0-2 years" to "0-3 years")
    - Change rank assignments (e.g., 0-2 years = 1, 3-10 years = 3, etc.)
    - Add additional age tiers

- Add `probability_calculation` - **user-configurable** formula definition:
  - Default: `ROUNDUP(AVERAGE(Lot/Serial Rank, Remedy Rank), 0)`
  - Users can modify:
    - Which ranks to include in calculation
    - Calculation method (average, weighted average, sum, max, min, etc.)
    - Rounding method (round up, round down, round to nearest)
    - Custom formula expressions

- Add `impact_calculation` - **user-configurable** formula definition:
  - Default: `ROUNDUP(AVERAGE(Incidents Rank, Units Rank, Life Span Rank), 0)`
  - Users can modify:
    - Which ranks to include
    - Weights for each rank (e.g., Incidents Rank × 2, Units Rank × 1)
    - Calculation method
    - Custom formula expressions

- Add `score_label_mappings` - **user-configurable** numeric score to label mapping:
  - Default: 5="Very High", 4="High", 3="Medium", 2="Low", 1="Very Low"
  - Users can:
    - Change label names (e.g., "Very High" → "Extreme")
    - Add/remove score levels
    - Modify which numeric scores map to which labels

- Add `risk_rating_matrix` - **fully user-editable** matrix mapping (Probability, Impact) → Risk Rating:
  - Default CPSC matrix (5x5 with 5 probability levels × 5 impact levels)
  - Users can:
    - Modify any cell value (e.g., change "Minor" to "Low" at a specific intersection)
    - Add/remove probability or impact levels (expand/reduce matrix dimensions)
    - Change risk rating labels (e.g., "Critical" → "Severe", add "Extreme")
    - Copy from template and customize

**Key Design Principle:** CPSC baseline template provides sensible defaults, but **ALL values are adjustable** through the UI configuration interface. No hardcoded values.

#### New Model: `OrganizationRiskRules`

- `organization_id`
- `rule_type` (violation/marketplace)
- `config` (RiskClassificationConfig)
- `field_selection` (which fields to use)

### 3. Field Selection System (User Configurable)

Organizations can select which fields to include in risk calculations:

- **Violation fields**: incidents, injuries, deaths, units_affected, remedy_type, lifespan, lot_serial_batch, products, hazards, remedies, metadata, violation_number, violation_date, etc.
- **Marketplace fields**: 
  - Direct fields: violation_listings_count, match_score, monitoring_frequency, last_monitored_at, next_monitoring_at, search_url_template, supports_regions
  - CPSC-specific fields: sales_format, platform_origin, sales_turnaround, site_legitimacy, initial_review_date, initial_analyst, review_days, assigned_analyst
  - Derived fields: search_feature_available (from search_url_template), photo_availability (from listings aggregation), num_products_found_category (from violation_listings_count)
  - Contact fields: marketplace_contacts (separate table)

Field selection stored in `OrganizationRiskRules.field_selection` as JSON:

```json
{
  "violation_fields": ["incidents", "units_affected", "remedy_type", "lifespan", "products.identifiers"],
  "marketplace_fields": [
    "violation_listings_count",
    "sales_format",
    "platform_origin",
    "search_feature_available",
    "photo_availability",
    "sales_turnaround",
    "site_legitimacy"
  ]
}
```

**User Interface:** Organizations can:

- Add/remove fields from selection
- View available fields with descriptions
- See which fields are required for specific rule types
- Validate field selections before saving rules

### 4. CPSC-Style Ranking System & Formulas (All User Configurable)

**IMPORTANT:** The CPSC baseline template provides default values, but **all thresholds, formulas, and mappings are fully adjustable by users** through the configuration UI. Organizations can:

- Modify ranking thresholds and ranges
- Change rank assignments (e.g., swap rank values)
- Adjust calculation formulas
- Edit the risk rating matrix
- Add/remove ranking factors
- Customize field mappings

#### Field Mappings from Violation Entity (Configurable)

**CPSC Field → Violation Field Mappings (with possible alternatives):**

1. **Incidents Rank** (C):

   - Primary: `incidents`, `injuries`, `deaths` fields
   - Logic: Determine if None/Incidents/Injury/Death/Property Damage
   - Possible mapping: `injuries > 0` → Injury, `deaths > 0` → Death, `incidents > 0 AND injuries == 0` → Incidents No Injury
   - Note: Property Damage may need to be inferred from hazard descriptions or metadata

2. **Lot/Serial/Batch Rank/Date/VIN** (D):

   - Primary: `products[].identifiers` (Dict: {"LOT": "...", "SERIAL": "...", "BATCH": "...", "VIN": "...", "DATE": "..."})
   - Alternative: `products[].serial_number`, `products[].model_number`
   - Check: If ANY identifier exists across products → Rank 1, else Rank 5
   - May also check `agency_metadata` for agency-specific identifier fields

3. **Units Rank** (# Units) (E):

   - Direct match: `units_affected` field
   - Exact mapping available

4. **Remedy Rank** (F):

   - Primary: `remedies[].description` (text parsing needed)
   - Alternative: `remedies[].remedy_type` if populated
   - May also check `agency_metadata` for structured remedy data
   - Parsing logic needed to extract: None/Destroy/Refund/Replace/Repair

5. **Life Span Rank** (G):

   - May need calculation from product dates
   - Possible sources: `agency_metadata` (e.g., {"ProductAge": "3-10 years"}), product date fields, or calculated from violation_date
   - May need to parse product description or metadata for age ranges
   - Note: Exact field mapping TBD based on CPSC data structure

#### Field Mappings from Marketplace Entity (Configurable)

**CPSC Platform → Marketplace Field Mappings:**

**Note:** CPSC uses "Platform" which is equivalent to our "Marketplace" entity. Contact information is stored in a separate table (`marketplace_contacts`) since one marketplace may have multiple contacts.

**Direct Field Mappings:**

1. **Platform_ID (PK)** → `marketplace.id` (already exists)

2. **Initial_Review_Date** → `marketplace.initial_review_date` (need to add: Date field)

3. **Initial_Analyst** → `marketplace.initial_analyst` (need to add: Varchar(10), analyst initials like "MMR", "SED")

4. **Sales_Format** → `marketplace.sales_format` (need to add: Varchar(20), categorical: "Direct", "Auction/3rd Party", "Funnel")
   - CPSC categories: "Direct", "Auction/3rd Party", "Funnel"
   - Could also use `marketplace.metadata["sales_format"]` as alternative

5. **Platform_Origin** → `marketplace.platform_origin` (need to add: Varchar(20), categorical: "Domestic", "Foreign")
   - Could derive from `marketplace.metadata["country"]` or add explicit field

6. **Num_Products_Found** → `marketplace.violation_listings_count` (already exists, but needs categorization)
   - Map to categorical: "75+", "50-75", "31-50", "11-30", "0-10"
   - Calculate from actual listings: `COUNT(listings WHERE violation_id IS NOT NULL)`
   - Categorization logic (user configurable):
     - "75+" if count >= 75
     - "50-75" if count >= 50 and count < 75
     - "31-50" if count >= 31 and count < 50
     - "11-30" if count >= 11 and count < 31
     - "0-10" if count < 11

7. **Search_Region** → `marketplace.regions[]` (already exists as List[MarketplaceRegion])
   - Track which region was actually searched in `marketplace.metadata["last_search_region"]` or separate search history
   - Categorical: "State", "National", "Local"

8. **Search_Feature_Available** → Derive from `marketplace.search_url_template` (already exists)
   - Boolean: `True` if `search_url_template` is not null/empty, else `False`

9. **Photo_Availability** → Derive from `marketplace_listings[].image_url` (already exists in MarketplaceListing)
   - Aggregate from listings: "Yes" if all have images, "Mix" if some have images, "No" if none have images
   - Store in `marketplace.metadata["photo_availability"]` or calculate on-the-fly

10. **Sales_Turnaround** → `marketplace.sales_turnaround` (need to add: Varchar(10), categorical: "Days", "Weeks", "Months", "Years")
    - Could also use `marketplace.metadata["sales_turnaround"]`

11. **Site_Legitimacy** → `marketplace.site_legitimacy` (need to add: Varchar(20), categorical: "Trustworthy", "Questionable", "Phishing/illegitimate")
    - Could also use `marketplace.metadata["site_legitimacy"]`

**Rank Fields (Calculated/User Configurable) - Used in Risk Calculation:**

12. **Sales_Method_Rank** → Calculated from `Sales_Format` (Rank 1-5)
    - Mapping configurable: e.g., "Direct" = 1, "Auction" = 3, "3rd Party" = 5

13. **Platform_Origin_Rank** → Calculated from `Platform_Origin` (Rank 1-5)
    - Mapping configurable: e.g., "Domestic" = 1, "Foreign" = 5

14. **Products_Found_Rank** → Calculated from `Num_Products_Found` categorical (Rank 1-5)
    - Default CPSC mapping (user configurable): "75+" = 5, "50-75" = 4, "31-50" = 3, "11-30" = 2, "0-10" = 1

15. **Region_Rank** → Calculated from `Search_Region` (Rank 1-5)
    - Mapping configurable: e.g., "Local" = 1, "State" = 3, "National" = 5

16. **Search_Feature_Rank** → Calculated from `Search_Feature_Available` (Rank 1-5)
    - Mapping configurable: "Yes" = 1, "No" = 5

17. **Photo_Availability_Rank** → Calculated from `Photo_Availability` (Rank 1-5)
    - Mapping configurable: "Yes" = 1, "Mix" = 3, "No" = 5

18. **Sales_Turnaround_Rank** → Calculated from `Sales_Turnaround` (Rank 1-5)
    - Default CPSC mapping (user configurable): "Days" = 5, "Weeks" = 3, "Months" = 2, "Years" = 1

19. **Site_Legitimacy_Rank** → Calculated from `Site_Legitimacy` (Rank 1-5)
    - Default CPSC mapping (user configurable): "Trustworthy" = 5, "Questionable" = 3, "Phishing/illegitimate" = 1

**Calculated Fields:**

20. **Probability_Score** → Calculated from weighted average of Rank columns (user configurable formula)
    - Formula: Similar to violation probability score, but uses marketplace rank fields
    - Default: Weighted average of selected rank fields, mapped to "Very High", "High", "Medium", "Low", "Very Low"

21. **Impact_Score** → Calculated from weighted average of Rank columns (user configurable formula)
    - Formula: Similar to violation impact score, but uses marketplace rank fields
    - Default: Weighted average of selected rank fields, mapped to "Very High", "High", "Medium", "Low", "Very Low"

**Monitoring & Review Fields:**

22. **Monitoring_Frequency** → `marketplace.monitoring_frequency` (already exists, but needs calculation from Review_Days)
    - Formula: `IF Review_Days = 1 THEN 'Daily', IF Review_Days = 7 THEN 'Weekly', IF Review_Days = 45 THEN 'Bi-Weekly', IF Review_Days = 60 THEN 'Monthly', IF Platform is Out of Scope THEN 'Out of Scope'`
    - Could also use `marketplace.monitoring_frequency` enum directly
    - Note: "Out of Scope" is a special status indicating platform is no longer being monitored

23. **Review_Days** → `marketplace.review_days` (need to add: Integer, hidden/derived field)
    - Drives `CALC_Monitoring_Frequency` and `Next_Due_Date` calculations
    - Could be calculated from `monitoring_frequency` enum or stored separately

24. **Last_Review_Date** → `marketplace.last_monitored_at` (already exists)
    - May need to track separately from last search if reviews are different from searches

25. **Next_Due_Date** → `marketplace.next_monitoring_at` (already exists)
    - Formula: `Last_Review_Date + Review_Days`

26. **Assigned_Analyst** → `marketplace.assigned_analyst` (need to add: Varchar(50))
    - Can contain multiple initials (e.g., "MMR/CWG")
    - Could also use `marketplace.metadata["assigned_analyst"]`

**Notification/Contact Fields:**

27. **Caution_EM_Date** → `marketplace.metadata["caution_email_date"]` or separate `marketplace_contact_events` table (need to add)
    - Date when caution email was sent
    - Better stored in separate contact/notification history table

28. **Follow_Up_EM** → `marketplace.metadata["followup_email_dates"]` or separate `marketplace_contact_events` table (need to add)
    - Can contain multiple dates separated by commas (Text field, not just Date)
    - Better stored in separate contact/notification history table with multiple records

29. **Notes** → `marketplace.metadata["notes"]` or separate `marketplace_review_notes` table (need to add)
    - Free-form text log of surveillance and contact history
    - Could use existing `metadata` field or create separate notes/audit log table

**Separate Contact Information Table:**

Since one marketplace may have multiple contacts, create separate table:

**New Table: `marketplace_contacts`**
- `id` (PK)
- `marketplace_id` (FK to marketplaces)
- `contact_type` (enum: "primary", "technical", "legal", "compliance", etc.)
- `contact_name` (Varchar)
- `contact_email` (Varchar)
- `contact_phone` (Varchar)
- `contact_title` (Varchar, optional)
- `is_active` (Boolean)
- `created_at`, `updated_at`

**New Table: `marketplace_contact_events`** (for tracking email notifications)
- `id` (PK)
- `marketplace_id` (FK to marketplaces)
- `contact_id` (FK to marketplace_contacts, nullable)
- `event_type` (enum: "caution_email", "followup_email", "initial_contact", etc.)
- `event_date` (Date)
- `sent_by` (Varchar, analyst initials)
- `notes` (Text, optional)
- `created_at`, `updated_at`

**Simplification Recommendations:**

1. **Use metadata field** for categorical fields that don't need direct queries: `sales_format`, `platform_origin`, `sales_turnaround`, `site_legitimacy`, `assigned_analyst`
2. **Derive fields** where possible: `search_feature_available` from `search_url_template`, `photo_availability` from listings aggregation
3. **Separate audit/history tables** for tracking changes, reviews, and contact events rather than storing dates in main table
4. **Rank calculations** stored in `marketplace_risk_ratings` table (similar to violation risk ratings) for history tracking

#### Ranking Rules (User Configurable) - CPSC Baseline Defaults

**Note:** All values below are defaults from CPSC template. Users can modify all thresholds, ranges, rank assignments, and mappings.

**Probability Factors (Rank from 1=low to 5=high) - User Configurable:**

**Remedy Rank (F) - User Configurable Thresholds:**

Default CPSC values (all adjustable):

- 1 = Repair (remedy description contains "repair", "fix", "service", "modify")
- 2 = Replace (remedy contains "replace", "exchange", "substitute")
- 3 = Refund (remedy contains "refund", "return for refund", "money back")
- 4 = Destroy (remedy description contains "destroy", "dispose", "discard")
- 5 = None (no remedies or empty remedies list)

Users can modify:

- Keyword patterns for each remedy type (regex support)
- Rank assignments (e.g., swap Repair=2, Replace=1)
- Add custom remedy types with custom ranks

**Lot/Serial/Batch/Date/VIN Rank (D) - User Configurable:**

Default CPSC values (all adjustable):

- 1 = Yes (identifiers present: check `products[].identifiers` OR `serial_number` OR `model_number` OR date/VIN in identifiers)
- 5 = No (no identifiers found)

Users can modify:

- Rank assignments (e.g., Yes=2, No=4)
- Add intermediate ranks (e.g., "Partial" identifiers = 3)
- Change which fields are checked for identifiers

**Impact Factors (Rank from 1=not likely to 5=very likely) - User Configurable:**

**Incidents Rank (C) - User Configurable:**

Default CPSC values (all adjustable):

- 1 = None (no incidents, injuries, or deaths)
- 2 = Incidents, No Injury (`incidents > 0 AND injuries == 0 AND deaths == 0`)
- 3 = Property Damage (may need inference from hazards or metadata - check hazard descriptions for property damage indicators)
- 4 = Injury (`injuries > 0 AND deaths == 0`)
- 5 = Death (`deaths > 0`)

Users can modify:

- Rank assignments
- Add custom incident categories (e.g., "Serious Injury" = 4.5, mapped to rank 5)
- Change threshold conditions (e.g., "Injury" if `injuries > 5` instead of `injuries > 0`)
- Modify property damage detection logic/keywords

**Units Rank (# Units) (E) - User Configurable Thresholds:**

Default CPSC values (all adjustable):

- 1 = < 1,000 (`units_affected < 1000`)
- 2 = 1,001 to 25,000 (`units_affected >= 1001 AND units_affected <= 25000`)
- 3 = 25,001 to 50,000 (`units_affected >= 25001 AND units_affected <= 50000`)
- 4 = 50,001 to 500,000 (`units_affected >= 50001 AND units_affected <= 500000`)
- 5 = 500,000 to 1,000,000+ (`units_affected >= 500001`)

Users can modify:

- **Threshold values** (e.g., change "1,001 to 25,000" to "1,001 to 30,000")
- **Rank assignments** (e.g., swap rank 2 and 3, or change rank 5 threshold to 1,000,000+)
- **Add/remove threshold tiers** (e.g., add a rank 6 for "10,000,000+")
- **Null handling** (default to rank 1, or custom logic for unknown/missing values)

**Life Span Rank (G) - User Configurable:**

Default CPSC values (all adjustable):

- 1 = "0 to 2 years" (product age 0-2 years inclusive)
- 3 = "3 to 10 years" (product age 3-10 years inclusive)
- 5 = "10+ years" (product age 10+ years)

Users can modify:

- **Age ranges** (e.g., change "0-2 years" to "0-3 years", or add "11-15 years" = 4)
- **Rank assignments** (e.g., 0-2 years = 2 instead of 1)
- **Calculation method** (how product age is determined - from metadata, dates, etc.)
- **Add/remove age tiers**

#### Calculation Formulas (User Configurable)

**Probability Score (H) - User Configurable Formula:**

Default CPSC formula (all adjustable):

```
ROUNDUP(AVERAGE(Lot/Serial/Batch Rank, Remedy Rank), 0)
```

Users can modify:

- **Included ranks**: Add/remove which ranks are included (e.g., include Units Rank)
- **Calculation method**: Change from average to:
  - Weighted average (e.g., Lot/Serial × 0.6 + Remedy × 0.4)
  - Sum (add ranks together, then normalize)
  - Max (take highest rank)
  - Min (take lowest rank)
  - Custom formula expression
- **Rounding method**: Change from ROUNDUP to:
  - ROUNDDOWN
  - ROUND (to nearest)
  - No rounding (use decimal scores)
- **Score range**: Modify from 1-5 to custom range (e.g., 1-10)

Default label mapping (user configurable):

- 5 → "Very High"
- 4 → "High"
- 3 → "Medium"
- 2 → "Low"
- 1 → "Very Low"

Formula implementation (default):

```python
avg_rank = (lot_serial_rank + remedy_rank) / 2
numeric_score = math.ceil(avg_rank)  # User can change rounding method
probability_score = PROBABILITY_LABELS[numeric_score]  # User can modify labels
```

**Impact Score (I) - User Configurable Formula:**

Default CPSC formula (all adjustable):

```
ROUNDUP(AVERAGE(Incidents Rank, Units Rank, Life Span Rank), 0)
```

Users can modify:

- **Included ranks**: Add/remove ranks (e.g., exclude Life Span Rank)
- **Weights**: Apply weights (e.g., Incidents Rank × 2.0, Units Rank × 1.5, Life Span Rank × 1.0)
- **Calculation method**: Same options as Probability Score
- **Rounding method**: Same options as Probability Score
- **Score range**: Custom range

Default label mapping (user configurable):

- 5 → "Very High"
- 4 → "High"
- 3 → "Medium"
- 2 → "Low"
- 1 → "Very Low"

Formula implementation (default):

```python
avg_rank = (incidents_rank + units_rank + lifespan_rank) / 3
numeric_score = math.ceil(avg_rank)  # User can change rounding method
impact_score = IMPACT_LABELS[numeric_score]  # User can modify labels
```

**Risk Rating (J) - User Configurable Matrix:**

Matrix lookup using Probability Score (row) and Impact Score (column):

Default CPSC matrix (fully user-editable):

```python
risk_rating = RISK_RATING_MATRIX[probability_score][impact_score]
```

Users can modify:

- **Any cell value**: Change any intersection (e.g., "Medium" → "Low" at Very High/Medium)
- **Matrix dimensions**: Add/remove probability or impact levels (e.g., add "Extreme" level)
- **Risk rating labels**: Change "Critical" to "Severe", add "Extreme", remove "Minor"
- **Copy from template**: Start with CPSC defaults, then customize

**Formula Builder UI Features:**

- Visual formula editor with drag-and-drop rank selection
- Preview calculated results with sample data
- Validate formulas before saving
- Test with historical violations to see impact of changes

#### Risk Rating Matrix

The risk rating is determined by looking up the combination of Probability and Impact scores in the following matrix:

| Probability \ Impact | Very Low | Low | Medium | High | Very High |

|---------------------|----------|-----|--------|------|-----------|

| **Very High** | Moderate | Moderate | Severe | Critical | Critical |

| **High** | Minor | Moderate | Severe | Critical | Critical |

| **Medium** | Minor | Moderate | Severe | Severe | Critical |

| **Low** | Minor | Minor | Moderate | Severe | Critical |

| **Very Low** | Minor | Minor | Minor | Moderate | Severe |

**Risk Rating Levels (Final Output):**

- **Critical**: Highest risk, immediate action required
- **Severe**: High risk, urgent attention needed
- **Moderate**: Medium risk, standard monitoring
- **Minor**: Low risk, routine handling

**Note on Terminology:**

- CPSC uses "ban/recall/violation" terminology
- The `violation_date` field represents when the ban/recall/violation was issued
- For CPSC organizations, `violation_number` and `violation_date` are mandatory fields

### 4b. Marketplace CPSC-Style Ranking System & Formulas (All User Configurable)

**IMPORTANT:** Similar to violations, marketplace risk classification uses CPSC-style ranking system with 8 ranking factors. All thresholds, formulas, and mappings are fully adjustable by users. CPSC "Platform" is equivalent to our "Marketplace" entity.

#### Marketplace Ranking Rules (User Configurable) - CPSC Baseline Defaults

**Note:** All values below are defaults from CPSC template. Users can modify all thresholds, ranges, rank assignments, and mappings.

**All 8 Marketplace Ranks (User Configurable) - CPSC Baseline Defaults:**

1. **Sales_Method_Rank (L)** - Based on Sales_Format:
   - Default CPSC mappings (all adjustable):
     - "Direct" = 5
     - "Auction/3rd Party" = 3 (or separate: "Auction" = 3, "3rd Party" = 3)
     - "Funnel" = 1
     - Unknown/Unspecified = 1 (default to lowest risk)
   - Users can modify categories and rank assignments

2. **Platform_Origin_Rank (M)** - Based on Platform_Origin:
   - Default CPSC mappings (all adjustable):
     - "Domestic" = 5
     - "Foreign" = 1
   - Users can modify rank assignments

3. **Products_Found_Rank (N)** - Based on Num_Products_Found categorical:
   - Default CPSC mappings (all adjustable):
     - "75+" = 5
     - "50-75" = 4
     - "31-50" = 3
     - "11-30" = 2
     - "0-10" = 1
   - Users can modify threshold ranges and rank assignments

4. **Region_Rank (O)** - Based on Search_Region:
   - Default CPSC mappings (all adjustable):
     - "National" = 5
     - "State" = 3
     - "Local" = 1
   - Users can modify categories and rank assignments

5. **Search_Feature_Rank (P)** - Based on Search_Feature_Available:
   - Default CPSC mappings (all adjustable):
     - "Yes" = 1 (lower rank = lower risk, search feature helps monitoring)
     - "No" = 5 (higher rank = higher risk, harder to monitor)
   - Users can modify rank assignments

6. **Photo_Availability_Rank (Q)** - Based on Photo_Availability:
   - Default CPSC mappings (all adjustable):
     - "Yes" = 1 (photos help identification)
     - "Mix" = 3
     - "No" = 5 (no photos = harder to verify)
   - Users can modify rank assignments and thresholds

7. **Sales_Turnaround_Rank (R)** - Based on Sales_Turnaround:
   - Default CPSC mappings (all adjustable):
     - "Days" = 5 (fast turnaround = higher risk, products sell quickly)
     - "Weeks" = 3
     - "Months" = 2
     - "Years" = 1 (slow turnaround = lower risk)
   - Users can modify categories and rank assignments

8. **Site_Legitimacy_Rank (S)** - Based on Site_Legitimacy:
   - Default CPSC mappings (all adjustable):
     - "Trustworthy" = 5 (trustworthy sites are more likely to comply)
     - "Questionable" = 3
     - "Phishing/illegitimate" = 1 (illegitimate sites are highest risk)
   - Users can add intermediate categories

#### Marketplace Calculation Formulas (User Configurable)

**Probability Score (Marketplace) - User Configurable Formula:**

Default CPSC formula (all adjustable):
```
Calculated using AVERAGE(Rank Scores) (Columns L-S) and a nested IF or INDEX/MATCH lookup table
```
OR simplified:
```
ROUNDUP(AVERAGE(All 8 Rank columns), 0)
```
OR users can select which ranks contribute to Probability vs Impact:
```
ROUNDUP(WEIGHTED_AVERAGE(Selected Probability Ranks), 0)
```

**Note:** CPSC uses nested IF or INDEX/MATCH lookup table to map numeric average to categorical score. This allows for non-linear mappings if needed.

Users can modify:
- **Included ranks**: Select which of the 8 ranks to include (not all may be needed)
- **Weights**: Apply different weights to each rank (e.g., Products_Found_Rank × 2.0, Site_Legitimacy_Rank × 1.5)
- **Calculation method**: Average, weighted average, sum, max, min, custom
- **Rounding method**: Round up, round down, round to nearest
- **Score range**: Custom range instead of 1-5

Default label mapping (user configurable):
- 5 → "Very High"
- 4 → "High"
- 3 → "Medium"
- 2 → "Low"
- 1 → "Very Low"

**Impact Score (Marketplace) - User Configurable Formula:**

Default CPSC formula (all adjustable):
```
Calculated using AVERAGE(Rank Scores) and a nested IF or INDEX/MATCH lookup table
```
OR simplified:
```
ROUNDUP(WEIGHTED_AVERAGE(Selected Impact Ranks), 0)
```

**Note:** CPSC uses nested IF or INDEX/MATCH lookup table to map numeric average to categorical score. This allows for non-linear mappings if needed.

Users can configure which ranks contribute to Impact vs Probability:
- **Default assumption**: All ranks contribute to Probability Score only
- **Alternative**: Split ranks into Probability factors (e.g., Sales_Method, Search_Feature, Photo_Availability) and Impact factors (e.g., Products_Found, Site_Legitimacy, Platform_Origin)
- Users can customize which ranks map to Probability vs Impact

Default label mapping (user configurable):
- 5 → "Very High"
- 4 → "High"
- 3 → "Medium"
- 2 → "Low"
- 1 → "Very Low"

**Marketplace Risk Rating (Matrix Lookup):**

Uses same risk rating matrix as violations (user configurable):
```python
marketplace_risk_rating = RISK_RATING_MATRIX[probability_score][impact_score]
```

Same matrix editor and customization options as violation risk ratings.

#### Marketplace Monitoring Frequency Calculation (User Configurable)

**Monitoring_Frequency - User Configurable Formula:**

Default CPSC formula (all adjustable):
```
IF Review_Days = 1 THEN 'Daily'
IF Review_Days = 7 THEN 'Weekly'
IF Review_Days = 45 THEN 'Bi-Weekly'
IF Review_Days = 60 THEN 'Monthly'
IF Platform is Out of Scope THEN 'Out of Scope'
```

Users can modify:
- **Review day thresholds**: Change "7" to "5" for weekly, "45" to "30" for bi-weekly, etc.
- **Frequency labels**: Add "Quarterly", "Custom", etc.
- **Calculation logic**: Custom rules based on risk rating, products found, etc.
- **Out of Scope handling**: Define conditions for "Out of Scope" status

**Next_Due_Date Calculation:**
```
Next_Due_Date = Last_Review_Date + Review_Days
```

Users can modify:
- **Calculation method**: Could add business days logic, exclude holidays, etc.

#### Reassessed Risk Rating (K)

**Manual/Dependent on Monitoring:**

After initial calculation (Risk Rating J), reviewers can manually adjust the rating based on monitoring results or additional context:

- **Initial Rating**: Calculated from Risk Rating (J) matrix lookup
- **Reassessment Options**:
  - **Increase**: Move rating up one level (e.g., Moderate → Severe, Severe → Critical)
  - **Decrease**: Move rating down one level (e.g., Critical → Severe, Severe → Moderate)
- **Tracking Fields**:
  - `reassessed_rating`: Final rating after manual adjustment (overrides calculated rating if set)
  - `reviewed_date`: When the reassessment occurred
  - `reviewed_by`: User ID or name of reviewer
  - `notes`: Free text explanation for the reassessment
  - `monitoring_results`: Structured JSON data from ongoing monitoring that influenced the decision

**Reassessment Logic:**

- If `reassessed_rating` is set, it overrides the calculated `risk_rating` for display/business purposes
- Original calculated rating is preserved in `calculated_risk_rating` field
- Full history is maintained in `violation_risk_ratings` table for audit trail
- Each reassessment creates a new record, maintaining complete history of changes

### 5. Risk Rating History & Reassessment

- When a violation is classified, create a new `ViolationRiskRating` record
- When reviewed, create a new record with `reassessed_rating` (can increase/decrease)
- `reviewed_date` tracks when manual review occurred
- `notes` field for reviewer comments
- `monitoring_results` stores structured data from ongoing monitoring

### 6. API Endpoints

#### Organization Risk Rules

- `GET /api/organizations/{id}/risk-rules` - Get all rules for org
- `POST /api/organizations/{id}/risk-rules` - Create new rule set
- `PUT /api/organizations/{id}/risk-rules/{rule_id}` - Update rule set
- `POST /api/organizations/{id}/risk-rules/from-template` - Create from baseline template
- `PATCH /api/organizations/{id}/risk-rules/{rule_id}/sharing` - Update sharing settings (is_public, is_shareable, shared_with_orgs)

#### Shared Risk Rules (Cross-Organization)

- `GET /api/risk-rules/public` - Browse all public/shared risk rules from other organizations
- `GET /api/risk-rules/shared` - Get risk rules shared with current organization
- `GET /api/risk-rules/{rule_id}` - Get details of a specific shared rule (if accessible)
- `POST /api/organizations/{id}/risk-rules/from-shared/{rule_id}` - Copy a shared rule set to current organization
- `GET /api/organizations/{source_org_id}/risk-rules` - Get risk rules from a specific organization (if shared/public)
- `POST /api/violations/import-with-rules` - Import violations and automatically use source organization's risk rules

#### Violation Risk Ratings

- `GET /api/violations/{id}/risk-ratings` - Get rating history
- `POST /api/violations/{id}/risk-ratings` - Create new rating (auto-calculate)
- `POST /api/violations/{id}/risk-ratings/reassess` - Manual reassessment
- `GET /api/violations/{id}/risk-ratings/current` - Get current rating

### 7. Implementation Files

**Backend:**

- `backend/app/models/risk_rating.py` - New models for risk ratings
- `backend/app/models/organization_risk_rules.py` - Organization risk rules models
- `backend/app/db/models.py` - Add new tables (ViolationRiskRatingDB, OrganizationRiskRulesDB)
- `backend/app/services/risk_classifier.py` - Extend to support organization-specific rules
- `backend/app/services/organization_risk_service.py` - New service for org risk rules
- `backend/app/services/risk_rules_sharing.py` - Service for managing rule sharing, discovery, and copying
- `backend/app/routers/organization_risk_rules.py` - New router for risk rules API
- `backend/app/routers/shared_risk_rules.py` - New router for shared/public risk rules API
- `backend/app/routers/violations.py` - Add risk rating endpoints and import-with-rules logic

**Frontend:**

- `src/components/RiskClassificationConfig.jsx` - Comprehensive UI for configuring risk rules with:
  - Threshold editor (units, age ranges, etc.) - **all user-editable**
  - Ranking rule editor (modify rank assignments, keyword patterns) - **all user-editable**
  - Formula builder (visual editor for probability/impact calculations) - **all user-editable**
  - Matrix editor (grid UI for editing risk rating matrix) - **all user-editable**
  - Field selection interface
  - Preview/test with sample data
  - Validation and error handling
  - Sharing settings (public/private, share with specific orgs)
- `src/components/RiskRatingHistory.jsx` - Display rating history with reassessment
- `src/components/RiskRuleEditor.jsx` - Detailed rule editing component (thresholds, formulas, all configurable)
- `src/components/RiskMatrixEditor.jsx` - Interactive matrix editing grid (fully editable)
- `src/components/RiskRulesMarketplace.jsx` - Browse and discover shared risk rules from other organizations
- `src/components/RiskRuleCard.jsx` - Display card for a shared risk rule (preview, stats, copy button)
- `src/components/ImportWithRulesDialog.jsx` - Dialog when importing violations, offering to use source organization's rules
- `src/pages/SettingsPage.jsx` - Add risk classification section
- `src/services/api.js` - Add API functions for risk rules and shared rules

### 8. Baseline Templates (Starting Points - Fully Customizable)

Store baseline templates (CPSC, FDA, etc.) in database or config files:

- `backend/app/templates/risk_rules/cpsc_violation.json` - CPSC violation risk classification template (starting point only)
- `backend/app/templates/risk_rules/cpsc_marketplace.json` - CPSC marketplace risk classification (TBD)
- Organizations can copy these templates and **customize ALL values** - templates are starting points, not constraints

**Template Philosophy:**

- Templates provide sensible defaults based on regulatory agency standards
- **ALL values in templates are editable** - no hardcoded logic
- Organizations can modify thresholds, formulas, matrix, rankings to match their needs
- Changes to templates don't affect existing organization rule sets (templates are copied, not referenced)

#### CPSC Violation Template Structure

The CPSC template will include all the ranking rules, formulas, and matrix mappings as specified in the formulas above **as default values**. The template JSON structure will store **editable configuration**:

- Field selection for violation fields
- Ranking rule definitions (Incidents, Lot/Serial, Units, Remedy, Lifespan)
- Probability and Impact calculation formulas
- Score label mappings (1-5 to "Very Low" through "Very High")
- Complete risk rating matrix

See implementation details in the `cpsc-template` task for the full JSON structure.

### 9. Risk Rule Sharing & Collaboration

Organizations can share their risk classification rules with other organizations, enabling collaboration and knowledge sharing.

#### Sharing Models

1. **Public Sharing**: Rule set is visible to all organizations
   - `is_public = true` - Anyone can view and copy the rule
   - Useful for agencies wanting to share best practices
   - Can be featured in a "Risk Rules Marketplace"

2. **Private Sharing**: Rule set is only visible to specific organizations
   - `is_public = false`, `shared_with_orgs = [org_id1, org_id2, ...]`
   - Only listed organizations can view and copy
   - Useful for bilateral agreements or regional collaborations

3. **Private (Default)**: Rule set is only visible to the owning organization
   - `is_public = false`, `shared_with_orgs = []`
   - Default state for all new rules

#### Use Cases

1. **Import with Source Rules**: When importing violations from another organization, automatically use that organization's risk classification rules
   - If source organization has shared their rules, apply them during import
   - Option to keep using source rules or switch to own rules after import
   - Track which rule set was used for each violation

2. **Rule Marketplace/Library**: Browse and discover risk classification rules from other organizations
   - Search by organization, rule type (violation/marketplace), industry, etc.
   - View rule descriptions, usage statistics, ratings
   - Preview rule configurations before copying
   - See which organizations are using which rules

3. **Collaboration**: Organizations working together can share and standardize risk assessments
   - Regional agencies can share rules
   - Industry groups can develop common standards
   - Parent/child organizations can share rules

#### Implementation Details

**Sharing Permissions:**
- Organizations control which rules they share
- Can set rules as public, private, or shared with specific orgs
- Can revoke sharing at any time
- When a rule is copied, it becomes independent (changes to original don't affect copies)

**Automatic Rule Application During Import:**

When importing violations from another organization, the system will:

1. **Detect Source Organization**: Identify the organization that issued the violations (from `violation.organization_id` or `violation.organization_name`)

2. **Check for Shared Rules**: Query for risk rules from source organization that are:
   - Public (`is_public = true`), OR
   - Shared with importing organization (`importing_org_id IN shared_with_orgs`), OR
   - Owned by source organization and enabled

3. **Prompt User** (if shared rules found):
   - Display dialog: "Source organization (CPSC) has shared risk classification rules for violations. Would you like to use them for this import?"
   - Show rule details:
     - Rule name and description
     - Organization name
     - Rule type (violation)
     - Usage count (how many orgs use it)
   - Options:
     - **"Use for this import only"**: Apply source rules to imported violations, but don't copy to organization
     - **"Copy to my organization"**: Copy source rules to importing organization permanently, then use them
     - **"Use my own rules"**: Use importing organization's default rules instead
     - **"Don't ask again for this organization"**: Remember preference for future imports from this source

4. **Apply Rules**: 
   - If user chooses source rules, calculate risk ratings using source organization's rules
   - Store rule reference in `violation_risk_ratings.risk_calculation_version` (e.g., "shared:org_id:rule_id" or "copied:org_id:rule_id")
   - If user chooses own rules, use importing organization's default/enabled rules

5. **Track Usage**:
   - Increment `usage_count` on shared rule when used
   - Log rule usage in audit trail
   - Track which violations used which rule sets

**Import API Enhancement:**
- `POST /api/violations/import` - Enhanced to accept optional `use_source_rules` parameter
- `POST /api/violations/import-with-rules` - New endpoint that automatically detects and applies source rules
- Both endpoints return information about available shared rules and which rules were applied

**Rule Discovery:**
- Browse public/shared rules with filters:
  - Organization type (regulatory agency, company)
  - Rule type (violation, marketplace)
  - Industry/sector
  - Usage count (most popular)
  - Recently added
- View rule details:
  - Organization name
  - Rule description
  - Field selections
  - Key thresholds/formulas (summary)
  - Usage statistics
  - Reviews/ratings (if implemented)

**Copying Rules:**
- When copying a shared rule:
  - Creates new rule in target organization
  - Sets `created_by_org_id` to source organization
  - Increments `usage_count` on original rule
  - Copied rule is independent (can be modified without affecting original)
  - Original rule owner is credited in rule metadata

### 10. Migration Strategy

1. Create new tables
2. Migrate existing risk classifications to new structure
3. Set default CPSC template for existing organizations
4. Update risk classifier to use organization-specific rules
5. Enable rule sharing features (default: all rules private)

## Key Design Decisions

1. **Fully User Configurable**: ALL thresholds, formulas, matrix values, and rankings are adjustable by users - CPSC template is only a starting point with sensible defaults
2. **Separate rule sets**: Violations and marketplaces have different fields, so separate rule sets make sense
3. **Rating history**: One-to-many relationship allows tracking changes over time
4. **Field selection**: Organizations pick which fields matter to them
5. **Baseline templates**: Start with CPSC template, but all values can be customized - no hardcoded logic
6. **Reassessment**: Manual override capability with audit trail
7. **Configuration UI**: Must provide intuitive interfaces for editing complex formulas, thresholds, and matrices
8. **Validation**: All user inputs must be validated (e.g., threshold ranges don't overlap, formulas are valid)
9. **Rule Sharing & Collaboration**: Organizations can share risk classification rules with each other, enabling cross-organization learning and automatic application of source organization's risk rules when importing violations

## Implementation Notes

### Field Mapping Challenges

Some CPSC fields may not map directly to violation entity fields:

1. **Property Damage** (Incidents Rank = 3): May need to infer from hazard descriptions (`hazards[].description`) or add to metadata. Look for keywords like "damage", "fire", "flood", "malfunction" without injury/death.
2. **Lot/Serial/Batch/Date/VIN**: Check `products[].identifiers` Dict (keys: "LOT", "SERIAL", "BATCH", "DATE", "VIN"), `products[].serial_number`, `products[].model_number`. If ANY identifier exists across all products → Rank 1, else Rank 5.
3. **Remedy Type**: Text parsing from `remedies[].description` required; use keyword matching (case-insensitive). Priority order: Check for "destroy" first (rank 4), then "refund" (rank 3), then "replace" (rank 2), then "repair" (rank 1). If no remedies → rank 5.
4. **Life Span**: May need to calculate from product dates or parse from `agency_metadata` (e.g., `{"ProductAge": "3-10 years"}` or `{"ProductLifespan": 5}`). If not available, may need to calculate from `violation_date` vs product manufacture date if available.

### Required Fields Validation for CPSC

When an organization uses CPSC template, validate:

- `violation_number` is required and non-empty
- `violation_date` is required (represents ban/recall/violation date)
- These fields must be present before risk calculation can proceed

### Formula Implementation Details

- Use Python's `math.ceil()` for ROUNDUP equivalent (but allow users to change rounding method)
- Implement label lookup tables as dictionaries for O(1) lookups (user-configurable)
- Store intermediate rank calculations in `calculation_metadata` JSON field for debugging/audit
- Validate all numeric scores are within configured range before label mapping
- Support custom formula expressions (e.g., weighted averages, custom calculations)

### UI Configuration Requirements

The configuration UI must support editing:

1. **Threshold Editors:**

   - Units thresholds: Add/edit/delete threshold ranges with min/max values and rank assignments
   - Age ranges: Add/edit/delete lifespan ranges with rank assignments
   - Visual sliders or input fields for threshold values
   - Validation: Ensure no overlapping ranges, sequential ordering

2. **Ranking Rule Editors:**

   - Remedy ranks: Edit keyword patterns (regex support), rank assignments
   - Incident ranks: Edit condition logic (e.g., injury thresholds), rank assignments
   - Lot/Serial ranks: Edit field checks, rank assignments
   - Visual table/grid interface for easy editing

3. **Formula Builder:**

   - Visual drag-and-drop interface or code editor
   - Select which ranks to include
   - Choose calculation method (average, weighted average, sum, max, min, custom)
   - Set weights for weighted calculations
   - Choose rounding method (round up, round down, round to nearest)
   - Preview formula output with sample data
   - Syntax validation before saving

4. **Matrix Editor:**

   - Interactive grid (Probability × Impact)
   - Click cells to edit risk rating values
   - Add/remove rows (probability levels) or columns (impact levels)
   - Change risk rating labels
   - Visual color coding for different risk levels
   - Import/export matrix as CSV

5. **Field Selection:**

   - Checkbox list of available violation/marketplace fields
   - Field descriptions and data types
   - Required vs optional field indicators
   - Preview of field data from sample violations

6. **Validation & Testing:**

   - Validate all inputs before saving
   - Test configuration with sample violations to preview results
   - Show before/after comparison when changing rules
   - Warn about potentially problematic configurations (e.g., all cells map to same rating)

## Next Steps

1. ✅ CPSC formulas and field mappings provided - proceed with implementation
2. Implement database schema changes
3. Create baseline CPSC template with exact formulas
4. Build organization risk rules management
5. Update risk classifier to use organization-specific rules