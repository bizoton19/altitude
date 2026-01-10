#!/usr/bin/env python3
"""
Test script to verify Google Cloud SQL connection and schema creation.
"""

import asyncio
import sys
from app.config import settings
from app.db.session import engine, init_database
from app.services.database import init_db
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_connection():
    """Test database connection and schema creation."""
    try:
        logger.info("=" * 60)
        logger.info("Testing Google Cloud SQL Connection")
        logger.info("=" * 60)
        
        # Display connection info (without password)
        database_url = settings.get_database_url()
        # Mask password in URL for logging
        if "@" in database_url:
            parts = database_url.split("@")
            if len(parts) == 2:
                user_pass = parts[0].split("://")[1] if "://" in parts[0] else parts[0]
                if ":" in user_pass:
                    user = user_pass.split(":")[0]
                    masked_url = database_url.replace(user_pass, f"{user}:***")
                    logger.info(f"Database URL: {masked_url}")
                else:
                    logger.info(f"Database URL: {database_url.split('@')[0]}@***")
            else:
                logger.info(f"Database URL: {database_url.split('@')[0]}@***")
        else:
            logger.info(f"Database URL: {database_url}")
        
        logger.info(f"Cloud SQL Instance: {settings.CLOUD_SQL_INSTANCE}")
        logger.info(f"Database: {settings.CLOUD_SQL_DATABASE}")
        logger.info(f"User: {settings.CLOUD_SQL_USER}")
        logger.info(f"Use Unix Socket: {settings.CLOUD_SQL_USE_UNIX_SOCKET}")
        logger.info("")
        
        # Test connection
        logger.info("Testing database connection...")
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT version();"))
            version = result.scalar()
            logger.info(f"✅ Connected successfully!")
            logger.info(f"   Database version: {version}")
        
        # Create schema
        logger.info("")
        logger.info("Creating database schema...")
        await init_database()
        logger.info("✅ Schema created successfully!")
        
        # Initialize seed data
        logger.info("")
        logger.info("Initializing seed data...")
        await init_db()
        logger.info("✅ Seed data initialized successfully!")
        
        logger.info("")
        logger.info("=" * 60)
        logger.info("✅ All tests passed! Database is ready to use.")
        logger.info("=" * 60)
        
        return True
        
    except Exception as e:
        logger.error("")
        logger.error("=" * 60)
        logger.error("❌ Connection test failed!")
        logger.error("=" * 60)
        logger.error(f"Error: {type(e).__name__}: {str(e)}")
        logger.error("")
        logger.error("Troubleshooting:")
        logger.error("1. Verify Cloud SQL instance is running")
        logger.error("2. Check that credentials are correct in .env file")
        logger.error("3. If running locally, ensure Cloud SQL Proxy is running")
        logger.error("4. If running on GCP, verify service account permissions")
        logger.error("5. Check network connectivity to Cloud SQL instance")
        logger.error("")
        import traceback
        logger.error(traceback.format_exc())
        return False
    finally:
        await engine.dispose()


if __name__ == "__main__":
    success = asyncio.run(test_connection())
    sys.exit(0 if success else 1)

