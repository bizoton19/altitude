"""
Database service for recall and marketplace data.
Using in-memory storage for simplicity (can upgrade to SQLite/PostgreSQL).
"""

from typing import Dict, List, Optional
from datetime import datetime
import json
import os
from pathlib import Path

from app.models.recall import Recall, RecallImage, RecallProduct, RecallHazard, RecallRemedy, RiskLevel
from app.models.violation import ProductViolation, ViolationImage, ViolationProduct, ViolationHazard, ViolationRemedy, ViolationCreate
from app.models.marketplace import Marketplace, MarketplaceListing, DEFAULT_MARKETPLACES
from app.models.agent import AgentConfig, SearchTask, ToolConfig, ToolType, LLMProvider, AgentSkill, SkillType
from app.models.investigation import Investigation
from app.models.investigation_listing import InvestigationListing
from app.models.import_models import ImportHistory, ImportSource
from app.models.risk_classification import get_default_risk_classification_config, RiskClassificationConfig
from app.skills.risk_classifier import classify_recall, classify_violation, classify_risk


# In-memory storage
_violations: Dict[str, ProductViolation] = {}
_recalls: Dict[str, Recall] = {}
_agencies: Dict[str, any] = {}  # Agency storage
_marketplaces: Dict[str, Marketplace] = {}
_listings: Dict[str, MarketplaceListing] = {}
_agent_config: Optional[AgentConfig] = None
_tasks: Dict[str, SearchTask] = {}
_import_history: Dict[str, ImportHistory] = {}
_investigations: Dict[str, Investigation] = {}
_investigation_listing_edges: Dict[str, Dict[str, InvestigationListing]] = {}  # inv_id -> listing_id -> join
_listing_investigation_edges: Dict[str, Dict[str, InvestigationListing]] = {}  # listing_id -> inv_id -> join


async def init_db():
    """Initialize the database with default data."""
    global _agent_config
    
    # Initialize default marketplaces
    for mp_data in DEFAULT_MARKETPLACES:
        marketplace = Marketplace(**mp_data)
        _marketplaces[marketplace.id] = marketplace
    
    # Initialize default agent config
    _agent_config = AgentConfig(
        id="default",
        llm_provider=LLMProvider.OPENAI,
        llm_model="gpt-4o",
        llm_api_key=None,
        llm_api_base=None,
        llm_temperature=0.7,
        llm_max_tokens=4096,
        tools=[
            ToolConfig(tool_type=ToolType.GOOGLE_LENS, enabled=False),
            ToolConfig(tool_type=ToolType.GOOGLE_VISION, enabled=False),
            ToolConfig(tool_type=ToolType.TINEYE, enabled=False),
            ToolConfig(tool_type=ToolType.BING_VISUAL, enabled=False),
            ToolConfig(tool_type=ToolType.CUSTOM_WEBHOOK, enabled=False),
        ],
        skills=[
            AgentSkill(
                skill_id="risk_classifier",
                skill_type=SkillType.RISK_CLASSIFICATION,
                name="Risk Classification",
                description="Classifies violations and recalls by risk level based on injuries, deaths, units affected, and hazard severity",
                enabled=True,
                priority=80,
                settings=get_default_risk_classification_config().model_dump()
            ),
            AgentSkill(
                skill_id="query_builder",
                skill_type=SkillType.QUERY_BUILDING,
                name="Search Query Builder",
                description="Builds optimized search queries from violation/recall data for marketplace searches",
                enabled=True,
                priority=70,
                settings={
                    "max_keywords": 5,
                    "include_model_number": True,
                    "include_manufacturer": True
                }
            ),
            AgentSkill(
                skill_id="match_analyzer",
                skill_type=SkillType.MATCH_ANALYSIS,
                name="Match Score Analyzer",
                description="Analyzes marketplace listings and calculates match scores against violations/recalls",
                enabled=True,
                priority=75,
                settings={
                    "model_number_weight": 0.35,
                    "name_similarity_weight": 0.3,
                    "keyword_overlap_weight": 0.2,
                    "price_check_weight": 0.15
                }
            ),
        ]
    )
    
    # Load violations from JSON if available
    await load_violations_from_json()
    
    # Load recalls from JSON if available
    await load_recalls_from_json()


async def load_recalls_from_json():
    """Load recalls from the recalls.json file."""
    # Try to find recalls.json in parent directory
    json_path = Path(__file__).parent.parent.parent.parent / "recalls.json"
    
    if not json_path.exists():
        print(f"recalls.json not found at {json_path}")
        return
    
    try:
        with open(json_path, 'r') as f:
            data = json.load(f)
        
        recalls_data = data if isinstance(data, list) else data.get('recalls', [])
        
        for i, item in enumerate(recalls_data[:100]):  # Limit to 100 for performance
            recall = parse_cpsc_recall(item, index=i)
            if recall:
                # Classify risk
                recall = await classify_recall(recall)
                _recalls[recall.recall_id] = recall
        
        print(f"Loaded {len(_recalls)} recalls from JSON")
        
    except Exception as e:
        print(f"Error loading recalls.json: {e}")


async def load_violations_from_json():
    """Load violations from JSON file (similar to recalls)."""
    # Try to find violations.json or use recalls.json as source
    json_path = Path(__file__).parent.parent.parent.parent / "recalls.json"
    
    if not json_path.exists():
        return
    
    try:
        with open(json_path, 'r') as f:
            data = json.load(f)
        
        violations_data = data if isinstance(data, list) else data.get('recalls', [])
        
        for i, item in enumerate(violations_data[:100]):  # Limit to 100
            violation = parse_cpsc_to_violation(item, index=i)
            if violation:
                violation = await classify_violation(violation)
                _violations[violation.violation_id] = violation
        
        print(f"Loaded {len(_violations)} violations from JSON")
        
    except Exception as e:
        print(f"Error loading violations from JSON: {e}")


def parse_cpsc_to_violation(data: dict, index: int = 0) -> Optional[ProductViolation]:
    """Convert CPSC recall data to a ProductViolation."""
    try:
        recall_number = data.get('RecallNumber', data.get('recallNumber', f'RECALL-{index}'))
        violation_id = f"CPSC-{recall_number}"
        
        # Parse products
        products = []
        products_data = data.get('Products', data.get('products', []))
        if isinstance(products_data, list):
            for p in products_data:
                if isinstance(p, dict):
                    products.append(ViolationProduct(
                        name=p.get('Name', p.get('name', 'Unknown Product')),
                        description=p.get('Description', p.get('description', '')),
                        model_number=p.get('ModelNumber', p.get('model', '')),
                        manufacturer=p.get('Manufacturer', p.get('manufacturer', ''))
                    ))
        
        # Parse images
        images = []
        images_data = data.get('Images', data.get('images', []))
        if isinstance(images_data, list):
            for img in images_data:
                if isinstance(img, dict):
                    url = img.get('URL', img.get('url', ''))
                    if url:
                        images.append(ViolationImage(url=url))
                elif isinstance(img, str):
                    images.append(ViolationImage(url=img))
        
        # Parse hazards
        hazards = []
        hazard_data = data.get('Hazards', data.get('hazards', []))
        if isinstance(hazard_data, list):
            for h in hazard_data:
                if isinstance(h, dict):
                    hazards.append(ViolationHazard(
                        description=h.get('Name', h.get('description', ''))
                    ))
                elif isinstance(h, str):
                    hazards.append(ViolationHazard(description=h))
        
        # Parse remedies
        remedies = []
        remedy_data = data.get('Remedies', data.get('remedies', []))
        if isinstance(remedy_data, list):
            for r in remedy_data:
                if isinstance(r, dict):
                    remedies.append(ViolationRemedy(
                        description=r.get('Name', r.get('description', ''))
                    ))
        
        # Parse date
        date_str = data.get('RecallDate', data.get('recallDate', ''))
        violation_date = datetime.utcnow()
        if date_str:
            try:
                violation_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            except:
                try:
                    from dateutil import parser
                    violation_date = parser.parse(date_str)
                except:
                    pass
        
        def safe_int(val, default=0):
            if val is None:
                return default
            try:
                return int(str(val).replace(',', ''))
            except:
                return default
        
        title = data.get('Title', data.get('title', ''))
        if not title and products:
            title = f"Recall: {products[0].name}"
        if not title:
            title = f"Recall {recall_number}"
        
        return ProductViolation(
            violation_id=violation_id,
            violation_number=recall_number,
            title=title,
            url=data.get('URL', data.get('url', '')),
            agency_name="Consumer Product Safety Commission",
            agency_acronym="CPSC",
            description=data.get('Description', data.get('description', '')),
            violation_date=violation_date,
            units_affected=safe_int(data.get('NumberOfUnits', data.get('unitsAffected'))),
            injuries=safe_int(data.get('Injuries', data.get('injuries'))),
            deaths=safe_int(data.get('Deaths', data.get('deaths'))),
            incidents=safe_int(data.get('Incidents', data.get('incidents'))),
            products=products,
            images=images,
            hazards=hazards,
            remedies=remedies,
            country="US"
        )
        
    except Exception as e:
        print(f"Error parsing violation: {e}")
        return None




# Violation CRUD operations
async def get_all_violations() -> List[ProductViolation]:
    """Get all violations."""
    return list(_violations.values())


async def get_violation(violation_id: str) -> Optional[ProductViolation]:
    """Get a specific violation by ID."""
    return _violations.get(violation_id)


async def search_violations(
    query: str,
    risk_level: Optional[RiskLevel] = None,
    agency_name: Optional[str] = None,
    country: Optional[str] = None
) -> List[ProductViolation]:
    """Search violations by text query and optional filters."""
    results = []
    query_lower = query.lower()
    
    for violation in _violations.values():
        # Filter by risk level
        if risk_level and violation.risk_level != risk_level:
            continue
        
        # Filter by agency
        if agency_name and violation.agency_name.lower() != agency_name.lower():
            continue
        
        # Filter by country
        if country and violation.country != country:
            continue
        
        # Search in title, description, products
        searchable = f"{violation.title} {violation.description or ''} {violation.violation_number}".lower()
        for product in violation.products:
            searchable += f" {product.name} {product.model_number or ''} {product.manufacturer or ''}".lower()
        
        if query_lower in searchable:
            results.append(violation)
    
    return results


async def add_violation(violation: ProductViolation) -> ProductViolation:
    """Add a new violation."""
    violation = classify_violation(violation)
    _violations[violation.violation_id] = violation
    return violation


async def get_violations_by_agency(agency_name: str) -> List[ProductViolation]:
    """Get all violations from a specific agency."""
    return [v for v in _violations.values() if v.agency_name.lower() == agency_name.lower()]


async def get_violations_by_risk(risk_level: RiskLevel) -> List[ProductViolation]:
    """Get violations filtered by risk level."""
    return [v for v in _violations.values() if v.risk_level == risk_level]


async def get_listings_for_violation(violation_id: str) -> List[MarketplaceListing]:
    """Get all listings found for a violation."""
    return [l for l in _listings.values() if hasattr(l, 'violation_id') and l.violation_id == violation_id]


def parse_cpsc_recall(data: dict, index: int = 0) -> Optional[Recall]:
    """Parse a CPSC recall JSON object into a Recall model."""
    try:
        # Extract recall number
        recall_number = data.get('RecallNumber', data.get('recallNumber', f'RECALL-{index}'))
        recall_id = f"cpsc-{recall_number}"
        
        # Parse products
        products = []
        products_data = data.get('Products', data.get('products', []))
        if isinstance(products_data, list):
            for p in products_data:
                if isinstance(p, dict):
                    products.append(RecallProduct(
                        name=p.get('Name', p.get('name', 'Unknown Product')),
                        description=p.get('Description', p.get('description', '')),
                        model_number=p.get('ModelNumber', p.get('model', '')),
                        manufacturer=p.get('Manufacturer', p.get('manufacturer', ''))
                    ))
        
        # Parse images
        images = []
        images_data = data.get('Images', data.get('images', []))
        if isinstance(images_data, list):
            for img in images_data:
                if isinstance(img, dict):
                    url = img.get('URL', img.get('url', ''))
                    if url:
                        images.append(RecallImage(url=url))
                elif isinstance(img, str):
                    images.append(RecallImage(url=img))
        
        # Parse hazards
        hazards = []
        hazard_data = data.get('Hazards', data.get('hazards', []))
        if isinstance(hazard_data, list):
            for h in hazard_data:
                if isinstance(h, dict):
                    hazards.append(RecallHazard(
                        description=h.get('Name', h.get('description', '')),
                        hazard_type=h.get('HazardType', '')
                    ))
                elif isinstance(h, str):
                    hazards.append(RecallHazard(description=h))
        
        # Parse remedies
        remedies = []
        remedy_data = data.get('Remedies', data.get('remedies', []))
        if isinstance(remedy_data, list):
            for r in remedy_data:
                if isinstance(r, dict):
                    remedies.append(RecallRemedy(
                        description=r.get('Name', r.get('description', '')),
                        remedy_type=r.get('RemedyType', '')
                    ))
        
        # Parse date
        date_str = data.get('RecallDate', data.get('recallDate', ''))
        recall_date = datetime.now()
        if date_str:
            try:
                recall_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            except:
                try:
                    from dateutil import parser
                    recall_date = parser.parse(date_str)
                except:
                    pass
        
        # Parse numbers
        def safe_int(val, default=0):
            if val is None:
                return default
            try:
                return int(str(val).replace(',', ''))
            except:
                return default
        
        # Get title
        title = data.get('Title', data.get('title', ''))
        if not title and products:
            title = f"Recall: {products[0].name}"
        if not title:
            title = f"Recall {recall_number}"
        
        return Recall(
            recall_id=recall_id,
            recall_number=recall_number,
            title=title,
            description=data.get('Description', data.get('description', '')),
            recall_date=recall_date,
            units_sold=safe_int(data.get('NumberOfUnits', data.get('unitsAffected'))),
            injuries=safe_int(data.get('Injuries', data.get('injuries'))),
            deaths=safe_int(data.get('Deaths', data.get('deaths'))),
            incidents=safe_int(data.get('Incidents', data.get('incidents'))),
            products=products,
            images=images,
            hazards=hazards,
            remedies=remedies,
            source="CPSC",
            source_url=data.get('URL', data.get('url', ''))
        )
        
    except Exception as e:
        print(f"Error parsing recall: {e}")
        return None


# Recall CRUD operations
async def get_all_recalls() -> List[Recall]:
    """Get all recalls."""
    return list(_recalls.values())


async def get_recall(recall_id: str) -> Optional[Recall]:
    """Get a specific recall by ID."""
    return _recalls.get(recall_id)


async def search_recalls(query: str, risk_level: Optional[RiskLevel] = None) -> List[Recall]:
    """Search recalls by text query and optional risk level."""
    results = []
    query_lower = query.lower()
    
    for recall in _recalls.values():
        # Filter by risk level if specified
        if risk_level and recall.risk_level != risk_level:
            continue
        
        # Search in title, description, products
        searchable = f"{recall.title} {recall.description}".lower()
        for product in recall.products:
            searchable += f" {product.name} {product.model_number or ''} {product.manufacturer or ''}".lower()
        
        if query_lower in searchable:
            results.append(recall)
    
    return results


async def add_recall(recall: Recall) -> Recall:
    """Add a new recall."""
    recall = await classify_recall(recall)
    _recalls[recall.recall_id] = recall
    return recall


async def get_recalls_by_risk(risk_level: RiskLevel) -> List[Recall]:
    """Get recalls filtered by risk level."""
    return [r for r in _recalls.values() if r.risk_level == risk_level]


async def get_risk_summary() -> Dict[str, int]:
    """Get count of violations by risk level (for violations endpoint)."""
    summary = {
        "HIGH": 0,
        "MEDIUM": 0,
        "LOW": 0,
        "total": len(_violations)
    }
    for violation in _violations.values():
        summary[violation.risk_level.value] += 1
    return summary


async def get_recalls_risk_summary() -> Dict[str, int]:
    """Get count of recalls by risk level (for backward compatibility)."""
    summary = {
        "HIGH": 0,
        "MEDIUM": 0,
        "LOW": 0,
        "total": len(_recalls)
    }
    for recall in _recalls.values():
        summary[recall.risk_level.value] += 1
    return summary


# Marketplace operations
async def get_all_marketplaces() -> List[Marketplace]:
    """Get all configured marketplaces."""
    return list(_marketplaces.values())


async def get_marketplace(marketplace_id: str) -> Optional[Marketplace]:
    """Get a specific marketplace."""
    return _marketplaces.get(marketplace_id)


async def save_marketplace(marketplace: Marketplace) -> Marketplace:
    """Save or update a marketplace."""
    _marketplaces[marketplace.id] = marketplace
    return marketplace


async def update_marketplace(marketplace_id: str, updates: dict) -> Optional[Marketplace]:
    """Update marketplace settings."""
    if marketplace_id not in _marketplaces:
        return None
    
    mp = _marketplaces[marketplace_id]
    for key, value in updates.items():
        if hasattr(mp, key) and value is not None:
            setattr(mp, key, value)
    mp.updated_at = datetime.utcnow()
    _marketplaces[marketplace_id] = mp
    return mp


async def add_marketplace(marketplace: Marketplace) -> Marketplace:
    """Add a new marketplace."""
    _marketplaces[marketplace.id] = marketplace
    return marketplace


# Listing operations
async def save_listing(listing: MarketplaceListing) -> MarketplaceListing:
    """
    Save a marketplace listing.

    Dedupes by canonical key: (marketplace_id, listing_url).
    This allows a single listing URL to be linked into multiple investigations
    without creating duplicate listing rows.
    """
    # Dedupe by marketplace + URL
    for existing in _listings.values():
        if (
            existing.marketplace_id == listing.marketplace_id
            and existing.listing_url == listing.listing_url
        ):
            # Keep the original ID but refresh metadata if new values provided
            if listing.title and listing.title != existing.title:
                existing.title = listing.title
            if listing.description and (not existing.description or listing.description != existing.description):
                existing.description = listing.description
            if listing.image_url and (not existing.image_url or listing.image_url != existing.image_url):
                existing.image_url = listing.image_url
            if listing.seller_name and (not existing.seller_name or listing.seller_name != existing.seller_name):
                existing.seller_name = listing.seller_name
            if listing.price is not None:
                existing.price = listing.price
            # Preserve match info if higher confidence
            if (listing.match_score or 0) > (existing.match_score or 0):
                existing.match_score = listing.match_score
                existing.match_reasons = listing.match_reasons
                existing.recall_id = listing.recall_id or existing.recall_id
                existing.violation_id = listing.violation_id or existing.violation_id
            _listings[existing.id] = existing
            return existing

    _listings[listing.id] = listing
    return listing


async def get_listings_for_recall(recall_id: str) -> List[MarketplaceListing]:
    """Get all listings found for a recall."""
    return [l for l in _listings.values() if l.recall_id == recall_id]


async def get_listing(listing_id: str) -> Optional[MarketplaceListing]:
    """Get a specific listing by ID."""
    return _listings.get(listing_id)


async def get_all_listings() -> List[MarketplaceListing]:
    """Get all marketplace listings across all recalls."""
    return list(_listings.values())

async def get_listings_for_investigation(investigation_id: str) -> List[MarketplaceListing]:
    """Get all listings linked to a specific investigation."""
    edges = _investigation_listing_edges.get(investigation_id, {})
    listing_ids = list(edges.keys())
    return [l for lid in listing_ids if (l := _listings.get(lid)) is not None]


async def link_listing_to_investigation(
    investigation_id: str,
    listing_id: str,
    added_by: Optional[str] = None,
    source: Optional[str] = None,
    notes: Optional[str] = None,
    metadata: Optional[dict] = None
) -> InvestigationListing:
    """Create/update the join record linking an investigation to a listing."""
    join = InvestigationListing(
        investigation_id=investigation_id,
        listing_id=listing_id,
        added_by=added_by,
        source=source,
        notes=notes,
        metadata=metadata or {},
    )
    _investigation_listing_edges.setdefault(investigation_id, {})[listing_id] = join
    _listing_investigation_edges.setdefault(listing_id, {})[investigation_id] = join
    await recalculate_investigation_counts(investigation_id)
    return join


async def unlink_listing_from_investigation(investigation_id: str, listing_id: str) -> bool:
    """Remove the link between an investigation and a listing."""
    removed = False
    if investigation_id in _investigation_listing_edges:
        removed = _investigation_listing_edges[investigation_id].pop(listing_id, None) is not None or removed
        if not _investigation_listing_edges[investigation_id]:
            _investigation_listing_edges.pop(investigation_id, None)
    if listing_id in _listing_investigation_edges:
        removed = _listing_investigation_edges[listing_id].pop(investigation_id, None) is not None or removed
        if not _listing_investigation_edges[listing_id]:
            _listing_investigation_edges.pop(listing_id, None)
    if removed:
        await recalculate_investigation_counts(investigation_id)
    return removed


async def get_investigations_for_listing(listing_id: str) -> List[str]:
    """Return investigation IDs that include this listing."""
    edges = _listing_investigation_edges.get(listing_id, {})
    return list(edges.keys())


async def recalculate_investigation_counts(investigation_id: str) -> None:
    """Recalculate listings_found / listings_queued based on current join edges."""
    inv = _investigations.get(investigation_id)
    if not inv:
        return
    count = len(_investigation_listing_edges.get(investigation_id, {}))
    inv.listings_found = count
    inv.listings_queued = count
    inv.updated_at = datetime.utcnow()
    _investigations[investigation_id] = inv


# Agent config operations
async def get_agent_config() -> AgentConfig:
    """Get agent configuration."""
    return _agent_config


async def update_agent_config(updates: dict) -> AgentConfig:
    """Update agent configuration."""
    global _agent_config
    for key, value in updates.items():
        if hasattr(_agent_config, key) and value is not None:
            setattr(_agent_config, key, value)
    _agent_config.updated_at = datetime.utcnow()
    return _agent_config


# Task operations
async def create_task(task: SearchTask) -> SearchTask:
    """Create a new task."""
    _tasks[task.id] = task
    return task


async def get_task(task_id: str) -> Optional[SearchTask]:
    """Get a task by ID."""
    return _tasks.get(task_id)


async def get_pending_tasks() -> List[SearchTask]:
    """Get all pending tasks."""
    from app.models.agent import TaskStatus
    return [t for t in _tasks.values() if t.status == TaskStatus.PENDING]

# Investigation operations
async def add_investigation(investigation: Investigation) -> Investigation:
    """Add a new investigation."""
    _investigations[investigation.investigation_id] = investigation
    return investigation


async def get_all_investigations() -> List[Investigation]:
    """Get all investigations."""
    return list(_investigations.values())


async def get_investigation(investigation_id: str) -> Optional[Investigation]:
    """Get a specific investigation by ID."""
    return _investigations.get(investigation_id)


async def update_investigation(investigation: Investigation) -> Investigation:
    """Update an existing investigation."""
    _investigations[investigation.investigation_id] = investigation
    return investigation


async def delete_investigation(investigation_id: str) -> bool:
    """Delete an investigation."""
    # Remove any join edges
    edges = _investigation_listing_edges.pop(investigation_id, {})
    for listing_id in list(edges.keys()):
        if listing_id in _listing_investigation_edges:
            _listing_investigation_edges[listing_id].pop(investigation_id, None)
            if not _listing_investigation_edges[listing_id]:
                _listing_investigation_edges.pop(listing_id, None)
    return _investigations.pop(investigation_id, None) is not None


# Import history operations
async def save_import_history(history: ImportHistory) -> ImportHistory:
    """Save import history record."""
    _import_history[history.import_id] = history
    return history


async def get_import_history(
    import_type: Optional[str] = None,
    source: Optional[ImportSource] = None,
    limit: int = 50,
    offset: int = 0
) -> List[ImportHistory]:
    """Get import history with optional filters."""
    history_list = list(_import_history.values())
    
    # Filter by type
    if import_type:
        history_list = [h for h in history_list if h.import_type == import_type]
    
    # Filter by source
    if source:
        history_list = [h for h in history_list if h.source == source]
    
    # Sort by created_at (newest first)
    history_list.sort(key=lambda h: h.created_at, reverse=True)
    
    # Paginate
    return history_list[offset:offset + limit]


async def get_import_history_item(import_id: str) -> Optional[ImportHistory]:
    """Get a specific import history item."""
    return _import_history.get(import_id)


# Violation helper functions
async def add_violation_from_create(violation_create: ViolationCreate) -> ProductViolation:
    """Create a violation from ViolationCreate model."""
    from datetime import datetime
    import uuid
    
    # Generate violation ID
    violation_id = f"{violation_create.agency_acronym or violation_create.agency_name[:4].upper()}-{violation_create.violation_number}"
    
    violation = ProductViolation(
        violation_id=violation_id,
        violation_number=violation_create.violation_number,
        title=violation_create.title,
        url=violation_create.url,
        agency_name=violation_create.agency_name,
        agency_acronym=violation_create.agency_acronym,
        agency_id=violation_create.agency_id,
        violation_type=violation_create.violation_type,
        description=violation_create.description,
        violation_date=violation_create.violation_date or datetime.utcnow(),
        units_affected=violation_create.units_affected,
        injuries=violation_create.injuries,
        deaths=violation_create.deaths,
        incidents=violation_create.incidents,
        country=violation_create.country,
        agency_metadata=violation_create.agency_metadata,
        products=[],
        hazards=[],
        remedies=[],
        images=[]
    )
    
    return await add_violation(violation)


async def update_violation(violation: ProductViolation) -> ProductViolation:
    """Update an existing violation."""
    _violations[violation.violation_id] = violation
    return violation

