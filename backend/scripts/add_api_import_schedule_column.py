#!/usr/bin/env python3
"""
Migration Script: Add api_import_schedule column to organizations table
======================================================================
Adds the missing api_import_schedule column to the organizations table
if it doesn't already exist.

Usage:
    python backend/scripts/add_api_import_schedule_column.py
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.db.session import engine, AsyncSessionLocal
from app.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def column_exists(conn, table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table."""
    if "sqlite" in settings.get_database_url():
        # SQLite
        result = await conn.execute(
            text(f"PRAGMA table_info({table_name})")
        )
        columns = result.fetchall()
        return any(col[1] == column_name for col in columns)
    else:
        # PostgreSQL
        result = await conn.execute(
            text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = :table_name
                    AND column_name = :column_name
                )
            """),
            {"table_name": table_name, "column_name": column_name}
        )
        return result.scalar()


async def migrate():
    """Add api_import_schedule column if it doesn't exist."""
    async with engine.begin() as conn:
        logger.info("Checking if api_import_schedule column exists...")
        
        exists = await column_exists(conn, "organizations", "api_import_schedule")
        if exists:
            logger.info("✓ Column 'api_import_schedule' already exists. No migration needed.")
            return
        
        logger.info("Adding 'api_import_schedule' column to organizations table...")
        
        db_url = settings.get_database_url()
        if "sqlite" in db_url:
            # SQLite
            await conn.execute(
                text("ALTER TABLE organizations ADD COLUMN api_import_schedule VARCHAR")
            )
        else:
            # PostgreSQL
            await conn.execute(
                text("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS api_import_schedule VARCHAR")
            )
        
        logger.info("✓ Successfully added 'api_import_schedule' column to organizations table")


async def main():
    """Main migration function."""
    logger.info("=" * 60)
    logger.info("Migration: Add api_import_schedule column")
    logger.info("=" * 60)
    logger.info("")
    
    try:
        await migrate()
        logger.info("")
        logger.info("=" * 60)
        logger.info("Migration completed successfully!")
        logger.info("=" * 60)
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise


if __name__ == "__main__":
    asyncio.run(main())
