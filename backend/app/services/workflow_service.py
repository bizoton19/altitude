"""
Workflow orchestration service.
Handles the complete workflow: Import → Save → Classify → Schedule Investigation
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import uuid

from app.models.violation import ProductViolation, ViolationCreate, RiskLevel, ViolationType
from app.models.investigation import Investigation, InvestigationCreate, InvestigationSchedule, InvestigationStatus
from app.models.import_models import ImportHistory, ImportStatus, ImportSource
from app.services import database as db
from app.services.investigation_scheduler import schedule_investigation
from app.skills.risk_classifier import classify_violation


async def process_violation_import(
    violation_data: ViolationCreate,
    source: ImportSource,
    source_name: Optional[str] = None,
    auto_classify: bool = True,
    auto_investigate: bool = True,
    created_by: str = "system"
) -> Dict[str, Any]:
    """
    Complete workflow for importing a violation:
    1. Parse and validate violation data
    2. Save to database
    3. Auto-classify risk level
    4. Create import history record
    5. If HIGH risk and auto_investigate enabled:
       - Create investigation
       - Schedule investigation
    6. Return complete result
    """
    import_id = f"import-{uuid.uuid4().hex[:12]}"
    violation_id = f"{violation_data.agency_acronym or 'VIOL'}-{violation_data.violation_number}"
    
    try:
        # 1. Create violation from ViolationCreate
        violation = ProductViolation(
            violation_id=violation_id,
            violation_number=violation_data.violation_number,
            title=violation_data.title,
            url=violation_data.url,
            # Organization fields (required)
            organization_name=violation_data.organization_name,
            organization_id=violation_data.organization_id,
            organization_type=violation_data.organization_type,
            # Legacy agency fields (also required for backward compatibility)
            agency_name=violation_data.agency_name,
            agency_acronym=violation_data.agency_acronym,
            agency_id=violation_data.agency_id,
            # Joint recall fields
            joint_organization_name=violation_data.joint_organization_name,
            joint_organization_id=violation_data.joint_organization_id,
            is_voluntary_recall=violation_data.is_voluntary_recall,
            is_joint_recall=violation_data.is_joint_recall,
            # Other fields
            description=violation_data.description,
            violation_date=violation_data.violation_date,
            violation_type=violation_data.violation_type or ViolationType.RECALL,
            units_affected=violation_data.units_affected,
            injuries=violation_data.injuries,
            deaths=violation_data.deaths,
            incidents=violation_data.incidents,
            country=violation_data.country,
            region=violation_data.region,
            agency_metadata=violation_data.agency_metadata or {},
            # Explicitly set timestamps
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        
        # 2. Auto-classify risk if enabled
        if auto_classify:
            violation = await classify_violation(violation)
        
        # 3. Save to database
        violation = await db.add_violation(violation)
        
        # 4. Create import history
        import_history = ImportHistory(
            import_id=import_id,
            import_type="violation",
            source=source,
            source_name=source_name or "Manual Import",
            status=ImportStatus.COMPLETED,
            total_items=1,
            successful=1,
            failed=0,
            created_by=created_by,
            completed_at=datetime.utcnow(),
        )
        await db.save_import_history(import_history)
        
        # 5. Auto-create investigation for HIGH risk violations
        investigation = None
        if auto_investigate and violation.risk_level == RiskLevel.HIGH:
            investigation = await create_investigation_for_violation(
                violation_id=violation.violation_id,
                auto_schedule=True,
                created_by=created_by
            )
        
        return {
            "import_id": import_id,
            "violation_id": violation.violation_id,
            "violation": violation,
            "risk_level": violation.risk_level,
            "risk_score": violation.risk_score,
            "investigation": investigation,
            "investigation_id": investigation.investigation_id if investigation else None,
        }
        
    except Exception as e:
        # Save failed import history
        import_history = ImportHistory(
            import_id=import_id,
            import_type="violation",
            source=source,
            source_name=source_name or "Manual Import",
            status=ImportStatus.FAILED,
            total_items=1,
            successful=0,
            failed=1,
            created_by=created_by,
            completed_at=datetime.utcnow(),
            error_summary=str(e),
        )
        await db.save_import_history(import_history)
        raise


async def create_investigation_for_violation(
    violation_id: str,
    marketplace_ids: Optional[List[str]] = None,
    auto_schedule: bool = True,
    created_by: str = "system"
) -> Investigation:
    """
    Create an investigation for a violation.
    If marketplace_ids is None, uses all enabled marketplaces.
    """
    # Get violation to determine risk level
    violation = await db.get_violation(violation_id)
    if not violation:
        raise ValueError(f"Violation {violation_id} not found")
    
    # Get marketplaces
    if marketplace_ids is None or marketplace_ids == ["all_enabled"]:
        all_marketplaces = await db.get_all_marketplaces()
        marketplace_ids = [mp.id for mp in all_marketplaces if mp.enabled]
    
    # Generate investigation name
    investigation_name = f"Investigation: {violation.title[:50]}"
    
    # Determine schedule based on risk level
    if violation.risk_level == RiskLevel.HIGH:
        schedule = InvestigationSchedule.DAILY
        scheduled_start = datetime.utcnow() + timedelta(minutes=5)  # Start soon
    elif violation.risk_level == RiskLevel.MEDIUM:
        schedule = InvestigationSchedule.WEEKLY
        scheduled_start = datetime.utcnow() + timedelta(hours=1)
    else:
        schedule = InvestigationSchedule.MONTHLY
        scheduled_start = datetime.utcnow() + timedelta(days=1)
    
    # Create investigation
    investigation = Investigation(
        investigation_id=f"inv-{uuid.uuid4().hex[:8]}",
        name=investigation_name,
        description=f"Auto-created investigation for {violation.violation_number}",
        schedule=schedule,
        scheduled_start_time=scheduled_start,
        violation_ids=[violation_id],
        marketplace_ids=marketplace_ids,
        status=InvestigationStatus.SCHEDULED,
        autonomous=True,
        execution_strategy="hybrid",  # HIGH sequential, MEDIUM/LOW parallel
        priority_order=["HIGH", "MEDIUM", "LOW"],
        created_by=created_by,
    )
    
    investigation = await db.add_investigation(investigation)
    
    # Schedule investigation if auto_schedule is enabled
    if auto_schedule:
        await schedule_investigation(investigation)
    
    return investigation


async def process_bulk_violation_import(
    violations_data: List[Dict[str, Any]],
    source: ImportSource,
    source_name: Optional[str] = None,
    auto_classify: bool = True,
    auto_investigate: bool = True,
    created_by: str = "system"
) -> Dict[str, Any]:
    """
    Process multiple violations in bulk.
    Returns summary of successful/failed imports and investigations created.
    """
    import_id = f"import-{uuid.uuid4().hex[:12]}"
    successful = []
    failed = []
    investigations_created = []
    
    for i, data in enumerate(violations_data):
        try:
            # Convert dict to ViolationCreate
            violation_create = ViolationCreate(**data)
            
            result = await process_violation_import(
                violation_data=violation_create,
                source=source,
                source_name=source_name,
                auto_classify=auto_classify,
                auto_investigate=auto_investigate,
                created_by=created_by
            )
            
            successful.append(result["violation_id"])
            if result.get("investigation_id"):
                investigations_created.append(result["investigation_id"])
                
        except Exception as e:
            failed.append({
                "index": i,
                "data": data,
                "error": str(e)
            })
    
    # Create import history
    import_history = ImportHistory(
        import_id=import_id,
        import_type="violation",
        source=source,
        source_name=source_name or "Bulk Import",
        status=ImportStatus.PARTIAL if failed else ImportStatus.COMPLETED,
        total_items=len(violations_data),
        successful=len(successful),
        failed=len(failed),
        created_by=created_by,
        completed_at=datetime.utcnow(),
        metadata={
            "investigations_created": investigations_created,
            "failed_items": failed[:10]  # Limit to first 10 errors
        }
    )
    await db.save_import_history(import_history)
    
    return {
        "import_id": import_id,
        "total": len(violations_data),
        "successful": len(successful),
        "failed": len(failed),
        "violation_ids": successful,
        "investigation_ids": investigations_created,
        "errors": failed,
    }

