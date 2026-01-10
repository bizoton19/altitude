"""
Search API Router
=================
Endpoints for searching marketplaces and analyzing listings.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List
import uuid
import asyncio
from datetime import datetime
import random

from app.models.marketplace import (
    MarketplaceSearchRequest, MarketplaceSearchResult, MarketplaceListing
)
from app.models.agent import SearchTask, TaskType, TaskStatus
from app.models.recall import Recall, RecallProduct
from app.models.violation import ProductViolation
from app.services import database as db
from app.skills.query_builder import build_search_query, build_search_variants
from app.skills.match_analyzer import calculate_match_score

router = APIRouter()


def violation_to_recall(violation: ProductViolation) -> Recall:
    """Convert a ProductViolation to a Recall for compatibility with query builder."""
    from app.models.recall import RecallImage, RecallHazard, RecallRemedy
    
    recall_products = [
        RecallProduct(
            name=product.name,
            description=product.description,
            model_number=product.model_number,
            manufacturer=product.manufacturer,
            upc=product.identifiers.get("UPC") if product.identifiers else None
        )
        for product in violation.products
    ]
    
    return Recall(
        recall_id=violation.violation_id,
        recall_number=violation.violation_number,
        title=violation.title,
        description=violation.description or "",
        recall_date=violation.violation_date,
        units_sold=None,
        injuries=violation.injuries,
        deaths=violation.deaths,
        incidents=violation.incidents,
        products=recall_products,
        images=[RecallImage(url=img.url, caption=img.caption) for img in violation.images],
        hazards=[RecallHazard(description=h.description, hazard_type=h.hazard_type) for h in violation.hazards],
        remedies=[RecallRemedy(description=r.description, remedy_type=r.remedy_type) for r in violation.remedies],
        source=violation.agency_name,
        source_url=violation.url,
        risk_level=violation.risk_level
    )


async def mock_marketplace_search(
    marketplace_id: str,
    marketplace_name: str,
    search_query: str,
    recall_id: str,
    recall
) -> List[MarketplaceListing]:
    """
    Mock marketplace search - simulates finding listings.
    In production, this would use actual marketplace APIs or web scraping.
    """
    # Simulate network delay
    await asyncio.sleep(random.uniform(0.5, 1.5))
    
    # Generate mock listings
    listings = []
    num_results = random.randint(0, 5)
    
    for i in range(num_results):
        # Get product info for realistic mock data
        product_name = recall.products[0].name if recall.products else "Unknown Product"
        
        # Calculate match score
        listing_title = f"{product_name} - Great Condition" if random.random() > 0.3 else f"Item similar to {product_name}"
        score, reasons = calculate_match_score(
            recall=recall,
            listing_title=listing_title,
            listing_description=f"Selling {product_name}. Works great!",
            listing_price=random.uniform(10, 200)
        )
        
        listing = MarketplaceListing(
            id=str(uuid.uuid4()),
            marketplace_id=marketplace_id,
            marketplace_name=marketplace_name,
            title=listing_title,
            description=f"Selling this {product_name}. Works perfectly, no issues.",
            price=round(random.uniform(15, 150), 2),
            currency="USD",
            listing_url=f"https://{marketplace_id}.com/listing/{uuid.uuid4().hex[:8]}",
            image_url=f"https://picsum.photos/seed/{uuid.uuid4().hex[:8]}/300/200",
            seller_name=f"seller_{random.randint(1000, 9999)}",
            seller_rating=round(random.uniform(3.5, 5.0), 1),
            recall_id=recall_id,
            match_score=score,
            match_reasons=reasons,
            found_at=datetime.utcnow()
        )
        listings.append(listing)
    
    return listings


@router.post("/marketplace", response_model=List[MarketplaceSearchResult])
async def search_marketplaces(request: MarketplaceSearchRequest):
    """
    Search enabled marketplaces for a recalled product.
    Returns listings found with match scores.
    Recalls are stored as violations with violation_type=RECALL.
    """
    # Get violation (recalls are a type of violation)
    violation = await db.get_violation(request.recall_id)
    if not violation:
        raise HTTPException(status_code=404, detail="Violation not found")
    
    # Convert violation to recall for query building
    recall = violation_to_recall(violation)
    
    # Build search query
    search_query = build_search_query(recall)
    
    # Get marketplaces to search
    if request.marketplace_ids:
        marketplaces = [
            await db.get_marketplace(mid) 
            for mid in request.marketplace_ids
        ]
        marketplaces = [m for m in marketplaces if m and m.enabled]
    else:
        all_marketplaces = await db.get_all_marketplaces()
        marketplaces = [m for m in all_marketplaces if m.enabled]
    
    if not marketplaces:
        raise HTTPException(status_code=400, detail="No enabled marketplaces to search")
    
    # Search each marketplace
    results = []
    for marketplace in marketplaces:
        start_time = datetime.utcnow()
        
        # Perform search (mock for now)
        listings = await mock_marketplace_search(
            marketplace_id=marketplace.id,
            marketplace_name=marketplace.name,
            search_query=search_query,
            recall_id=request.recall_id,
            recall=recall
        )
        
        # Save listings to database
        for listing in listings:
            await db.save_listing(listing)
        
        # Calculate duration
        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        results.append(MarketplaceSearchResult(
            recall_id=request.recall_id,
            marketplace_id=marketplace.id,
            marketplace_name=marketplace.name,
            listings=listings,
            search_duration_ms=duration_ms
        ))
    
    return results


@router.post("/task")
async def create_search_task(
    request: MarketplaceSearchRequest,
    background_tasks: BackgroundTasks
):
    """
    Create a background search task.
    Returns immediately with task ID for polling.
    """
    task = SearchTask(
        id=str(uuid.uuid4()),
        task_type=TaskType.SEARCH_MARKETPLACE,
        recall_id=request.recall_id,
        marketplace_ids=request.marketplace_ids
    )
    
    await db.create_task(task)
    
    # Schedule background execution
    background_tasks.add_task(execute_search_task, task.id)
    
    return {"task_id": task.id, "status": task.status.value}


async def execute_search_task(task_id: str):
    """Execute a search task in the background."""
    task = await db.get_task(task_id)
    if not task:
        return
    
    # Update status
    task.status = TaskStatus.RUNNING
    task.started_at = datetime.utcnow()
    
    try:
        # Perform search
        violation = await db.get_violation(task.recall_id)
        if violation:
            recall = violation_to_recall(violation)
            search_query = build_search_query(recall)
            
            if task.marketplace_ids:
                marketplaces = [await db.get_marketplace(mid) for mid in task.marketplace_ids]
            else:
                marketplaces = await db.get_all_marketplaces()
            
            marketplaces = [m for m in marketplaces if m and m.enabled]
            task.items_total = len(marketplaces)
            
            all_listings = []
            for i, marketplace in enumerate(marketplaces):
                listings = await mock_marketplace_search(
                    marketplace.id, marketplace.name, search_query, task.recall_id, recall
                )
                all_listings.extend(listings)
                
                for listing in listings:
                    await db.save_listing(listing)
                
                task.items_processed = i + 1
                task.progress = (i + 1) / len(marketplaces)
            
            task.result = {"listings_found": len(all_listings)}
        
        task.status = TaskStatus.COMPLETED
        
    except Exception as e:
        task.status = TaskStatus.FAILED
        task.error_message = str(e)
    
    task.completed_at = datetime.utcnow()


@router.get("/task/{task_id}")
async def get_task_status(task_id: str):
    """Get the status of a search task."""
    task = await db.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.get("/query-preview/{recall_id}")
async def preview_search_query(recall_id: str):
    """Preview the search queries that would be generated for a recall."""
    violation = await db.get_violation(recall_id)
    if not violation:
        raise HTTPException(status_code=404, detail="Violation not found")
    recall = violation_to_recall(violation)
    
    primary_query = build_search_query(recall)
    variants = build_search_variants(recall)
    
    return {
        "recall_id": recall_id,
        "primary_query": primary_query,
        "query_variants": variants
    }


@router.post("/visual")
async def visual_search(image_url: str, providers: list[str] = None):
    """
    Perform visual search for similar product images.
    Uses configured visual search providers (Google Vision, TinEye, etc.)
    """
    from app.services.visual_search import visual_search_service
    
    results = await visual_search_service.search(image_url, providers)
    
    # Convert to serializable format
    serialized = {
        provider: [r.to_dict() for r in provider_results]
        for provider, provider_results in results.items()
    }
    
    return serialized


@router.post("/visual/recall/{recall_id}")
async def visual_search_recall(recall_id: str):
    """
    Perform visual search using a recall images.
    Searches for similar products across visual search providers.
    """
    from app.services.visual_search import visual_search_service
    
    violation = await db.get_violation(recall_id)
    if not violation:
        raise HTTPException(status_code=404, detail="Violation not found")
    recall = violation_to_recall(violation)
    
    if not recall.images:
        raise HTTPException(status_code=400, detail="Recall has no images")
    
    # Search using the first image
    image_url = recall.images[0].url
    results = await visual_search_service.search_all(image_url)
    
    return {
        "recall_id": recall_id,
        "image_searched": image_url,
        "results": [r.to_dict() for r in results]
    }
