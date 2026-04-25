"""
Database session management for SQLAlchemy.
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.config import settings
import logging
import os
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

logger = logging.getLogger(__name__)

def _normalize_database_url(raw_url: str) -> tuple[str, dict]:
    """
    Normalize env-provided database URL for SQLAlchemy async engine.

    Accepts postgres URLs like `postgresql://...` and converts to
    `postgresql+asyncpg://...`. Also maps `sslmode=require` to asyncpg connect args.
    """
    connect_args = {}
    database_url = raw_url

    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    if "postgresql+asyncpg://" in database_url:
        parsed = urlparse(database_url)
        query = dict(parse_qsl(parsed.query, keep_blank_values=True))
        sslmode = query.pop("sslmode", None)
        if sslmode == "require":
            connect_args["ssl"] = "require"
        database_url = urlunparse(parsed._replace(query=urlencode(query)))

    return database_url, connect_args


# Create async engine with larger connection pool for concurrent imports
# Get and normalize database URL (may be built from Cloud SQL settings)
raw_database_url = settings.get_database_url()
database_url, normalized_connect_args = _normalize_database_url(raw_database_url)

# PostgreSQL connection args
connect_args = dict(normalized_connect_args)
if "sqlite" in database_url:
    # SQLite-specific connection args
    connect_args = {"check_same_thread": False}
elif "postgresql" in database_url:
    # PostgreSQL connection args
    # For Cloud SQL with public IP, SSL is required
    if settings.CLOUD_SQL_HOST and not settings.CLOUD_SQL_USE_UNIX_SOCKET:
        # Cloud SQL requires SSL for public IP connections
        connect_args["ssl"] = "require"  # Require SSL for Cloud SQL public IP connections
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


def _sqlite_apply_migrations(sync_conn):
    """
    SQLite: add columns missing from older DB files.
    SQLAlchemy create_all() does not ALTER existing tables, so new ORM fields
    must be added explicitly for local/dev SQLite databases.
    """
    from sqlalchemy import inspect, text

    insp = inspect(sync_conn)
    if "organizations" not in insp.get_table_names():
        return

    existing = {c["name"] for c in insp.get_columns("organizations")}
    # Keep in sync with OrganizationDB in app.db.models
    additions = [
        ("product_bans_count", "INTEGER DEFAULT 0"),
        ("last_product_ban_date", "DATETIME"),
        ("voluntary_recalls_count", "INTEGER DEFAULT 0"),
        ("joint_recalls_count", "INTEGER DEFAULT 0"),
    ]
    for col_name, ddl in additions:
        if col_name not in existing:
            sync_conn.execute(text(f"ALTER TABLE organizations ADD COLUMN {col_name} {ddl}"))
            logger.info("SQLite migration: added organizations.%s", col_name)


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
        if "sqlite" in database_url:
            await conn.run_sync(_sqlite_apply_migrations)
        logger.info("Database tables created successfully")


async def close_database():
    """Close database connections."""
    await engine.dispose()
    logger.info("Database connections closed")

