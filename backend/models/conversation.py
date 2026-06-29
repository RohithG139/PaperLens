from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field
import uuid


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Conversation(BaseModel):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str
    paperIds: list[str] = Field(default_factory=list)
    messages: list[Message] = Field(default_factory=list)
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)


class ConversationCreate(BaseModel):
    userId: str
    paperIds: list[str] = Field(default_factory=list)


class AgentStep(BaseModel):
    agentName: str
    status: Literal["pending", "running", "completed", "failed"]
    input: Optional[dict] = None
    output: Optional[dict] = None
    startedAt: Optional[datetime] = None
    completedAt: Optional[datetime] = None
    error: Optional[str] = None


class AgentExecution(BaseModel):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str
    query: str
    steps: list[AgentStep] = Field(default_factory=list)
    finalOutput: Optional[dict] = None
    status: str = "pending"
    createdAt: datetime = Field(default_factory=datetime.utcnow)
