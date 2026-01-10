"""
Investigation scheduler service.
Manages scheduled investigations using APScheduler.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List
import uuid
import random
from app.models.investigation import Investigation, InvestigationStatus, InvestigationSchedule
from app.models.marketplace import MarketplaceListing
from app.services import database as db

logger = logging.getLogger(__name__)

_scheduler = None


def get_scheduler():
    """Get or create the scheduler instance."""
    global _scheduler
    
    if _scheduler is None:
        try:
            from apscheduler.schedulers.asyncio import AsyncIOScheduler
            from apscheduler.triggers.cron import CronTrigger
            from apscheduler.triggers.date import DateTrigger
            
            _scheduler = AsyncIOScheduler()
            logger.info("Investigation scheduler initialized")
        except ImportError:
            logger.warning("APScheduler not installed. Install with: pip install APScheduler")
            return None
    
    return _scheduler


async def schedule_investigation(investigation: Investigation):
    """
    Schedule an investigation to run at its scheduled time.
    """
    scheduler = get_scheduler()
    if not scheduler:
        logger.error("Scheduler not available")
        return

    # Import trigger here to avoid relying on imports inside get_scheduler()
    from apscheduler.triggers.date import DateTrigger
    
    # Remove existing job if any
    job_id = f"investigation_{investigation.investigation_id}"
    try:
        scheduler.remove_job(job_id)
    except:
        pass
    
    # Calculate next run time based on schedule
    next_run_time = calculate_next_run_time(
        investigation.scheduled_start_time,
        investigation.schedule
    )
    
    # Schedule the job
    scheduler.add_job(
        run_investigation_task,
        trigger=DateTrigger(run_date=next_run_time),
        args=[investigation.investigation_id],
        id=job_id,
        replace_existing=True
    )
    
    logger.info(f"Scheduled investigation {investigation.investigation_id} for {next_run_time}")


def calculate_next_run_time(start_time: datetime, schedule: InvestigationSchedule) -> datetime:
    """Calculate the next run time based on schedule."""
    # Normalize timezone-aware datetimes into naive UTC to avoid comparison errors
    if start_time.tzinfo is not None:
        start_time = start_time.astimezone(timezone.utc).replace(tzinfo=None)
    now = datetime.utcnow()
    
    if schedule == InvestigationSchedule.DAILY:
        # Run daily at the same time
        next_run = start_time.replace(year=now.year, month=now.month, day=now.day)
        if next_run <= now:
            next_run += timedelta(days=1)
        return next_run
    
    elif schedule == InvestigationSchedule.WEEKLY:
        # Run weekly
        days_until_next = (7 - (now.weekday() - start_time.weekday())) % 7
        if days_until_next == 0 and now.time() >= start_time.time():
            days_until_next = 7
        return now.replace(hour=start_time.hour, minute=start_time.minute, second=0) + timedelta(days=days_until_next)
    
    elif schedule == InvestigationSchedule.BIWEEKLY:
        # Run every 2 weeks
        days_since_start = (now - start_time).days
        weeks_since_start = days_since_start // 14
        next_run = start_time + timedelta(weeks=(weeks_since_start + 1) * 2)
        return next_run
    
    elif schedule == InvestigationSchedule.MONTHLY:
        # Run monthly
        next_run = start_time.replace(year=now.year, month=now.month)
        if next_run <= now:
            # Move to next month
            if now.month == 12:
                next_run = next_run.replace(year=now.year + 1, month=1)
            else:
                next_run = next_run.replace(month=now.month + 1)
        return next_run
    
    else:  # CUSTOM
        # For custom, use the scheduled_start_time, but never schedule in the past
        if start_time <= now:
            return now + timedelta(seconds=1)
        return start_time


async def run_investigation_task(investigation_id: str):
    """
    Task function that runs an investigation.
    This is called by the scheduler.
    """
    logger.info(f"Running investigation {investigation_id}")
    
    investigation = await db.get_investigation(investigation_id)
    if not investigation:
        logger.error(f"Investigation {investigation_id} not found")
        return
    
    if investigation.status not in (InvestigationStatus.SCHEDULED, InvestigationStatus.RUNNING):
        logger.warning(f"Investigation {investigation_id} is not runnable (status={investigation.status})")
        return
    
    # Update status to running
    investigation.status = InvestigationStatus.RUNNING
    investigation.start_time = datetime.utcnow()
    investigation = await db.update_investigation(investigation)
    
    try:
        # Minimal execution (MVP):
        # - For each target violation_id and marketplace_id, generate mock listing URLs
        # - Save canonical listing (dedup by URL)
        # - Link listing to this investigation via join record
        #
        # This makes investigations actually "yield URLs" and creates an auditable trail.
        listings_created = 0
        per_marketplace = max(1, min(5, len(investigation.violation_ids)))  # small, bounded

        for marketplace_id in investigation.marketplace_ids:
            marketplace = await db.get_marketplace(marketplace_id)
            if not marketplace or not marketplace.enabled:
                continue

            for violation_id in investigation.violation_ids:
                # Generate 0-2 listings per violation per marketplace
                for _ in range(random.randint(0, 2)):
                    listing_url = f"https://{marketplace_id}.com/listing/{uuid.uuid4().hex[:10]}"
                    listing = MarketplaceListing(
                        id=str(uuid.uuid4()),
                        marketplace_id=marketplace_id,
                        marketplace_name=marketplace.name,
                        title=f"Investigation finding for {violation_id}",
                        description=f"Generated by investigation {investigation_id}",
                        listing_url=listing_url,
                        recall_id=violation_id,  # backward compatibility field
                        violation_id=violation_id,
                        match_score=0.0,
                        match_reasons=["investigation_mvp"],
                        found_at=datetime.utcnow(),
                    )
                    saved = await db.save_listing(listing)
                    await db.link_listing_to_investigation(
                        investigation_id=investigation_id,
                        listing_id=saved.id,
                        added_by=investigation.agent_id or investigation.created_by,
                        source="scheduler",
                        metadata={"marketplace_id": marketplace_id, "violation_id": violation_id},
                    )
                    listings_created += 1

        investigation.status = InvestigationStatus.COMPLETED
        investigation.end_time = datetime.utcnow()
        investigation.listings_found = listings_created
        investigation.listings_queued = listings_created  # future: review queue count
        
        # Reschedule for next run
        investigation.scheduled_start_time = calculate_next_run_time(
            investigation.scheduled_start_time,
            investigation.schedule
        )
        
        await db.update_investigation(investigation)
        
        # Reschedule if not cancelled
        if investigation.status != InvestigationStatus.CANCELLED:
            await schedule_investigation(investigation)
        
        logger.info(f"Investigation {investigation_id} completed")
        
    except Exception as e:
        logger.error(f"Error running investigation {investigation_id}: {e}")
        investigation.status = InvestigationStatus.FAILED
        investigation.end_time = datetime.utcnow()
        await db.update_investigation(investigation)


async def start_scheduler():
    """Start the scheduler and load all scheduled investigations."""
    scheduler = get_scheduler()
    if not scheduler:
        return
    
    if scheduler.running:
        logger.warning("Scheduler is already running")
        return
    
    # Load all scheduled investigations
    investigations = await db.get_all_investigations()
    scheduled_investigations = [
        inv for inv in investigations
        if inv.status == InvestigationStatus.SCHEDULED
    ]
    
    for investigation in scheduled_investigations:
        await schedule_investigation(investigation)
    
    scheduler.start()
    logger.info(f"Scheduler started with {len(scheduled_investigations)} investigations")


async def stop_scheduler():
    """Stop the scheduler."""
    scheduler = get_scheduler()
    if scheduler and scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped")


def remove_investigation_job(investigation_id: str):
    """Remove a scheduled investigation job."""
    scheduler = get_scheduler()
    if not scheduler:
        return
    
    job_id = f"investigation_{investigation_id}"
    try:
        scheduler.remove_job(job_id)
        logger.info(f"Removed scheduled job for investigation {investigation_id}")
    except:
        pass




