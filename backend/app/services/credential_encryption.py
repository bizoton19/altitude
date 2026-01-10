"""
Credential Encryption Service
==============================
Handles encryption/decryption of sensitive credentials like portal passwords.
"""

import os
import base64
from cryptography.fernet import Fernet
from typing import Dict, Optional


class CredentialEncryption:
    """Service for encrypting and decrypting credentials."""
    
    def __init__(self):
        # Get encryption key from environment or generate one
        key = os.getenv("CREDENTIAL_ENCRYPTION_KEY")
        if not key:
            # In production, this should be set via environment variable
            # For development, generate a key (not secure for production!)
            key = Fernet.generate_key().decode()
            print("WARNING: Using auto-generated encryption key. Set CREDENTIAL_ENCRYPTION_KEY env var for production!")
        
        if isinstance(key, str):
            key = key.encode()
        
        self.cipher = Fernet(key)
    
    def encrypt_credentials(self, credentials: Dict[str, str]) -> Dict[str, str]:
        """Encrypt credential values in a dictionary."""
        encrypted = {}
        for key, value in credentials.items():
            if value:
                encrypted_value = self.cipher.encrypt(value.encode())
                encrypted[key] = base64.b64encode(encrypted_value).decode()
            else:
                encrypted[key] = value
        return encrypted
    
    def decrypt_credentials(self, encrypted_credentials: Dict[str, str]) -> Dict[str, str]:
        """Decrypt credential values in a dictionary."""
        decrypted = {}
        for key, value in encrypted_credentials.items():
            if value:
                try:
                    encrypted_bytes = base64.b64decode(value.encode())
                    decrypted_value = self.cipher.decrypt(encrypted_bytes)
                    decrypted[key] = decrypted_value.decode()
                except Exception as e:
                    print(f"Error decrypting {key}: {e}")
                    decrypted[key] = value  # Return as-is if decryption fails
            else:
                decrypted[key] = value
        return decrypted
    
    def encrypt_string(self, value: str) -> str:
        """Encrypt a single string value."""
        if not value:
            return value
        encrypted = self.cipher.encrypt(value.encode())
        return base64.b64encode(encrypted).decode()
    
    def decrypt_string(self, encrypted_value: str) -> str:
        """Decrypt a single string value."""
        if not encrypted_value:
            return encrypted_value
        try:
            encrypted_bytes = base64.b64decode(encrypted_value.encode())
            return self.cipher.decrypt(encrypted_bytes).decode()
        except Exception as e:
            print(f"Error decrypting string: {e}")
            return encrypted_value


# Global instance
credential_encryption = CredentialEncryption()



