"""
Database session management for SQLAlchemy.
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.config import settings
import logging
import os

logger = logging.getLogger(__name__)

# Create async engine with larger connection pool for concurrent imports
# Get the database URL (may be built from Cloud SQL settings)
database_url = settings.get_database_url()

# PostgreSQL connection args
connect_args = {}
if "sqlite" in database_url:
    # SQLite-specific connection args
    connect_args = {"check_same_thread": False}
elif "postgresql" in database_url:
    # PostgreSQL connection args
    # For Cloud SQL with public IP, SSL is required
    if settings.CLOUD_SQL_HOST and not settings.CLOUD_SQL_USE_UNIX_SOCKET:
        # Cloud SQL requires SSL for public IP connections
        connect_args = {
            "ssl": "require"  # Require SSL for Cloud SQL public IP connections
        }
    else:
        # For Unix socket connections, SSL not needed
        connect_args = {}

engine = create_async_engine(
    database_url,
    echo=settings.DEBUG,
    future=True,
    pool_size=20,  # Increased from default 5
    max_overflow=30,  # Increased from default 10
    pool_timeout=60,  # Increased timeout for connection acquisition
    pool_recycle=3600,  # Recycle connections after 1 hour
    connect_args=connect_args
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base class for declarative models
Base = declarative_base()


async def get_session():
    """
    Dependency function to get database session.
    Use with FastAPI Depends().
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_database():
    """
    Initialize database - create all tables.
    """
    # Import models to register them with Base
    from app.db import models
    
    async with engine.begin() as conn:
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created successfully")


async def close_database():
    """Close database connections."""
    await engine.dispose()
    logger.info("Database connections closed")

