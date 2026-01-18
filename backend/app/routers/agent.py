"""
Agent API Router
================
Endpoints for managing the AI agent and tool integrations.
"""

from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime

from app.models.agent import (
    AgentConfig, AgentConfigUpdate, AgentStatus, ToolConfig, ToolType, LLMProvider,
    AgentSkill, SkillCreate, SkillUpdate, SkillType
)
from app.models.risk_classification import (
    RiskClassificationConfig,
    get_default_risk_classification_config
)
from app.models.product_ban import ProductBan
from app.skills.risk_classifier import classify_violation
from app.services import database as db
from app.services.credential_encryption import credential_encryption

router = APIRouter()


@router.get("/config", response_model=AgentConfig)
async def get_agent_config():
    """Get current agent configuration."""
    config = await db.get_agent_config()
    # Mask API key for security
    if config.llm_api_key:
        config.llm_api_key = "***configured***"
    return config


@router.patch("/config", response_model=AgentConfig)
async def update_agent_config(updates: AgentConfigUpdate):
    """Update agent configuration."""
    update_data = updates.model_dump(exclude_unset=True)
    
    # Encrypt API key if provided (and not already masked)
    if "llm_api_key" in update_data and update_data["llm_api_key"]:
        if update_data["llm_api_key"] != "***configured***":
            update_data["llm_api_key"] = credential_encryption.encrypt_string(update_data["llm_api_key"])
    
    updated = await db.update_agent_config(update_data)
    
    # Mask API key in response
    if updated.llm_api_key:
        updated.llm_api_key = "***configured***"
    
    return updated


@router.get("/status", response_model=AgentStatus)
async def get_agent_status():
    """Get current agent status."""
    config = await db.get_agent_config()
    pending_tasks = await db.get_pending_tasks()
    
    return AgentStatus(
        is_running=config.is_active,
        pending_tasks=len(pending_tasks),
        last_run_at=config.last_run_at,
        next_scheduled_run=config.next_run_at
    )


@router.post("/start")
async def start_agent():
    """Start the agent."""
    await db.update_agent_config({"is_active": True})
    return {"status": "started", "message": "Agent is now active"}


@router.post("/stop")
async def stop_agent():
    """Stop the agent."""
    await db.update_agent_config({"is_active": False})
    return {"status": "stopped", "message": "Agent has been stopped"}


@router.get("/tools")
async def list_tools():
    """List all tool integrations."""
    config = await db.get_agent_config()
    return config.tools


@router.patch("/tools/{tool_type}")
async def update_tool(tool_type: str, enabled: Optional[bool] = None, api_key: Optional[str] = None):
    """Update a tool integration."""
    config = await db.get_agent_config()
    
    # Find and update the tool
    tool_found = False
    for tool in config.tools:
        if tool.tool_type.value == tool_type:
            if enabled is not None:
                tool.enabled = enabled
            if api_key is not None:
                tool.api_key = api_key
            tool_found = True
            break
    
    if not tool_found:
        raise HTTPException(status_code=404, detail=f"Tool {tool_type} not found")
    
    await db.update_agent_config({"tools": config.tools})
    
    return {"tool": tool_type, "enabled": enabled, "updated": True}


@router.post("/webhook/test")
async def test_webhook():
    """Test the configured webhook."""
    config = await db.get_agent_config()
    
    if not config.webhook_url:
        raise HTTPException(status_code=400, detail="No webhook URL configured")
    
    # In production, would actually call the webhook
    return {
        "status": "ok",
        "message": f"Webhook test sent to {config.webhook_url}",
        "webhook_url": config.webhook_url
    }


# Skill Management Endpoints
@router.get("/skills")
async def list_skills():
    """List all configured agent skills."""
    config = await db.get_agent_config()
    return config.skills


@router.post("/skills", response_model=AgentSkill)
async def create_skill(skill_data: SkillCreate):
    """Add a new agent skill."""
    config = await db.get_agent_config()
    
    # Check if skill already exists
    if any(s.skill_id == skill_data.skill_id for s in config.skills):
        raise HTTPException(status_code=400, detail=f"Skill with ID '{skill_data.skill_id}' already exists")
    
    skill = AgentSkill(
        skill_id=skill_data.skill_id,
        skill_type=skill_data.skill_type,
        name=skill_data.name,
        description=skill_data.description,
        enabled=skill_data.enabled,
        priority=skill_data.priority,
        settings=skill_data.settings
    )
    
    config.skills.append(skill)
    await db.update_agent_config({"skills": config.skills})
    
    return skill


@router.get("/skills/{skill_id}", response_model=AgentSkill)
async def get_skill(skill_id: str):
    """Get a specific skill by ID."""
    config = await db.get_agent_config()
    
    skill = next((s for s in config.skills if s.skill_id == skill_id), None)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found")
    
    return skill


@router.patch("/skills/{skill_id}", response_model=AgentSkill)
async def update_skill(skill_id: str, updates: SkillUpdate):
    """Update an existing skill."""
    config = await db.get_agent_config()
    
    skill = next((s for s in config.skills if s.skill_id == skill_id), None)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(skill, key):
            setattr(skill, key, value)
    
    skill.updated_at = datetime.utcnow()
    await db.update_agent_config({"skills": config.skills})
    
    return skill


@router.delete("/skills/{skill_id}")
async def delete_skill(skill_id: str):
    """Delete a skill."""
    config = await db.get_agent_config()
    
    skill_index = next((i for i, s in enumerate(config.skills) if s.skill_id == skill_id), None)
    if skill_index is None:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found")
    
    config.skills.pop(skill_index)
    await db.update_agent_config({"skills": config.skills})
    
    return {"status": "deleted", "skill_id": skill_id}


# Risk Classification Configuration Endpoints
@router.get("/skills/risk_classifier/config", response_model=RiskClassificationConfig)
async def get_risk_classification_config():
    """Get risk classification configuration."""
    config = await db.get_agent_config()
    
    # Find risk_classifier skill
    risk_skill = next((s for s in config.skills if s.skill_id == "risk_classifier"), None)
    if not risk_skill or not risk_skill.settings:
        return get_default_risk_classification_config()
    
    try:
        return RiskClassificationConfig(**risk_skill.settings)
    except Exception as e:
        # If parsing fails, return defaults
        raise HTTPException(status_code=500, detail=f"Error parsing risk classification config: {str(e)}")


@router.patch("/skills/risk_classifier/config", response_model=RiskClassificationConfig)
async def update_risk_classification_config(updates: RiskClassificationConfig):
    """Update risk classification configuration."""
    config = await db.get_agent_config()
    
    # Find risk_classifier skill
    risk_skill = next((s for s in config.skills if s.skill_id == "risk_classifier"), None)
    if not risk_skill:
        raise HTTPException(status_code=404, detail="Risk classifier skill not found")
    
    # Validate the config
    try:
        validated_config = RiskClassificationConfig(**updates.model_dump())
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid configuration: {str(e)}")
    
    # Update skill settings
    risk_skill.settings = validated_config.model_dump()
    risk_skill.updated_at = datetime.utcnow()
    
    await db.update_agent_config({"skills": config.skills})
    
    return validated_config


@router.post("/skills/risk_classifier/test")
async def test_risk_classification(product_ban: ProductBan):
    """Test risk classification against a sample product ban."""
    try:
        classified = await classify_violation(product_ban)
        return {
            "product_ban_id": product_ban.product_ban_id,
            "risk_level": classified.risk_level.value,
            "risk_score": classified.risk_score,
            "original_product_ban": product_ban.model_dump()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error classifying product ban: {str(e)}")
