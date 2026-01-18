"""
Scheduled Import Service
========================
Service for scheduling and executing recurring API imports using APScheduler.
"""

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from app.services import database as db
from app.services.api_import_service import fetch_from_organization_api
from app.services.workflow_service import process_bulk_violation_import
from app.models.import_models import ImportSource

logger = logging.getLogger(__name__)


async def schedule_api_import(organization_id: str, schedule: str, enabled: bool = True):
    """
    Schedule recurring API imports for an organization.
    
    Args:
        organization_id: Organization ID
        schedule: Schedule frequency ('daily', 'weekly', 'monthly', 'none')
        enabled: Whether scheduling is enabled
    """
    # Get organization
    organization = await db.get_organization(organization_id)
    if not organization:
        raise ValueError(f"Organization {organization_id} not found")
    
    if not organization.api_endpoint:
        raise ValueError(f"Organization {organization_id} does not have API endpoint configured")
    
    # Update organization with schedule
    from app.models.organization import OrganizationUpdate
    updates = OrganizationUpdate(
        api_import_schedule=schedule,
        api_import_enabled=enabled
    )
    
    updated_org = await db.update_organization(organization_id, updates)
    
    # Register with scheduler if enabled
    if enabled and schedule != "none":
        from app.services.investigation_scheduler import get_scheduler
        scheduler = get_scheduler()
        if scheduler:
            job_id = f"api_import_{organization_id}"
            
            # Remove existing job if any
            try:
                scheduler.remove_job(job_id)
            except:
                pass
            
            # Calculate trigger based on schedule
            from apscheduler.triggers.cron import CronTrigger
            
            trigger = None
            if schedule == "daily":
                trigger = CronTrigger(hour=0, minute=0)  # Run at midnight
            elif schedule == "weekly":
                trigger = CronTrigger(day_of_week=0, hour=0, minute=0)  # Run Sunday at midnight
            elif schedule == "monthly":
                trigger = CronTrigger(day=1, hour=0, minute=0)  # Run first day of month at midnight
            
            if trigger:
                scheduler.add_job(
                    run_scheduled_import,
                    trigger=trigger,
                    args=[organization_id],
                    id=job_id,
                    replace_existing=True
                )
                logger.info(f"Scheduled {schedule} API import for organization {organization_id}")
    
    return updated_org


async def run_scheduled_import(organization_id: str):
    """
    Execute a scheduled API import for an organization.
    
    Args:
        organization_id: Organization ID
    """
    try:
        # Get organization
        organization = await db.get_organization(organization_id)
        if not organization:
            logger.error(f"Organization {organization_id} not found for scheduled import")
            return
        
        if not organization.api_endpoint or not organization.api_enabled:
            logger.warning(f"Organization {organization_id} API not configured or enabled")
            return
        
        logger.info(f"Running scheduled API import for organization {organization_id}")
        
        # Fetch data from API
        items = await fetch_from_organization_api(organization_id)
        
        if not items:
            logger.info(f"No items returned from API for organization {organization_id}")
            # Update last_run timestamp even if no items
            from app.models.organization import OrganizationUpdate
            await db.update_organization(organization_id, OrganizationUpdate(
                api_import_last_run=datetime.utcnow()
            ))
            return
        
        # Process items through bulk import
        field_mapping = organization.api_import_field_mapping
        result = await process_bulk_violation_import(
            violations_data=items,
            source=ImportSource.API,
            source_name=f"Scheduled import: {organization.name or organization_id}",
            auto_classify=True,
            auto_investigate=True,
            created_by="system"
        )
        
        # Update last_run timestamp
        from app.models.organization import OrganizationUpdate
        await db.update_organization(organization_id, OrganizationUpdate(
            api_import_last_run=datetime.utcnow()
        ))
        
        logger.info(f"Scheduled import completed for {organization_id}: {result['successful']} successful, {result['failed']} failed")
        
    except Exception as e:
        logger.error(f"Error in scheduled API import for organization {organization_id}: {e}")
        raise


async def get_scheduled_imports() -> List[Dict[str, Any]]:
    """
    Get list of all scheduled API imports with their status.
    
    Returns:
        List of dictionaries with organization_id, schedule, enabled, last_run
    """
    organizations = await db.get_organizations()
    
    scheduled_imports = []
    for org in organizations:
        if org.api_import_schedule and org.api_import_schedule != "none":
            scheduled_imports.append({
                "organization_id": org.organization_id,
                "organization_name": org.name,
                "schedule": org.api_import_schedule,
                "enabled": org.api_import_enabled,
                "last_run": org.api_import_last_run.isoformat() if org.api_import_last_run else None,
                "api_endpoint": org.api_endpoint,
                "api_enabled": org.api_enabled
            })
    
    return scheduled_imports
