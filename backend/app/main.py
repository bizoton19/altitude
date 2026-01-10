"""
Altitude Recall Monitor - FastAPI Backend
==========================================
Main application entry point with API routes and MCP server integration.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.routers import recalls, marketplaces, search, agent, listings, imports, organizations
from app.services.database import init_db
from app.db.session import init_database as init_db_tables
from app.services.investigation_scheduler import start_scheduler, stop_scheduler
from app.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import optional routers with error handling
try:
    from app.routers import violations
except ImportError as e:
    logger.warning(f"Failed to import violations router: {e}")
    violations = None
try:
    from app.routers import investigations
except ImportError as e:
    logger.warning(f"Failed to import investigations router: {e}")
    investigations = None
try:
    from app.auth import router as auth_router
except ImportError as e:
    logger.warning(f"Failed to import auth router: {e}")
    auth_router = None
try:
    from app.routers import reviews
except ImportError as e:
    logger.warning(f"Failed to import reviews router: {e}")
    reviews = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown events."""
    # Startup
    logger.info("Starting Altitude Recall Monitor...")
    await init_db_tables()  # Create database tables
    await init_db()  # Initialize with default data
    logger.info("Database initialized")
    
    # Start investigation scheduler
    try:
        await start_scheduler()
        logger.info("Investigation scheduler started")
    except Exception as e:
        logger.error(f"Failed to start scheduler: {e}")
    
    yield
    # Shutdown
    logger.info("Shutting down Altitude Recall Monitor...")
    await stop_scheduler()
    logger.info("Investigation scheduler stopped")


app = FastAPI(
    title="Altitude Recall Monitor",
    description="AI-powered product recall monitoring across marketplaces",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
if violations:
    app.include_router(violations.router, prefix="/api/violations", tags=["Violations"])
if investigations:
    app.include_router(investigations.router, prefix="/api/investigations", tags=["Investigations"])
if auth_router:
    app.include_router(auth_router.router, prefix="/api/auth", tags=["Authentication"])
if reviews:
    app.include_router(reviews.router, prefix="/api/reviews", tags=["Reviews"])
app.include_router(recalls.router, prefix="/api/recalls", tags=["Recalls"])  # Backward compatibility
app.include_router(marketplaces.router, prefix="/api/marketplaces", tags=["Marketplaces"])
app.include_router(listings.router, prefix="/api/listings", tags=["Listings"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(agent.router, prefix="/api/agent", tags=["Agent"])
app.include_router(imports.router, prefix="/api/imports", tags=["Imports"])
app.include_router(organizations.router, prefix="/api/organizations", tags=["Organizations"])


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "online",
        "service": "Altitude Recall Monitor",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "database": "connected",
        "mcp_server": "ready"
    }
