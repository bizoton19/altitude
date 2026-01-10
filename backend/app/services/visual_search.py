"""
Visual Search Integration Service
=================================
Integration with visual search APIs for image-based product matching.
"""

import httpx
from typing import List, Dict, Any, Optional
import logging
import base64
from abc import ABC, abstractmethod

from app.config import settings

logger = logging.getLogger(__name__)


class VisualSearchResult:
    """Result from a visual search."""
    def __init__(
        self,
        source: str,
        match_url: str,
        confidence: float,
        title: Optional[str] = None,
        thumbnail_url: Optional[str] = None
    ):
        self.source = source
        self.match_url = match_url
        self.confidence = confidence
        self.title = title
        self.thumbnail_url = thumbnail_url
    
    def to_dict(self) -> dict:
        return {
            "source": self.source,
            "match_url": self.match_url,
            "confidence": self.confidence,
            "title": self.title,
            "thumbnail_url": self.thumbnail_url
        }


class VisualSearchProvider(ABC):
    """Base class for visual search providers."""
    
    @abstractmethod
    async def search_by_url(self, image_url: str) -> List[VisualSearchResult]:
        """Search for visually similar images by URL."""
        pass
    
    @abstractmethod
    async def search_by_image(self, image_data: bytes) -> List[VisualSearchResult]:
        """Search for visually similar images by image data."""
        pass


class GoogleVisionProvider(VisualSearchProvider):
    """Google Cloud Vision API integration."""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://vision.googleapis.com/v1"
    
    async def search_by_url(self, image_url: str) -> List[VisualSearchResult]:
        """Search using Google Cloud Vision API."""
        if not self.api_key:
            logger.warning("Google Vision API key not configured")
            return []
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/images:annotate",
                    params={"key": self.api_key},
                    json={
                        "requests": [{
                            "image": {"source": {"imageUri": image_url}},
                            "features": [
                                {"type": "WEB_DETECTION", "maxResults": 10},
                                {"type": "PRODUCT_SEARCH", "maxResults": 10}
                            ]
                        }]
                    }
                )
                response.raise_for_status()
                
                data = response.json()
                results = []
                
                # Parse web detection results
                web_detection = data.get("responses", [{}])[0].get("webDetection", {})
                
                for match in web_detection.get("pagesWithMatchingImages", []):
                    results.append(VisualSearchResult(
                        source="google_vision",
                        match_url=match.get("url", ""),
                        confidence=match.get("score", 0.5),
                        title=match.get("pageTitle", "")
                    ))
                
                return results[:10]
                
        except Exception as e:
            logger.error(f"Google Vision search error: {e}")
            return []
    
    async def search_by_image(self, image_data: bytes) -> List[VisualSearchResult]:
        """Search using base64 encoded image."""
        if not self.api_key:
            return []
        
        try:
            encoded = base64.b64encode(image_data).decode("utf-8")
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/images:annotate",
                    params={"key": self.api_key},
                    json={
                        "requests": [{
                            "image": {"content": encoded},
                            "features": [{"type": "WEB_DETECTION", "maxResults": 10}]
                        }]
                    }
                )
                response.raise_for_status()
                
                data = response.json()
                results = []
                
                web_detection = data.get("responses", [{}])[0].get("webDetection", {})
                for match in web_detection.get("pagesWithMatchingImages", []):
                    results.append(VisualSearchResult(
                        source="google_vision",
                        match_url=match.get("url", ""),
                        confidence=match.get("score", 0.5),
                        title=match.get("pageTitle", "")
                    ))
                
                return results[:10]
                
        except Exception as e:
            logger.error(f"Google Vision image search error: {e}")
            return []


class TinEyeProvider(VisualSearchProvider):
    """TinEye Reverse Image Search integration."""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.tineye.com/rest"
    
    async def search_by_url(self, image_url: str) -> List[VisualSearchResult]:
        """Search using TinEye API."""
        if not self.api_key:
            logger.warning("TinEye API key not configured")
            return []
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/search/",
                    params={"url": image_url},
                    headers={"x-api-key": self.api_key}
                )
                response.raise_for_status()
                
                data = response.json()
                results = []
                
                for match in data.get("results", {}).get("matches", []):
                    results.append(VisualSearchResult(
                        source="tineye",
                        match_url=match.get("backlinks", [{}])[0].get("url", ""),
                        confidence=match.get("score", 0) / 100,
                        title=match.get("backlinks", [{}])[0].get("title", ""),
                        thumbnail_url=match.get("image_url", "")
                    ))
                
                return results[:10]
                
        except Exception as e:
            logger.error(f"TinEye search error: {e}")
            return []
    
    async def search_by_image(self, image_data: bytes) -> List[VisualSearchResult]:
        """Search using uploaded image."""
        # TinEye requires multipart form upload
        if not self.api_key:
            return []
        
        # Placeholder - would need actual implementation
        return []


class MockVisualSearchProvider(VisualSearchProvider):
    """Mock provider for testing."""
    
    async def search_by_url(self, image_url: str) -> List[VisualSearchResult]:
        """Return mock results."""
        import random
        
        mock_platforms = ["ebay.com", "amazon.com", "facebook.com/marketplace", "mercari.com"]
        results = []
        
        for i in range(random.randint(0, 5)):
            platform = random.choice(mock_platforms)
            results.append(VisualSearchResult(
                source="mock",
                match_url=f"https://{platform}/item/{i}",
                confidence=random.uniform(0.5, 0.95),
                title=f"Similar product listing #{i+1}"
            ))
        
        return results
    
    async def search_by_image(self, image_data: bytes) -> List[VisualSearchResult]:
        """Return mock results."""
        return await self.search_by_url("mock://image")


class VisualSearchService:
    """Unified visual search service managing multiple providers."""
    
    def __init__(self):
        self.providers: Dict[str, VisualSearchProvider] = {}
        self._init_providers()
    
    def _init_providers(self):
        """Initialize configured providers."""
        # Google Vision
        if settings.GOOGLE_VISION_API_KEY:
            self.providers["google_vision"] = GoogleVisionProvider(settings.GOOGLE_VISION_API_KEY)
        
        # TinEye
        if settings.TINEYE_API_KEY:
            self.providers["tineye"] = TinEyeProvider(settings.TINEYE_API_KEY)
        
        # Always add mock for testing
        self.providers["mock"] = MockVisualSearchProvider()
    
    def add_provider(self, name: str, provider: VisualSearchProvider):
        """Add a provider dynamically."""
        self.providers[name] = provider
    
    async def search(
        self,
        image_url: str,
        providers: Optional[List[str]] = None
    ) -> Dict[str, List[VisualSearchResult]]:
        """
        Search for visually similar products across providers.
        
        Args:
            image_url: URL of the image to search
            providers: Optional list of providers to use (default: all)
        
        Returns:
            Dict mapping provider name to results
        """
        results = {}
        
        search_providers = providers or list(self.providers.keys())
        
        for provider_name in search_providers:
            if provider_name in self.providers:
                provider_results = await self.providers[provider_name].search_by_url(image_url)
                results[provider_name] = provider_results
        
        return results
    
    async def search_all(self, image_url: str) -> List[VisualSearchResult]:
        """Search all providers and aggregate results."""
        all_results = []
        
        for provider in self.providers.values():
            results = await provider.search_by_url(image_url)
            all_results.extend(results)
        
        # Sort by confidence
        all_results.sort(key=lambda r: r.confidence, reverse=True)
        
        return all_results


# Singleton service
visual_search_service = VisualSearchService()



Visual Search Integration Service
=================================
Integration with visual search APIs for image-based product matching.
"""

import httpx
from typing import List, Dict, Any, Optional
import logging
import base64
from abc import ABC, abstractmethod

from app.config import settings

logger = logging.getLogger(__name__)


class VisualSearchResult:
    """Result from a visual search."""
    def __init__(
        self,
        source: str,
        match_url: str,
        confidence: float,
        title: Optional[str] = None,
        thumbnail_url: Optional[str] = None
    ):
        self.source = source
        self.match_url = match_url
        self.confidence = confidence
        self.title = title
        self.thumbnail_url = thumbnail_url
    
    def to_dict(self) -> dict:
        return {
            "source": self.source,
            "match_url": self.match_url,
            "confidence": self.confidence,
            "title": self.title,
            "thumbnail_url": self.thumbnail_url
        }


class VisualSearchProvider(ABC):
    """Base class for visual search providers."""
    
    @abstractmethod
    async def search_by_url(self, image_url: str) -> List[VisualSearchResult]:
        """Search for visually similar images by URL."""
        pass
    
    @abstractmethod
    async def search_by_image(self, image_data: bytes) -> List[VisualSearchResult]:
        """Search for visually similar images by image data."""
        pass


class GoogleVisionProvider(VisualSearchProvider):
    """Google Cloud Vision API integration."""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://vision.googleapis.com/v1"
    
    async def search_by_url(self, image_url: str) -> List[VisualSearchResult]:
        """Search using Google Cloud Vision API."""
        if not self.api_key:
            logger.warning("Google Vision API key not configured")
            return []
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/images:annotate",
                    params={"key": self.api_key},
                    json={
                        "requests": [{
                            "image": {"source": {"imageUri": image_url}},
                            "features": [
                                {"type": "WEB_DETECTION", "maxResults": 10},
                                {"type": "PRODUCT_SEARCH", "maxResults": 10}
                            ]
                        }]
                    }
                )
                response.raise_for_status()
                
                data = response.json()
                results = []
                
                # Parse web detection results
                web_detection = data.get("responses", [{}])[0].get("webDetection", {})
                
                for match in web_detection.get("pagesWithMatchingImages", []):
                    results.append(VisualSearchResult(
                        source="google_vision",
                        match_url=match.get("url", ""),
                        confidence=match.get("score", 0.5),
                        title=match.get("pageTitle", "")
                    ))
                
                return results[:10]
                
        except Exception as e:
            logger.error(f"Google Vision search error: {e}")
            return []
    
    async def search_by_image(self, image_data: bytes) -> List[VisualSearchResult]:
        """Search using base64 encoded image."""
        if not self.api_key:
            return []
        
        try:
            encoded = base64.b64encode(image_data).decode("utf-8")
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/images:annotate",
                    params={"key": self.api_key},
                    json={
                        "requests": [{
                            "image": {"content": encoded},
                            "features": [{"type": "WEB_DETECTION", "maxResults": 10}]
                        }]
                    }
                )
                response.raise_for_status()
                
                data = response.json()
                results = []
                
                web_detection = data.get("responses", [{}])[0].get("webDetection", {})
                for match in web_detection.get("pagesWithMatchingImages", []):
                    results.append(VisualSearchResult(
                        source="google_vision",
                        match_url=match.get("url", ""),
                        confidence=match.get("score", 0.5),
                        title=match.get("pageTitle", "")
                    ))
                
                return results[:10]
                
        except Exception as e:
            logger.error(f"Google Vision image search error: {e}")
            return []


class TinEyeProvider(VisualSearchProvider):
    """TinEye Reverse Image Search integration."""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.tineye.com/rest"
    
    async def search_by_url(self, image_url: str) -> List[VisualSearchResult]:
        """Search using TinEye API."""
        if not self.api_key:
            logger.warning("TinEye API key not configured")
            return []
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/search/",
                    params={"url": image_url},
                    headers={"x-api-key": self.api_key}
                )
                response.raise_for_status()
                
                data = response.json()
                results = []
                
                for match in data.get("results", {}).get("matches", []):
                    results.append(VisualSearchResult(
                        source="tineye",
                        match_url=match.get("backlinks", [{}])[0].get("url", ""),
                        confidence=match.get("score", 0) / 100,
                        title=match.get("backlinks", [{}])[0].get("title", ""),
                        thumbnail_url=match.get("image_url", "")
                    ))
                
                return results[:10]
                
        except Exception as e:
            logger.error(f"TinEye search error: {e}")
            return []
    
    async def search_by_image(self, image_data: bytes) -> List[VisualSearchResult]:
        """Search using uploaded image."""
        # TinEye requires multipart form upload
        if not self.api_key:
            return []
        
        # Placeholder - would need actual implementation
        return []


class MockVisualSearchProvider(VisualSearchProvider):
    """Mock provider for testing."""
    
    async def search_by_url(self, image_url: str) -> List[VisualSearchResult]:
        """Return mock results."""
        import random
        
        mock_platforms = ["ebay.com", "amazon.com", "facebook.com/marketplace", "mercari.com"]
        results = []
        
        for i in range(random.randint(0, 5)):
            platform = random.choice(mock_platforms)
            results.append(VisualSearchResult(
                source="mock",
                match_url=f"https://{platform}/item/{i}",
                confidence=random.uniform(0.5, 0.95),
                title=f"Similar product listing #{i+1}"
            ))
        
        return results
    
    async def search_by_image(self, image_data: bytes) -> List[VisualSearchResult]:
        """Return mock results."""
        return await self.search_by_url("mock://image")


class VisualSearchService:
    """Unified visual search service managing multiple providers."""
    
    def __init__(self):
        self.providers: Dict[str, VisualSearchProvider] = {}
        self._init_providers()
    
    def _init_providers(self):
        """Initialize configured providers."""
        # Google Vision
        if settings.GOOGLE_VISION_API_KEY:
            self.providers["google_vision"] = GoogleVisionProvider(settings.GOOGLE_VISION_API_KEY)
        
        # TinEye
        if settings.TINEYE_API_KEY:
            self.providers["tineye"] = TinEyeProvider(settings.TINEYE_API_KEY)
        
        # Always add mock for testing
        self.providers["mock"] = MockVisualSearchProvider()
    
    def add_provider(self, name: str, provider: VisualSearchProvider):
        """Add a provider dynamically."""
        self.providers[name] = provider
    
    async def search(
        self,
        image_url: str,
        providers: Optional[List[str]] = None
    ) -> Dict[str, List[VisualSearchResult]]:
        """
        Search for visually similar products across providers.
        
        Args:
            image_url: URL of the image to search
            providers: Optional list of providers to use (default: all)
        
        Returns:
            Dict mapping provider name to results
        """
        results = {}
        
        search_providers = providers or list(self.providers.keys())
        
        for provider_name in search_providers:
            if provider_name in self.providers:
                provider_results = await self.providers[provider_name].search_by_url(image_url)
                results[provider_name] = provider_results
        
        return results
    
    async def search_all(self, image_url: str) -> List[VisualSearchResult]:
        """Search all providers and aggregate results."""
        all_results = []
        
        for provider in self.providers.values():
            results = await provider.search_by_url(image_url)
            all_results.extend(results)
        
        # Sort by confidence
        all_results.sort(key=lambda r: r.confidence, reverse=True)
        
        return all_results


# Singleton service
visual_search_service = VisualSearchService()




Visual Search Integration Service
=================================
Integration with visual search APIs for image-based product matching.
"""

import httpx
from typing import List, Dict, Any, Optional
import logging
import base64
from abc import ABC, abstractmethod

from app.config import settings

logger = logging.getLogger(__name__)


class VisualSearchResult:
    """Result from a visual search."""
    def __init__(
        self,
        source: str,
        match_url: str,
        confidence: float,
        title: Optional[str] = None,
        thumbnail_url: Optional[str] = None
    ):
        self.source = source
        self.match_url = match_url
        self.confidence = confidence
        self.title = title
        self.thumbnail_url = thumbnail_url
    
    def to_dict(self) -> dict:
        return {
            "source": self.source,
            "match_url": self.match_url,
            "confidence": self.confidence,
            "title": self.title,
            "thumbnail_url": self.thumbnail_url
        }


class VisualSearchProvider(ABC):
    """Base class for visual search providers."""
    
    @abstractmethod
    async def search_by_url(self, image_url: str) -> List[VisualSearchResult]:
        """Search for visually similar images by URL."""
        pass
    
    @abstractmethod
    async def search_by_image(self, image_data: bytes) -> List[VisualSearchResult]:
        """Search for visually similar images by image data."""
        pass


class GoogleVisionProvider(VisualSearchProvider):
    """Google Cloud Vision API integration."""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://vision.googleapis.com/v1"
    
    async def search_by_url(self, image_url: str) -> List[VisualSearchResult]:
        """Search using Google Cloud Vision API."""
        if not self.api_key:
            logger.warning("Google Vision API key not configured")
            return []
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/images:annotate",
                    params={"key": self.api_key},
                    json={
                        "requests": [{
                            "image": {"source": {"imageUri": image_url}},
                            "features": [
                                {"type": "WEB_DETECTION", "maxResults": 10},
                                {"type": "PRODUCT_SEARCH", "maxResults": 10}
                            ]
                        }]
                    }
                )
                response.raise_for_status()
                
                data = response.json()
                results = []
                
                # Parse web detection results
                web_detection = data.get("responses", [{}])[0].get("webDetection", {})
                
                for match in web_detection.get("pagesWithMatchingImages", []):
                    results.append(VisualSearchResult(
                        source="google_vision",
                        match_url=match.get("url", ""),
                        confidence=match.get("score", 0.5),
                        title=match.get("pageTitle", "")
                    ))
                
                return results[:10]
                
        except Exception as e:
            logger.error(f"Google Vision search error: {e}")
            return []
    
    async def search_by_image(self, image_data: bytes) -> List[VisualSearchResult]:
        """Search using base64 encoded image."""
        if not self.api_key:
            return []
        
        try:
            encoded = base64.b64encode(image_data).decode("utf-8")
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/images:annotate",
                    params={"key": self.api_key},
                    json={
                        "requests": [{
                            "image": {"content": encoded},
                            "features": [{"type": "WEB_DETECTION", "maxResults": 10}]
                        }]
                    }
                )
                response.raise_for_status()
                
                data = response.json()
                results = []
                
                web_detection = data.get("responses", [{}])[0].get("webDetection", {})
                for match in web_detection.get("pagesWithMatchingImages", []):
                    results.append(VisualSearchResult(
                        source="google_vision",
                        match_url=match.get("url", ""),
                        confidence=match.get("score", 0.5),
                        title=match.get("pageTitle", "")
                    ))
                
                return results[:10]
                
        except Exception as e:
            logger.error(f"Google Vision image search error: {e}")
            return []


class TinEyeProvider(VisualSearchProvider):
    """TinEye Reverse Image Search integration."""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.tineye.com/rest"
    
    async def search_by_url(self, image_url: str) -> List[VisualSearchResult]:
        """Search using TinEye API."""
        if not self.api_key:
            logger.warning("TinEye API key not configured")
            return []
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/search/",
                    params={"url": image_url},
                    headers={"x-api-key": self.api_key}
                )
                response.raise_for_status()
                
                data = response.json()
                results = []
                
                for match in data.get("results", {}).get("matches", []):
                    results.append(VisualSearchResult(
                        source="tineye",
                        match_url=match.get("backlinks", [{}])[0].get("url", ""),
                        confidence=match.get("score", 0) / 100,
                        title=match.get("backlinks", [{}])[0].get("title", ""),
                        thumbnail_url=match.get("image_url", "")
                    ))
                
                return results[:10]
                
        except Exception as e:
            logger.error(f"TinEye search error: {e}")
            return []
    
    async def search_by_image(self, image_data: bytes) -> List[VisualSearchResult]:
        """Search using uploaded image."""
        # TinEye requires multipart form upload
        if not self.api_key:
            return []
        
        # Placeholder - would need actual implementation
        return []


class MockVisualSearchProvider(VisualSearchProvider):
    """Mock provider for testing."""
    
    async def search_by_url(self, image_url: str) -> List[VisualSearchResult]:
        """Return mock results."""
        import random
        
        mock_platforms = ["ebay.com", "amazon.com", "facebook.com/marketplace", "mercari.com"]
        results = []
        
        for i in range(random.randint(0, 5)):
            platform = random.choice(mock_platforms)
            results.append(VisualSearchResult(
                source="mock",
                match_url=f"https://{platform}/item/{i}",
                confidence=random.uniform(0.5, 0.95),
                title=f"Similar product listing #{i+1}"
            ))
        
        return results
    
    async def search_by_image(self, image_data: bytes) -> List[VisualSearchResult]:
        """Return mock results."""
        return await self.search_by_url("mock://image")


class VisualSearchService:
    """Unified visual search service managing multiple providers."""
    
    def __init__(self):
        self.providers: Dict[str, VisualSearchProvider] = {}
        self._init_providers()
    
    def _init_providers(self):
        """Initialize configured providers."""
        # Google Vision
        if settings.GOOGLE_VISION_API_KEY:
            self.providers["google_vision"] = GoogleVisionProvider(settings.GOOGLE_VISION_API_KEY)
        
        # TinEye
        if settings.TINEYE_API_KEY:
            self.providers["tineye"] = TinEyeProvider(settings.TINEYE_API_KEY)
        
        # Always add mock for testing
        self.providers["mock"] = MockVisualSearchProvider()
    
    def add_provider(self, name: str, provider: VisualSearchProvider):
        """Add a provider dynamically."""
        self.providers[name] = provider
    
    async def search(
        self,
        image_url: str,
        providers: Optional[List[str]] = None
    ) -> Dict[str, List[VisualSearchResult]]:
        """
        Search for visually similar products across providers.
        
        Args:
            image_url: URL of the image to search
            providers: Optional list of providers to use (default: all)
        
        Returns:
            Dict mapping provider name to results
        """
        results = {}
        
        search_providers = providers or list(self.providers.keys())
        
        for provider_name in search_providers:
            if provider_name in self.providers:
                provider_results = await self.providers[provider_name].search_by_url(image_url)
                results[provider_name] = provider_results
        
        return results
    
    async def search_all(self, image_url: str) -> List[VisualSearchResult]:
        """Search all providers and aggregate results."""
        all_results = []
        
        for provider in self.providers.values():
            results = await provider.search_by_url(image_url)
            all_results.extend(results)
        
        # Sort by confidence
        all_results.sort(key=lambda r: r.confidence, reverse=True)
        
        return all_results


# Singleton service
visual_search_service = VisualSearchService()



Visual Search Integration Service
=================================
Integration with visual search APIs for image-based product matching.
"""

import httpx
from typing import List, Dict, Any, Optional
import logging
import base64
from abc import ABC, abstractmethod

from app.config import settings

logger = logging.getLogger(__name__)


class VisualSearchResult:
    """Result from a visual search."""
    def __init__(
        self,
        source: str,
        match_url: str,
        confidence: float,
        title: Optional[str] = None,
        thumbnail_url: Optional[str] = None
    ):
        self.source = source
        self.match_url = match_url
        self.confidence = confidence
        self.title = title
        self.thumbnail_url = thumbnail_url
    
    def to_dict(self) -> dict:
        return {
            "source": self.source,
            "match_url": self.match_url,
            "confidence": self.confidence,
            "title": self.title,
            "thumbnail_url": self.thumbnail_url
        }


class VisualSearchProvider(ABC):
    """Base class for visual search providers."""
    
    @abstractmethod
    async def search_by_url(self, image_url: str) -> List[VisualSearchResult]:
        """Search for visually similar images by URL."""
        pass
    
    @abstractmethod
    async def search_by_image(self, image_data: bytes) -> List[VisualSearchResult]:
        """Search for visually similar images by image data."""
        pass


class GoogleVisionProvider(VisualSearchProvider):
    """Google Cloud Vision API integration."""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://vision.googleapis.com/v1"
    
    async def search_by_url(self, image_url: str) -> List[VisualSearchResult]:
        """Search using Google Cloud Vision API."""
        if not self.api_key:
            logger.warning("Google Vision API key not configured")
            return []
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/images:annotate",
                    params={"key": self.api_key},
                    json={
                        "requests": [{
                            "image": {"source": {"imageUri": image_url}},
                            "features": [
                                {"type": "WEB_DETECTION", "maxResults": 10},
                                {"type": "PRODUCT_SEARCH", "maxResults": 10}
                            ]
                        }]
                    }
                )
                response.raise_for_status()
                
                data = response.json()
                results = []
                
                # Parse web detection results
                web_detection = data.get("responses", [{}])[0].get("webDetection", {})
                
                for match in web_detection.get("pagesWithMatchingImages", []):
                    results.append(VisualSearchResult(
                        source="google_vision",
                        match_url=match.get("url", ""),
                        confidence=match.get("score", 0.5),
                        title=match.get("pageTitle", "")
                    ))
                
                return results[:10]
                
        except Exception as e:
            logger.error(f"Google Vision search error: {e}")
            return []
    
    async def search_by_image(self, image_data: bytes) -> List[VisualSearchResult]:
        """Search using base64 encoded image."""
        if not self.api_key:
            return []
        
        try:
            encoded = base64.b64encode(image_data).decode("utf-8")
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/images:annotate",
                    params={"key": self.api_key},
                    json={
                        "requests": [{
                            "image": {"content": encoded},
                            "features": [{"type": "WEB_DETECTION", "maxResults": 10}]
                        }]
                    }
                )
                response.raise_for_status()
                
                data = response.json()
                results = []
                
                web_detection = data.get("responses", [{}])[0].get("webDetection", {})
                for match in web_detection.get("pagesWithMatchingImages", []):
                    results.append(VisualSearchResult(
                        source="google_vision",
                        match_url=match.get("url", ""),
                        confidence=match.get("score", 0.5),
                        title=match.get("pageTitle", "")
                    ))
                
                return results[:10]
                
        except Exception as e:
            logger.error(f"Google Vision image search error: {e}")
            return []


class TinEyeProvider(VisualSearchProvider):
    """TinEye Reverse Image Search integration."""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.tineye.com/rest"
    
    async def search_by_url(self, image_url: str) -> List[VisualSearchResult]:
        """Search using TinEye API."""
        if not self.api_key:
            logger.warning("TinEye API key not configured")
            return []
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/search/",
                    params={"url": image_url},
                    headers={"x-api-key": self.api_key}
                )
                response.raise_for_status()
                
                data = response.json()
                results = []
                
                for match in data.get("results", {}).get("matches", []):
                    results.append(VisualSearchResult(
                        source="tineye",
                        match_url=match.get("backlinks", [{}])[0].get("url", ""),
                        confidence=match.get("score", 0) / 100,
                        title=match.get("backlinks", [{}])[0].get("title", ""),
                        thumbnail_url=match.get("image_url", "")
                    ))
                
                return results[:10]
                
        except Exception as e:
            logger.error(f"TinEye search error: {e}")
            return []
    
    async def search_by_image(self, image_data: bytes) -> List[VisualSearchResult]:
        """Search using uploaded image."""
        # TinEye requires multipart form upload
        if not self.api_key:
            return []
        
        # Placeholder - would need actual implementation
        return []


class MockVisualSearchProvider(VisualSearchProvider):
    """Mock provider for testing."""
    
    async def search_by_url(self, image_url: str) -> List[VisualSearchResult]:
        """Return mock results."""
        import random
        
        mock_platforms = ["ebay.com", "amazon.com", "facebook.com/marketplace", "mercari.com"]
        results = []
        
        for i in range(random.randint(0, 5)):
            platform = random.choice(mock_platforms)
            results.append(VisualSearchResult(
                source="mock",
                match_url=f"https://{platform}/item/{i}",
                confidence=random.uniform(0.5, 0.95),
                title=f"Similar product listing #{i+1}"
            ))
        
        return results
    
    async def search_by_image(self, image_data: bytes) -> List[VisualSearchResult]:
        """Return mock results."""
        return await self.search_by_url("mock://image")


class VisualSearchService:
    """Unified visual search service managing multiple providers."""
    
    def __init__(self):
        self.providers: Dict[str, VisualSearchProvider] = {}
        self._init_providers()
    
    def _init_providers(self):
        """Initialize configured providers."""
        # Google Vision
        if settings.GOOGLE_VISION_API_KEY:
            self.providers["google_vision"] = GoogleVisionProvider(settings.GOOGLE_VISION_API_KEY)
        
        # TinEye
        if settings.TINEYE_API_KEY:
            self.providers["tineye"] = TinEyeProvider(settings.TINEYE_API_KEY)
        
        # Always add mock for testing
        self.providers["mock"] = MockVisualSearchProvider()
    
    def add_provider(self, name: str, provider: VisualSearchProvider):
        """Add a provider dynamically."""
        self.providers[name] = provider
    
    async def search(
        self,
        image_url: str,
        providers: Optional[List[str]] = None
    ) -> Dict[str, List[VisualSearchResult]]:
        """
        Search for visually similar products across providers.
        
        Args:
            image_url: URL of the image to search
            providers: Optional list of providers to use (default: all)
        
        Returns:
            Dict mapping provider name to results
        """
        results = {}
        
        search_providers = providers or list(self.providers.keys())
        
        for provider_name in search_providers:
            if provider_name in self.providers:
                provider_results = await self.providers[provider_name].search_by_url(image_url)
                results[provider_name] = provider_results
        
        return results
    
    async def search_all(self, image_url: str) -> List[VisualSearchResult]:
        """Search all providers and aggregate results."""
        all_results = []
        
        for provider in self.providers.values():
            results = await provider.search_by_url(image_url)
            all_results.extend(results)
        
        # Sort by confidence
        all_results.sort(key=lambda r: r.confidence, reverse=True)
        
        return all_results


# Singleton service
visual_search_service = VisualSearchService()




