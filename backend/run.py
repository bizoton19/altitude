#!/usr/bin/env python3
"""
Entry point for running the Altitude Recall Monitor backend.
"""

import uvicorn
from app.config import settings


def main():
    """Run the FastAPI server."""
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )


if __name__ == "__main__":
    main()
