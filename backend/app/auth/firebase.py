"""
Firebase Admin SDK initialization and token verification.
"""

import os
import logging
from typing import Optional, Dict
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
_firebase_app = None
_firebase_auth = None

def initialize_firebase():
    """Initialize Firebase Admin SDK."""
    global _firebase_app, _firebase_auth
    
    if _firebase_app is not None:
        return  # Already initialized
    
    try:
        import firebase_admin
        from firebase_admin import credentials, auth
        
        # Get service account key path from environment
        service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY_PATH") or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        
        if not service_account_path:
            logger.warning("Firebase credentials not found. Authentication will be disabled.")
            logger.warning("Set FIREBASE_SERVICE_ACCOUNT_KEY_PATH or GOOGLE_APPLICATION_CREDENTIALS environment variable.")
            return
        
        if not os.path.exists(service_account_path):
            logger.warning(f"Firebase service account file not found at {service_account_path}")
            return
        
        # Initialize Firebase Admin SDK
        cred = credentials.Certificate(service_account_path)
        _firebase_app = firebase_admin.initialize_app(cred)
        _firebase_auth = auth
        logger.info("Firebase Admin SDK initialized successfully")
        
    except ImportError:
        logger.warning("firebase-admin package not installed. Install with: pip install firebase-admin")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase Admin SDK: {e}")


async def verify_firebase_token(token: str) -> Dict:
    """
    Verify Firebase ID token and return decoded token.
    
    Args:
        token: Firebase ID token from Authorization header
        
    Returns:
        Decoded token dictionary with user info (uid, email, etc.)
        
    Raises:
        HTTPException: If token is invalid or Firebase is not initialized
    """
    if _firebase_auth is None:
        # In development/local mode, allow bypassing auth if Firebase is not configured
        dev_mode = (
            os.getenv("ENVIRONMENT") == "development" or 
            os.getenv("DEV_MODE") == "true" or 
            not os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY_PATH")
        )
        if dev_mode:
            logger.warning("Firebase not initialized - allowing request in dev mode")
            # Extract email from token if it's a dev token
            if token and (token.startswith("dev-token") or token.startswith("Bearer dev-token")):
                return {"uid": "dev-user", "email": "dev@localhost"}
            # Allow any token in dev mode, or no token
            return {"uid": "dev-user", "email": "dev@localhost"}
        raise HTTPException(status_code=503, detail="Authentication service not available")
    
    try:
        # Remove "Bearer " prefix if present
        if token.startswith("Bearer "):
            token = token[7:]
        
        decoded_token = _firebase_auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication token")


def get_firebase_auth():
    """Get Firebase auth instance."""
    return _firebase_auth


# Initialize on import
initialize_firebase()

