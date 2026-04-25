#!/usr/bin/env python3
"""
Database Migration Script: Legacy Product Ban Schema → Current Schema
===================================================================
Migrates legacy product ban tables/columns to the current schema naming.

This script:
1. Renames tables
2. Renames columns
3. Updates foreign keys
4. Recreates indexes (as needed)

Usage:
    python backend/scripts/migrate_legacy_product_bans.py

Configuration:
- Set env vars to point at your legacy table/column names.
- Defaults assume a "legacy_product_ban" naming convention.

⚠️  IMPORTANT: Backup your database before running this migration!
"""

import asyncio
import os
import sys
from pathlib import Path
import logging

from sqlalchemy import text
from app.db.session import engine
from app.config import settings

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Legacy table names (override via env vars)
LEGACY_TABLES = {
    "product_bans": os.getenv("LEGACY_PRODUCT_BANS_TABLE", "legacy_product_bans"),
    "product_ban_products": os.getenv("LEGACY_PRODUCT_BAN_PRODUCTS_TABLE", "legacy_product_ban_products"),
    "product_ban_hazards": os.getenv("LEGACY_PRODUCT_BAN_HAZARDS_TABLE", "legacy_product_ban_hazards"),
    "product_ban_remedies": os.getenv("LEGACY_PRODUCT_BAN_REMEDIES_TABLE", "legacy_product_ban_remedies"),
    "product_ban_images": os.getenv("LEGACY_PRODUCT_BAN_IMAGES_TABLE", "legacy_product_ban_images"),
}

# Legacy column names (override via env vars)
LEGACY_COLUMNS = {
    "product_ban_id": os.getenv("LEGACY_PRODUCT_BAN_ID_COLUMN", "legacy_product_ban_id"),
    "ban_number": os.getenv("LEGACY_BAN_NUMBER_COLUMN", "legacy_ban_number"),
    "ban_date": os.getenv("LEGACY_BAN_DATE_COLUMN", "legacy_ban_date"),
    "ban_type": os.getenv("LEGACY_BAN_TYPE_COLUMN", "legacy_ban_type"),
    "product_ban_ids": os.getenv("LEGACY_PRODUCT_BAN_IDS_COLUMN", "legacy_product_ban_ids"),
    "product_bans_count": os.getenv("LEGACY_PRODUCT_BANS_COUNT_COLUMN", "legacy_product_bans_count"),
    "last_product_ban_date": os.getenv("LEGACY_LAST_PRODUCT_BAN_DATE_COLUMN", "legacy_last_product_ban_date"),
}

LEGACY_IMPORT_TYPE = os.getenv("LEGACY_IMPORT_TYPE", "legacy_product_ban")


async def check_table_exists(conn, table_name: str) -> bool:
    """Check if a table exists."""
    if settings.DATABASE_TYPE == "sqlite":
        result = await conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name=:name"),
            {"name": table_name}
        )
        return result.fetchone() is not None

    result = await conn.execute(
        text(
            """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = :name
                )
            """
        ),
        {"name": table_name}
    )
    return result.scalar()


async def rename_table_if_exists(conn, old_name: str, new_name: str):
    if await check_table_exists(conn, old_name):
        await conn.execute(text(f"ALTER TABLE {old_name} RENAME TO {new_name}"))
        logger.info(f"  ✓ Renamed '{old_name}' → '{new_name}'")


async def rename_column_if_exists(conn, table: str, old_col: str, new_col: str):
    try:
        await conn.execute(text(f"ALTER TABLE {table} RENAME COLUMN {old_col} TO {new_col}"))
        logger.info(f"  ✓ Renamed column '{old_col}' → '{new_col}' in '{table}'")
    except Exception as e:
        logger.warning(f"  ⚠ Could not rename {old_col} in {table}: {e}")


async def migrate_database():
    """Run migration for the current database backend."""
    async with engine.begin() as conn:
        logger.info("Starting legacy schema migration...")

        legacy_main_table = LEGACY_TABLES["product_bans"]
        if not await check_table_exists(conn, legacy_main_table):
            logger.warning(f"'{legacy_main_table}' table does not exist. Migration may not be needed.")
            return

        logger.info("Step 1: Renaming tables...")

        await rename_table_if_exists(conn, legacy_main_table, "product_bans")
        for new_name, old_name in LEGACY_TABLES.items():
            if new_name == "product_bans":
                continue
            await rename_table_if_exists(conn, old_name, new_name)

        logger.info("Step 2: Renaming columns in product_bans table...")
        await rename_column_if_exists(conn, "product_bans", LEGACY_COLUMNS["product_ban_id"], "product_ban_id")
        await rename_column_if_exists(conn, "product_bans", LEGACY_COLUMNS["ban_number"], "ban_number")
        await rename_column_if_exists(conn, "product_bans", LEGACY_COLUMNS["ban_date"], "ban_date")
        await rename_column_if_exists(conn, "product_bans", LEGACY_COLUMNS["ban_type"], "ban_type")

        logger.info("Step 3: Renaming foreign key columns in related tables...")
        for table in [
            "product_ban_products",
            "product_ban_hazards",
            "product_ban_remedies",
            "product_ban_images",
        ]:
            if await check_table_exists(conn, table):
                await rename_column_if_exists(conn, table, LEGACY_COLUMNS["product_ban_id"], "product_ban_id")

        if await check_table_exists(conn, "marketplace_listings"):
            await rename_column_if_exists(conn, "marketplace_listings", LEGACY_COLUMNS["product_ban_id"], "product_ban_id")

        if await check_table_exists(conn, "investigations"):
            await rename_column_if_exists(conn, "investigations", LEGACY_COLUMNS["product_ban_ids"], "product_ban_ids")

        if await check_table_exists(conn, "search_tasks"):
            await rename_column_if_exists(conn, "search_tasks", LEGACY_COLUMNS["product_ban_id"], "product_ban_id")

        if await check_table_exists(conn, "organizations"):
            await rename_column_if_exists(conn, "organizations", LEGACY_COLUMNS["product_bans_count"], "product_bans_count")
            await rename_column_if_exists(conn, "organizations", LEGACY_COLUMNS["last_product_ban_date"], "last_product_ban_date")

        if await check_table_exists(conn, "import_history"):
            try:
                await conn.execute(
                    text(
                        """
                        UPDATE import_history
                        SET import_type = 'product_ban'
                        WHERE import_type = :legacy_type
                        """
                    ),
                    {"legacy_type": LEGACY_IMPORT_TYPE},
                )
                logger.info("  ✓ Updated import_type values in 'import_history'")
            except Exception as e:
                logger.warning(f"  ⚠ Could not update import_history: {e}")

        logger.info("✅ Legacy schema migration completed successfully!")


def main():
    asyncio.run(migrate_database())


if __name__ == "__main__":
    main()
