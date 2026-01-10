"""
CPSC API Integration
====================
Service for fetching recalls from the Consumer Product Safety Commission API.
https://www.saferproducts.gov/RestWebServices
"""

import httpx
from typing import List, Optional
from datetime import datetime, timedelta
import logging

from app.config import settings
from app.models.recall import Recall, RecallImage, RecallProduct, RecallHazard, RecallRemedy
from app.skills.risk_classifier import classify_recall

logger = logging.getLogger(__name__)


class CPSCApiClient:
    """Client for the CPSC REST API."""
    
    BASE_URL = "https://www.saferproducts.gov/RestWebServices"
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    async def fetch_recalls(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        product_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Recall]:
        """
        Fetch recalls from the CPSC API.
        
        Args:
            start_date: Filter recalls from this date
            end_date: Filter recalls until this date
            product_type: Filter by product type
            limit: Maximum number of recalls to return
        
        Returns:
            List of parsed Recall objects
        """
        params = {
            "format": "json",
            "RecallDateStart": (start_date or datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d"),
        }
        
        if end_date:
            params["RecallDateEnd"] = end_date.strftime("%Y-%m-%d")
        
        if product_type:
            params["ProductType"] = product_type
        
        try:
            response = await self.client.get(
                f"{self.BASE_URL}/Recall",
                params=params
            )
            response.raise_for_status()
            
            data = response.json()
            recalls = []
            
            for item in data[:limit]:
                recall = self._parse_cpsc_recall(item)
                if recall:
                    recall = await classify_recall(recall)
                    recalls.append(recall)
            
            logger.info(f"Fetched {len(recalls)} recalls from CPSC API")
            return recalls
            
        except httpx.HTTPError as e:
            logger.error(f"CPSC API error: {e}")
            return []
        except Exception as e:
            logger.error(f"Error parsing CPSC data: {e}")
            return []
    
    async def search_recalls(self, query: str, limit: int = 50) -> List[Recall]:
        """
        Search recalls by keyword.
        
        Args:
            query: Search query
            limit: Maximum results
        
        Returns:
            List of matching recalls
        """
        try:
            response = await self.client.get(
                f"{self.BASE_URL}/Recall",
                params={
                    "format": "json",
                    "RecallTitle": query
                }
            )
            response.raise_for_status()
            
            data = response.json()
            recalls = []
            
            for item in data[:limit]:
                recall = self._parse_cpsc_recall(item)
                if recall:
                    recall = await classify_recall(recall)
                    recalls.append(recall)
            
            return recalls
            
        except Exception as e:
            logger.error(f"CPSC search error: {e}")
            return []
    
    async def get_recall_by_number(self, recall_number: str) -> Optional[Recall]:
        """
        Get a specific recall by its number.
        
        Args:
            recall_number: The CPSC recall number
        
        Returns:
            Recall object if found, None otherwise
        """
        try:
            response = await self.client.get(
                f"{self.BASE_URL}/Recall",
                params={
                    "format": "json",
                    "RecallNumber": recall_number
                }
            )
            response.raise_for_status()
            
            data = response.json()
            if data:
                recall = self._parse_cpsc_recall(data[0])
                if recall:
                    return await classify_recall(recall)
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching recall {recall_number}: {e}")
            return None
    
    def _parse_cpsc_recall(self, data: dict) -> Optional[Recall]:
        """Parse a CPSC API response into a Recall model."""
        try:
            recall_number = data.get("RecallNumber", "")
            recall_id = f"cpsc-{recall_number}"
            
            # Parse products
            products = []
            for p in data.get("Products", []):
                products.append(RecallProduct(
                    name=p.get("Name", "Unknown"),
                    description=p.get("Description", ""),
                    model_number=p.get("Model", ""),
                    manufacturer=data.get("Manufacturers", [{}])[0].get("Name", "") if data.get("Manufacturers") else ""
                ))
            
            # Parse images
            images = []
            for img in data.get("Images", []):
                url = img.get("URL", "")
                if url:
                    images.append(RecallImage(url=url))
            
            # Parse hazards
            hazards = []
            for h in data.get("Hazards", []):
                hazards.append(RecallHazard(
                    description=h.get("Name", ""),
                    hazard_type=h.get("HazardType", "")
                ))
            
            # Parse remedies
            remedies = []
            for r in data.get("Remedies", []):
                remedies.append(RecallRemedy(
                    description=r.get("Name", "")
                ))
            
            # Parse date
            recall_date = datetime.now()
            date_str = data.get("RecallDate", "")
            if date_str:
                try:
                    recall_date = datetime.strptime(date_str, "%Y-%m-%d")
                except:
                    pass
            
            # Parse units
            units_str = data.get("NumberOfUnits", "0")
            units = 0
            if units_str:
                try:
                    units = int(str(units_str).replace(",", "").replace("About", "").strip())
                except:
                    pass
            
            return Recall(
                recall_id=recall_id,
                recall_number=recall_number,
                title=data.get("Title", f"Recall {recall_number}"),
                description=data.get("Description", ""),
                recall_date=recall_date,
                units_sold=units,
                injuries=self._safe_int(data.get("Injuries")),
                deaths=self._safe_int(data.get("Deaths")),
                incidents=self._safe_int(data.get("Incidents")),
                products=products,
                images=images,
                hazards=hazards,
                remedies=remedies,
                source="CPSC",
                source_url=data.get("URL", "")
            )
            
        except Exception as e:
            logger.error(f"Error parsing CPSC recall: {e}")
            return None
    
    def _safe_int(self, value) -> int:
        """Safely convert a value to int."""
        if value is None:
            return 0
        try:
            return int(str(value).replace(",", ""))
        except:
            return 0


# Singleton instance
cpsc_client = CPSCApiClient()



CPSC API Integration
====================
Service for fetching recalls from the Consumer Product Safety Commission API.
https://www.saferproducts.gov/RestWebServices
"""

import httpx
from typing import List, Optional
from datetime import datetime, timedelta
import logging

from app.config import settings
from app.models.recall import Recall, RecallImage, RecallProduct, RecallHazard, RecallRemedy
from app.skills.risk_classifier import classify_recall

logger = logging.getLogger(__name__)


class CPSCApiClient:
    """Client for the CPSC REST API."""
    
    BASE_URL = "https://www.saferproducts.gov/RestWebServices"
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    async def fetch_recalls(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        product_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Recall]:
        """
        Fetch recalls from the CPSC API.
        
        Args:
            start_date: Filter recalls from this date
            end_date: Filter recalls until this date
            product_type: Filter by product type
            limit: Maximum number of recalls to return
        
        Returns:
            List of parsed Recall objects
        """
        params = {
            "format": "json",
            "RecallDateStart": (start_date or datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d"),
        }
        
        if end_date:
            params["RecallDateEnd"] = end_date.strftime("%Y-%m-%d")
        
        if product_type:
            params["ProductType"] = product_type
        
        try:
            response = await self.client.get(
                f"{self.BASE_URL}/Recall",
                params=params
            )
            response.raise_for_status()
            
            data = response.json()
            recalls = []
            
            for item in data[:limit]:
                recall = self._parse_cpsc_recall(item)
                if recall:
                    recall = await classify_recall(recall)
                    recalls.append(recall)
            
            logger.info(f"Fetched {len(recalls)} recalls from CPSC API")
            return recalls
            
        except httpx.HTTPError as e:
            logger.error(f"CPSC API error: {e}")
            return []
        except Exception as e:
            logger.error(f"Error parsing CPSC data: {e}")
            return []
    
    async def search_recalls(self, query: str, limit: int = 50) -> List[Recall]:
        """
        Search recalls by keyword.
        
        Args:
            query: Search query
            limit: Maximum results
        
        Returns:
            List of matching recalls
        """
        try:
            response = await self.client.get(
                f"{self.BASE_URL}/Recall",
                params={
                    "format": "json",
                    "RecallTitle": query
                }
            )
            response.raise_for_status()
            
            data = response.json()
            recalls = []
            
            for item in data[:limit]:
                recall = self._parse_cpsc_recall(item)
                if recall:
                    recall = await classify_recall(recall)
                    recalls.append(recall)
            
            return recalls
            
        except Exception as e:
            logger.error(f"CPSC search error: {e}")
            return []
    
    async def get_recall_by_number(self, recall_number: str) -> Optional[Recall]:
        """
        Get a specific recall by its number.
        
        Args:
            recall_number: The CPSC recall number
        
        Returns:
            Recall object if found, None otherwise
        """
        try:
            response = await self.client.get(
                f"{self.BASE_URL}/Recall",
                params={
                    "format": "json",
                    "RecallNumber": recall_number
                }
            )
            response.raise_for_status()
            
            data = response.json()
            if data:
                recall = self._parse_cpsc_recall(data[0])
                if recall:
                    return await classify_recall(recall)
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching recall {recall_number}: {e}")
            return None
    
    def _parse_cpsc_recall(self, data: dict) -> Optional[Recall]:
        """Parse a CPSC API response into a Recall model."""
        try:
            recall_number = data.get("RecallNumber", "")
            recall_id = f"cpsc-{recall_number}"
            
            # Parse products
            products = []
            for p in data.get("Products", []):
                products.append(RecallProduct(
                    name=p.get("Name", "Unknown"),
                    description=p.get("Description", ""),
                    model_number=p.get("Model", ""),
                    manufacturer=data.get("Manufacturers", [{}])[0].get("Name", "") if data.get("Manufacturers") else ""
                ))
            
            # Parse images
            images = []
            for img in data.get("Images", []):
                url = img.get("URL", "")
                if url:
                    images.append(RecallImage(url=url))
            
            # Parse hazards
            hazards = []
            for h in data.get("Hazards", []):
                hazards.append(RecallHazard(
                    description=h.get("Name", ""),
                    hazard_type=h.get("HazardType", "")
                ))
            
            # Parse remedies
            remedies = []
            for r in data.get("Remedies", []):
                remedies.append(RecallRemedy(
                    description=r.get("Name", "")
                ))
            
            # Parse date
            recall_date = datetime.now()
            date_str = data.get("RecallDate", "")
            if date_str:
                try:
                    recall_date = datetime.strptime(date_str, "%Y-%m-%d")
                except:
                    pass
            
            # Parse units
            units_str = data.get("NumberOfUnits", "0")
            units = 0
            if units_str:
                try:
                    units = int(str(units_str).replace(",", "").replace("About", "").strip())
                except:
                    pass
            
            return Recall(
                recall_id=recall_id,
                recall_number=recall_number,
                title=data.get("Title", f"Recall {recall_number}"),
                description=data.get("Description", ""),
                recall_date=recall_date,
                units_sold=units,
                injuries=self._safe_int(data.get("Injuries")),
                deaths=self._safe_int(data.get("Deaths")),
                incidents=self._safe_int(data.get("Incidents")),
                products=products,
                images=images,
                hazards=hazards,
                remedies=remedies,
                source="CPSC",
                source_url=data.get("URL", "")
            )
            
        except Exception as e:
            logger.error(f"Error parsing CPSC recall: {e}")
            return None
    
    def _safe_int(self, value) -> int:
        """Safely convert a value to int."""
        if value is None:
            return 0
        try:
            return int(str(value).replace(",", ""))
        except:
            return 0


# Singleton instance
cpsc_client = CPSCApiClient()




CPSC API Integration
====================
Service for fetching recalls from the Consumer Product Safety Commission API.
https://www.saferproducts.gov/RestWebServices
"""

import httpx
from typing import List, Optional
from datetime import datetime, timedelta
import logging

from app.config import settings
from app.models.recall import Recall, RecallImage, RecallProduct, RecallHazard, RecallRemedy
from app.skills.risk_classifier import classify_recall

logger = logging.getLogger(__name__)


class CPSCApiClient:
    """Client for the CPSC REST API."""
    
    BASE_URL = "https://www.saferproducts.gov/RestWebServices"
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    async def fetch_recalls(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        product_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Recall]:
        """
        Fetch recalls from the CPSC API.
        
        Args:
            start_date: Filter recalls from this date
            end_date: Filter recalls until this date
            product_type: Filter by product type
            limit: Maximum number of recalls to return
        
        Returns:
            List of parsed Recall objects
        """
        params = {
            "format": "json",
            "RecallDateStart": (start_date or datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d"),
        }
        
        if end_date:
            params["RecallDateEnd"] = end_date.strftime("%Y-%m-%d")
        
        if product_type:
            params["ProductType"] = product_type
        
        try:
            response = await self.client.get(
                f"{self.BASE_URL}/Recall",
                params=params
            )
            response.raise_for_status()
            
            data = response.json()
            recalls = []
            
            for item in data[:limit]:
                recall = self._parse_cpsc_recall(item)
                if recall:
                    recall = await classify_recall(recall)
                    recalls.append(recall)
            
            logger.info(f"Fetched {len(recalls)} recalls from CPSC API")
            return recalls
            
        except httpx.HTTPError as e:
            logger.error(f"CPSC API error: {e}")
            return []
        except Exception as e:
            logger.error(f"Error parsing CPSC data: {e}")
            return []
    
    async def search_recalls(self, query: str, limit: int = 50) -> List[Recall]:
        """
        Search recalls by keyword.
        
        Args:
            query: Search query
            limit: Maximum results
        
        Returns:
            List of matching recalls
        """
        try:
            response = await self.client.get(
                f"{self.BASE_URL}/Recall",
                params={
                    "format": "json",
                    "RecallTitle": query
                }
            )
            response.raise_for_status()
            
            data = response.json()
            recalls = []
            
            for item in data[:limit]:
                recall = self._parse_cpsc_recall(item)
                if recall:
                    recall = await classify_recall(recall)
                    recalls.append(recall)
            
            return recalls
            
        except Exception as e:
            logger.error(f"CPSC search error: {e}")
            return []
    
    async def get_recall_by_number(self, recall_number: str) -> Optional[Recall]:
        """
        Get a specific recall by its number.
        
        Args:
            recall_number: The CPSC recall number
        
        Returns:
            Recall object if found, None otherwise
        """
        try:
            response = await self.client.get(
                f"{self.BASE_URL}/Recall",
                params={
                    "format": "json",
                    "RecallNumber": recall_number
                }
            )
            response.raise_for_status()
            
            data = response.json()
            if data:
                recall = self._parse_cpsc_recall(data[0])
                if recall:
                    return await classify_recall(recall)
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching recall {recall_number}: {e}")
            return None
    
    def _parse_cpsc_recall(self, data: dict) -> Optional[Recall]:
        """Parse a CPSC API response into a Recall model."""
        try:
            recall_number = data.get("RecallNumber", "")
            recall_id = f"cpsc-{recall_number}"
            
            # Parse products
            products = []
            for p in data.get("Products", []):
                products.append(RecallProduct(
                    name=p.get("Name", "Unknown"),
                    description=p.get("Description", ""),
                    model_number=p.get("Model", ""),
                    manufacturer=data.get("Manufacturers", [{}])[0].get("Name", "") if data.get("Manufacturers") else ""
                ))
            
            # Parse images
            images = []
            for img in data.get("Images", []):
                url = img.get("URL", "")
                if url:
                    images.append(RecallImage(url=url))
            
            # Parse hazards
            hazards = []
            for h in data.get("Hazards", []):
                hazards.append(RecallHazard(
                    description=h.get("Name", ""),
                    hazard_type=h.get("HazardType", "")
                ))
            
            # Parse remedies
            remedies = []
            for r in data.get("Remedies", []):
                remedies.append(RecallRemedy(
                    description=r.get("Name", "")
                ))
            
            # Parse date
            recall_date = datetime.now()
            date_str = data.get("RecallDate", "")
            if date_str:
                try:
                    recall_date = datetime.strptime(date_str, "%Y-%m-%d")
                except:
                    pass
            
            # Parse units
            units_str = data.get("NumberOfUnits", "0")
            units = 0
            if units_str:
                try:
                    units = int(str(units_str).replace(",", "").replace("About", "").strip())
                except:
                    pass
            
            return Recall(
                recall_id=recall_id,
                recall_number=recall_number,
                title=data.get("Title", f"Recall {recall_number}"),
                description=data.get("Description", ""),
                recall_date=recall_date,
                units_sold=units,
                injuries=self._safe_int(data.get("Injuries")),
                deaths=self._safe_int(data.get("Deaths")),
                incidents=self._safe_int(data.get("Incidents")),
                products=products,
                images=images,
                hazards=hazards,
                remedies=remedies,
                source="CPSC",
                source_url=data.get("URL", "")
            )
            
        except Exception as e:
            logger.error(f"Error parsing CPSC recall: {e}")
            return None
    
    def _safe_int(self, value) -> int:
        """Safely convert a value to int."""
        if value is None:
            return 0
        try:
            return int(str(value).replace(",", ""))
        except:
            return 0


# Singleton instance
cpsc_client = CPSCApiClient()



CPSC API Integration
====================
Service for fetching recalls from the Consumer Product Safety Commission API.
https://www.saferproducts.gov/RestWebServices
"""

import httpx
from typing import List, Optional
from datetime import datetime, timedelta
import logging

from app.config import settings
from app.models.recall import Recall, RecallImage, RecallProduct, RecallHazard, RecallRemedy
from app.skills.risk_classifier import classify_recall

logger = logging.getLogger(__name__)


class CPSCApiClient:
    """Client for the CPSC REST API."""
    
    BASE_URL = "https://www.saferproducts.gov/RestWebServices"
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    async def fetch_recalls(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        product_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Recall]:
        """
        Fetch recalls from the CPSC API.
        
        Args:
            start_date: Filter recalls from this date
            end_date: Filter recalls until this date
            product_type: Filter by product type
            limit: Maximum number of recalls to return
        
        Returns:
            List of parsed Recall objects
        """
        params = {
            "format": "json",
            "RecallDateStart": (start_date or datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d"),
        }
        
        if end_date:
            params["RecallDateEnd"] = end_date.strftime("%Y-%m-%d")
        
        if product_type:
            params["ProductType"] = product_type
        
        try:
            response = await self.client.get(
                f"{self.BASE_URL}/Recall",
                params=params
            )
            response.raise_for_status()
            
            data = response.json()
            recalls = []
            
            for item in data[:limit]:
                recall = self._parse_cpsc_recall(item)
                if recall:
                    recall = await classify_recall(recall)
                    recalls.append(recall)
            
            logger.info(f"Fetched {len(recalls)} recalls from CPSC API")
            return recalls
            
        except httpx.HTTPError as e:
            logger.error(f"CPSC API error: {e}")
            return []
        except Exception as e:
            logger.error(f"Error parsing CPSC data: {e}")
            return []
    
    async def search_recalls(self, query: str, limit: int = 50) -> List[Recall]:
        """
        Search recalls by keyword.
        
        Args:
            query: Search query
            limit: Maximum results
        
        Returns:
            List of matching recalls
        """
        try:
            response = await self.client.get(
                f"{self.BASE_URL}/Recall",
                params={
                    "format": "json",
                    "RecallTitle": query
                }
            )
            response.raise_for_status()
            
            data = response.json()
            recalls = []
            
            for item in data[:limit]:
                recall = self._parse_cpsc_recall(item)
                if recall:
                    recall = await classify_recall(recall)
                    recalls.append(recall)
            
            return recalls
            
        except Exception as e:
            logger.error(f"CPSC search error: {e}")
            return []
    
    async def get_recall_by_number(self, recall_number: str) -> Optional[Recall]:
        """
        Get a specific recall by its number.
        
        Args:
            recall_number: The CPSC recall number
        
        Returns:
            Recall object if found, None otherwise
        """
        try:
            response = await self.client.get(
                f"{self.BASE_URL}/Recall",
                params={
                    "format": "json",
                    "RecallNumber": recall_number
                }
            )
            response.raise_for_status()
            
            data = response.json()
            if data:
                recall = self._parse_cpsc_recall(data[0])
                if recall:
                    return await classify_recall(recall)
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching recall {recall_number}: {e}")
            return None
    
    def _parse_cpsc_recall(self, data: dict) -> Optional[Recall]:
        """Parse a CPSC API response into a Recall model."""
        try:
            recall_number = data.get("RecallNumber", "")
            recall_id = f"cpsc-{recall_number}"
            
            # Parse products
            products = []
            for p in data.get("Products", []):
                products.append(RecallProduct(
                    name=p.get("Name", "Unknown"),
                    description=p.get("Description", ""),
                    model_number=p.get("Model", ""),
                    manufacturer=data.get("Manufacturers", [{}])[0].get("Name", "") if data.get("Manufacturers") else ""
                ))
            
            # Parse images
            images = []
            for img in data.get("Images", []):
                url = img.get("URL", "")
                if url:
                    images.append(RecallImage(url=url))
            
            # Parse hazards
            hazards = []
            for h in data.get("Hazards", []):
                hazards.append(RecallHazard(
                    description=h.get("Name", ""),
                    hazard_type=h.get("HazardType", "")
                ))
            
            # Parse remedies
            remedies = []
            for r in data.get("Remedies", []):
                remedies.append(RecallRemedy(
                    description=r.get("Name", "")
                ))
            
            # Parse date
            recall_date = datetime.now()
            date_str = data.get("RecallDate", "")
            if date_str:
                try:
                    recall_date = datetime.strptime(date_str, "%Y-%m-%d")
                except:
                    pass
            
            # Parse units
            units_str = data.get("NumberOfUnits", "0")
            units = 0
            if units_str:
                try:
                    units = int(str(units_str).replace(",", "").replace("About", "").strip())
                except:
                    pass
            
            return Recall(
                recall_id=recall_id,
                recall_number=recall_number,
                title=data.get("Title", f"Recall {recall_number}"),
                description=data.get("Description", ""),
                recall_date=recall_date,
                units_sold=units,
                injuries=self._safe_int(data.get("Injuries")),
                deaths=self._safe_int(data.get("Deaths")),
                incidents=self._safe_int(data.get("Incidents")),
                products=products,
                images=images,
                hazards=hazards,
                remedies=remedies,
                source="CPSC",
                source_url=data.get("URL", "")
            )
            
        except Exception as e:
            logger.error(f"Error parsing CPSC recall: {e}")
            return None
    
    def _safe_int(self, value) -> int:
        """Safely convert a value to int."""
        if value is None:
            return 0
        try:
            return int(str(value).replace(",", ""))
        except:
            return 0


# Singleton instance
cpsc_client = CPSCApiClient()




