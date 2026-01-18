"""
Application configuration settings.
"""

from pydantic_settings import BaseSettings
from typing import List
import os
from urllib.parse import quote_plus


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    
    # Database
    # For PostgreSQL: postgresql+asyncpg://user:password@localhost:5432/altitude
    # For Google Cloud SQL (Unix socket): postgresql+asyncpg://user:password@/database?host=/cloudsql/PROJECT:REGION:INSTANCE
    # For Google Cloud SQL (IP): postgresql+asyncpg://user:password@IP:5432/database
    # For SQLite: sqlite+aiosqlite:///./altitude.db
    DATABASE_URL: str = "sqlite+aiosqlite:///./altitude.db"
    
    # Google Cloud SQL settings (optional, can override DATABASE_URL)
    CLOUD_SQL_INSTANCE: str = ""  # Format: PROJECT:REGION:INSTANCE
    CLOUD_SQL_DATABASE: str = "postgres"  # Default PostgreSQL database name
    CLOUD_SQL_USER: str = ""
    CLOUD_SQL_PASSWORD: str = ""
    CLOUD_SQL_USE_UNIX_SOCKET: bool = True  # Use Unix socket if True, IP if False
    CLOUD_SQL_HOST: str = ""  # Optional: Direct IP address or hostname (overrides localhost)
    CLOUD_SQL_PORT: int = 5432  # Port number (default 5432)
    
    def get_database_url(self) -> str:
        """Get the database URL, building from Cloud SQL settings if provided."""
        # If Cloud SQL settings are provided, build the connection string
        if self.CLOUD_SQL_INSTANCE and self.CLOUD_SQL_USER and self.CLOUD_SQL_PASSWORD:
            # URL encode password to handle special characters
            encoded_password = quote_plus(self.CLOUD_SQL_PASSWORD)
            encoded_user = quote_plus(self.CLOUD_SQL_USER)
            
            if self.CLOUD_SQL_USE_UNIX_SOCKET:
                # Unix socket connection (recommended for GCP)
                return f"postgresql+asyncpg://{encoded_user}:{encoded_password}@/{self.CLOUD_SQL_DATABASE}?host=/cloudsql/{self.CLOUD_SQL_INSTANCE}"
            else:
                # IP connection - use CLOUD_SQL_HOST if provided, otherwise use instance connection name
                # If CLOUD_SQL_HOST is set, use it directly (for public IP)
                # Otherwise, this assumes Cloud SQL Proxy is running on localhost
                host = self.CLOUD_SQL_HOST if self.CLOUD_SQL_HOST else "localhost"
                return f"postgresql+asyncpg://{encoded_user}:{encoded_password}@{host}:{self.CLOUD_SQL_PORT}/{self.CLOUD_SQL_DATABASE}"
        
        # Otherwise, use the DATABASE_URL as-is
        return self.DATABASE_URL
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]
    
    # CPSC API
    CPSC_API_BASE_URL: str = "https://www.saferproducts.gov/RestWebServices"
    
    # External API Keys (loaded from .env)
    GOOGLE_VISION_API_KEY: str = ""
    TINEYE_API_KEY: str = ""
    OPENAI_API_KEY: str = ""  # For LLM-powered field mapping
    
    # Agent settings
    DEFAULT_SEARCH_FREQUENCY: int = 60  # minutes
    DEFAULT_SEARCH_DEPTH: int = 3  # pages
    DEFAULT_MATCH_SENSITIVITY: float = 0.7  # 0-1
    
    # File upload settings
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
    UPLOAD_MAX_SIZE_MB: int = 1024  # 1GB default max file size
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

# Override DATABASE_URL if Cloud SQL settings are provided
if settings.CLOUD_SQL_INSTANCE and settings.CLOUD_SQL_USER and settings.CLOUD_SQL_PASSWORD:
    settings.DATABASE_URL = settings.get_database_url()
