"""
Agent configuration and task models.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class TaskStatus(str, Enum):
    """Status of an agent task."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskType(str, Enum):
    """Types of agent tasks."""
    SEARCH_MARKETPLACE = "search_marketplace"
    VISUAL_SEARCH = "visual_search"
    FETCH_RECALLS = "fetch_recalls"
    ANALYZE_LISTING = "analyze_listing"
    IMPORT_VIOLATIONS = "import_violations"


class ToolType(str, Enum):
    """External tool integrations."""
    GOOGLE_LENS = "google_lens"
    GOOGLE_VISION = "google_vision"
    TINEYE = "tineye"
    BING_VISUAL = "bing_visual"
    CUSTOM_WEBHOOK = "custom_webhook"


class LLMProvider(str, Enum):
    """LLM/AI model providers."""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    OLLAMA = "ollama"
    CUSTOM = "custom"


class ToolConfig(BaseModel):
    """Configuration for an external tool."""
    tool_type: ToolType
    enabled: bool = False
    api_key: Optional[str] = None
    endpoint_url: Optional[str] = None
    settings: Dict[str, Any] = {}


class SkillType(str, Enum):
    """Types of agent skills."""
    RISK_CLASSIFICATION = "risk_classification"
    QUERY_BUILDING = "query_building"
    MATCH_ANALYSIS = "match_analysis"
    DATA_EXTRACTION = "data_extraction"
    NOTIFICATION = "notification"
    CUSTOM = "custom"


class AgentSkill(BaseModel):
    """Configuration for an agent skill."""
    skill_id: str = Field(..., description="Unique identifier for the skill")
    skill_type: SkillType
    name: str = Field(..., description="Human-readable skill name")
    description: str = Field("", description="Description of what the skill does")
    enabled: bool = True
    priority: int = Field(50, ge=0, le=100, description="Execution priority (0-100, higher = more important)")
    settings: Dict[str, Any] = Field(default_factory=dict, description="Skill-specific configuration")
    version: str = Field("1.0.0", description="Skill version")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        from_attributes = True


class SkillCreate(BaseModel):
    """Schema for creating a new skill."""
    skill_id: str
    skill_type: SkillType
    name: str
    description: str = ""
    enabled: bool = True
    priority: int = 50
    settings: Dict[str, Any] = Field(default_factory=dict)


class SkillUpdate(BaseModel):
    """Schema for updating a skill."""
    name: Optional[str] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None
    priority: Optional[int] = None
    settings: Optional[Dict[str, Any]] = None


class AgentConfig(BaseModel):
    """Agent configuration settings."""
    id: str = "default"
    
    # LLM/Model Provider Settings
    llm_provider: LLMProvider = LLMProvider.OPENAI
    llm_model: str = "gpt-4o"  # e.g., "gpt-4o", "claude-3-5-sonnet-20241022", "llama3"
    llm_api_key: Optional[str] = None  # Encrypted in storage
    llm_api_base: Optional[str] = None  # For custom/Ollama endpoints
    llm_temperature: float = Field(0.7, ge=0.0, le=2.0)
    llm_max_tokens: Optional[int] = Field(4096, ge=1, le=100000)
    
    # Search settings
    search_frequency_minutes: int = Field(60, ge=5, le=1440)
    search_depth: int = Field(3, ge=1, le=10)
    match_sensitivity: float = Field(0.7, ge=0.0, le=1.0)
    
    # Automation
    auto_alerts_enabled: bool = True
    auto_flag_threshold: float = Field(0.8, ge=0.0, le=1.0)
    
    # Notifications
    email_alerts: bool = False
    webhook_url: Optional[str] = None
    
    # Tool integrations
    tools: List[ToolConfig] = []
    
    # Agent skills
    skills: List[AgentSkill] = []
    
    # Status
    is_active: bool = False
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True


class AgentConfigUpdate(BaseModel):
    """Schema for updating agent config."""
    llm_provider: Optional[LLMProvider] = None
    llm_model: Optional[str] = None
    llm_api_key: Optional[str] = None
    llm_api_base: Optional[str] = None
    llm_temperature: Optional[float] = None
    llm_max_tokens: Optional[int] = None
    search_frequency_minutes: Optional[int] = None
    search_depth: Optional[int] = None
    match_sensitivity: Optional[float] = None
    auto_alerts_enabled: Optional[bool] = None
    auto_flag_threshold: Optional[float] = None
    email_alerts: Optional[bool] = None
    webhook_url: Optional[str] = None
    is_active: Optional[bool] = None
    skills: Optional[List[AgentSkill]] = None


class SearchTask(BaseModel):
    """A search task for the agent to execute."""
    id: str
    task_type: TaskType
    status: TaskStatus = TaskStatus.PENDING
    
    # Task parameters
    recall_id: Optional[str] = None
    marketplace_ids: List[str] = []
    search_query: Optional[str] = None
    
    # Results
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    
    # Progress
    progress: float = Field(0.0, ge=0.0, le=1.0)
    items_processed: int = 0
    items_total: int = 0
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TaskCreate(BaseModel):
    """Schema for creating a new task."""
    task_type: TaskType
    recall_id: Optional[str] = None
    marketplace_ids: List[str] = []
    search_query: Optional[str] = None


class AgentStatus(BaseModel):
    """Current status of the agent."""
    is_running: bool = False
    current_task: Optional[SearchTask] = None
    pending_tasks: int = 0
    completed_tasks_today: int = 0
    last_run_at: Optional[datetime] = None
    next_scheduled_run: Optional[datetime] = None
    uptime_seconds: int = 0
