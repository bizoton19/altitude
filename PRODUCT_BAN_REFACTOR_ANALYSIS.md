# Product Ban → ProductBan Refactoring Analysis

## Executive Summary

**Level of Effort:** 🔴 **HIGH** (Estimated 40-60 hours)
**Risk Level:** 🟡 **MEDIUM-HIGH** (Requires careful migration strategy)
**Recommendation:** ✅ **DOABLE** but requires phased approach and database migration

---

## Scope Analysis

### Code Statistics
- **Backend:** ~1,209 matches across 27 files
- **Frontend:** ~456 matches across 25 files
- **Total:** ~1,665 occurrences to review/update

### Areas Affected

#### 1. Database Layer (HIGHEST RISK)
**Files:**
- `backend/app/db/models.py` - SQLAlchemy models
- `backend/app/db/converters.py` - Model converters
- Database schema (table names, column names, foreign keys)

**Changes Required:**
- Table name: `product_bans` → `product_bans`
- Related tables:
  - `product_ban_products` → `product_ban_products`
  - `legacy_hazards` → `product_ban_hazards`
  - `legacy_remedies` → `product_ban_remedies`
  - `legacy_images` → `product_ban_images`
- Column names:
  - `product_ban_id` → `product_ban_id`
  - `ban_number` → `ban_number` (or `product_ban_number`)
  - `ban_date` → `ban_date` (or `product_ban_date`)
  - `ban_type` → `ban_type` (or `product_ban_type`)
- Foreign keys: All `product_ban_id` references
- Indexes: All indexes on product ban-related columns

**Risk:** 🔴 **CRITICAL** - Requires database migration script

#### 2. Backend Models (HIGH RISK)
**Files:**
- `backend/app/models/product_ban.py` - Pydantic models
- `backend/app/models/__init__.py` - Exports
- `backend/app/models/import_models.py` - Import models

**Changes Required:**
- Class names:
  - `ProductBan` → `ProductBan`
  - `LegacyType` → `BanType` (or `ProductBanType`)
  - `ProductBanProduct` → `ProductBanProduct`
  - `ProductBanHazard` → `ProductBanHazard`
  - `ProductBanRemedy` → `ProductBanRemedy`
  - `ProductBanImage` → `ProductBanImage`
  - `ProductBanCreate` → `ProductBanCreate`
  - `ProductBanSummary` → `ProductBanSummary`
- Field names: All `legacy_*` fields
- Enum values: `LegacyType.LEGACY` → `BanType.BAN` (keep others like RECALL, WARNING)

**Risk:** 🟡 **MEDIUM** - Breaking changes to API contracts

#### 3. API Routers (MEDIUM RISK)
**Files:**
- `backend/app/routers/product-bans.py` → `product_bans.py`
- `backend/app/routers/imports.py` - Import endpoints
- `backend/app/routers/investigations.py` - Investigation endpoints
- `backend/app/routers/search.py` - Search endpoints
- `backend/app/routers/reviews.py` - Review endpoints
- `backend/app/routers/agent.py` - Agent endpoints

**Changes Required:**
- Endpoint paths: `/api/product-bans/*` → `/api/product-bans/*`
- Function names: All `*_legacy*` functions
- Variable names: All `product_ban*` variables
- Response models: All product ban models

**Risk:** 🟡 **MEDIUM** - API versioning or breaking changes

#### 4. Services Layer (MEDIUM RISK)
**Files:**
- `backend/app/services/database.py` - Database operations
- `backend/app/services/database_sqlite.py` - SQLite operations
- `backend/app/services/workflow_service.py` - Workflow operations
- `backend/app/services/investigation_scheduler.py` - Scheduler
- `backend/app/services/marketplace_risk_calculator.py` - Risk calculator
- `backend/app/skills/risk_classifier.py` - Risk classification

**Changes Required:**
- Function names: `get_product_ban`, `add_product_ban`, `search_product_bans`, etc.
- Variable names: All `product_ban*` variables
- Type hints: All `ProductBan` → `ProductBan`

**Risk:** 🟡 **MEDIUM** - Internal refactoring, less external impact

#### 5. Frontend Components (MEDIUM RISK)
**Files:**
- `src/components/ProductBanImport.jsx` → `ProductBanImport.jsx`
- `src/components/ProductBanForm.jsx` → `ProductBanForm.jsx`
- `src/pages/ProductBansPage.jsx` → `ProductBansPage.jsx`
- `src/pages/ProductBanDetailPage.jsx` → `ProductBanDetailPage.jsx`
- `src/pages/ProductBanFormPage.jsx` → `ProductBanFormPage.jsx`
- Plus 20+ other component files

**Changes Required:**
- Component names
- Props and state variables
- API calls: `/api/product-bans` → `/api/product-bans`
- Display text: "Product Bans" → "Product Bans"
- Variable names throughout

**Risk:** 🟡 **MEDIUM** - UI/UX changes, user-facing

#### 6. Frontend Services (LOW-MEDIUM RISK)
**Files:**
- `src/services/api.js` - API client functions
- `src/router.jsx` - Route definitions

**Changes Required:**
- API function names: `getProductBans`, `createProductBan`, etc.
- Route paths: `/product-bans` → `/product-bans`
- Route names and components

**Risk:** 🟢 **LOW-MEDIUM** - Mostly internal

---

## Risk Assessment

### High-Risk Areas

1. **Database Migration** 🔴
   - **Risk:** Data loss, downtime, rollback complexity
   - **Mitigation:** 
     - Create comprehensive migration script
     - Test on staging database first
     - Backup before migration
     - Support rollback procedure

2. **API Breaking Changes** 🟡
   - **Risk:** External integrations break
   - **Mitigation:**
     - Option A: Version API (`/api/v1/product-bans` → `/api/v2/product-bans`)
     - Option B: Support both endpoints temporarily
     - Option C: Breaking change with migration period

3. **Frontend Route Changes** 🟡
   - **Risk:** Bookmarked URLs break
   - **Mitigation:**
     - Add redirects from old routes to new routes
     - Update all internal links

### Medium-Risk Areas

1. **Model Changes** - Breaking changes to Pydantic models
2. **Service Layer** - Internal refactoring, less external impact
3. **Component Refactoring** - UI changes, user confusion possible

### Low-Risk Areas

1. **Display Text** - Easy find/replace
2. **Comments/Documentation** - Non-functional changes
3. **Test Files** - Update test data and assertions

---

## Migration Strategy

### Phase 1: Preparation (4-6 hours)
1. ✅ Create comprehensive inventory of all changes needed
2. ✅ Create database migration script
3. ✅ Set up feature branch
4. ✅ Create test database with sample data
5. ✅ Document rollback procedure

### Phase 2: Database Migration (8-12 hours)
1. Create migration script:
   ```sql
   -- Rename tables
   ALTER TABLE product bans RENAME TO product_bans;
   ALTER TABLE product_ban_products RENAME TO product_ban_products;
   -- ... etc
   
   -- Rename columns
   ALTER TABLE product_bans RENAME COLUMN product_ban_id TO product_ban_id;
   ALTER TABLE product_bans RENAME COLUMN ban_number TO ban_number;
   -- ... etc
   
   -- Update foreign keys
   ALTER TABLE product_ban_products 
     RENAME COLUMN product_ban_id TO product_ban_id;
   -- ... etc
   
   -- Recreate indexes
   CREATE INDEX idx_product_ban_id ON product_bans(product_ban_id);
   -- ... etc
   ```
2. Test migration on staging
3. Update SQLAlchemy models
4. Update converters

### Phase 3: Backend Models & Services (12-16 hours)
1. Rename model classes and files
2. Update all type hints
3. Update service functions
4. Update API routers
5. Update imports throughout

### Phase 4: Frontend Refactoring (12-16 hours)
1. Rename components and files
2. Update API calls
3. Update routes
4. Update display text
5. Update variable names
6. Add route redirects

### Phase 5: Testing & Validation (8-12 hours)
1. Unit tests
2. Integration tests
3. Manual testing
4. API testing
5. Frontend testing
6. Database integrity checks

### Phase 6: Deployment (2-4 hours)
1. Deploy to staging
2. Final validation
3. Deploy to production
4. Monitor for issues

---

## Recommended Approach

### Option A: Phased Migration (RECOMMENDED)
**Timeline:** 2-3 weeks
**Risk:** 🟡 Medium
**Approach:**
1. Week 1: Database + Backend models
2. Week 2: Backend services + API
3. Week 3: Frontend + Testing

**Pros:**
- Lower risk per phase
- Can test incrementally
- Easier rollback per phase

**Cons:**
- Longer timeline
- Temporary inconsistencies

### Option B: Big Bang Migration
**Timeline:** 1 week
**Risk:** 🔴 High
**Approach:**
- Do everything at once
- Single deployment

**Pros:**
- Faster completion
- No temporary inconsistencies

**Cons:**
- Higher risk
- Harder to debug
- All-or-nothing rollback

### Option C: API Versioning
**Timeline:** 3-4 weeks
**Risk:** 🟢 Low
**Approach:**
- Keep old API endpoints
- Add new endpoints
- Migrate clients gradually
- Deprecate old endpoints

**Pros:**
- Zero downtime
- Backward compatible
- Gradual migration

**Cons:**
- Longer timeline
- More code to maintain temporarily

---

## Estimated Effort Breakdown

| Area | Files | Hours | Risk |
|------|-------|-------|------|
| Database Migration | 2 | 8-12 | 🔴 High |
| Backend Models | 3 | 4-6 | 🟡 Medium |
| Backend Services | 6 | 8-12 | 🟡 Medium |
| API Routers | 6 | 6-10 | 🟡 Medium |
| Frontend Components | 25 | 12-16 | 🟡 Medium |
| Frontend Services | 2 | 2-4 | 🟢 Low |
| Testing | All | 8-12 | 🟡 Medium |
| Documentation | All | 2-4 | 🟢 Low |
| **TOTAL** | **52** | **50-76** | **🟡 Medium-High** |

---

## Critical Considerations

### 1. Database Migration
- **Must have:** Rollback script
- **Must test:** On production-like data
- **Must backup:** Before migration
- **Consider:** Zero-downtime migration strategy

### 2. API Compatibility
- **Decision needed:** Breaking change or versioning?
- **If breaking:** Migration period for clients
- **If versioning:** Support both temporarily

### 3. Frontend Routes
- **Must add:** Redirects from old routes
- **Must update:** All internal links
- **Consider:** URL parameters compatibility

### 4. Display Text
- **Simple:** Find/replace "Product Bans" → "Product Bans"
- **Careful:** Context matters (e.g., "product ban of policy" vs "product product ban")
- **Review:** All user-facing text

### 5. Enum Values
- **Keep:** RECALL, WARNING, ADVISORY, ALERT, NOTICE
- **Change:** LEGACY → BAN
- **Consider:** Backward compatibility in API

---

## Recommendations

1. **✅ Proceed with refactoring** - The terminology change is valuable for clarity
2. **Use Option A (Phased Migration)** - Lower risk, manageable timeline
3. **Create comprehensive test suite** - Before starting migration
4. **Document everything** - Migration steps, rollback procedures
5. **Consider API versioning** - If external clients exist
6. **Plan for 2-3 weeks** - Realistic timeline with buffer

---

## Next Steps (If Proceeding)

1. Create feature branch: `refactor/product ban-to-productban`
2. Set up test database with production-like data
3. Create database migration script
4. Start with Phase 1 (Preparation)
5. Review and approve migration strategy
6. Begin Phase 2 (Database Migration)

---

*Analysis Date: January 2025*
*Estimated by: Code analysis and scope review*
