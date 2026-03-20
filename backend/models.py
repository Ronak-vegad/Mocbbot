from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid


class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    file_ids: Optional[List[str]] = None


class ChatRequest(BaseModel):
    conversation_id: str
    message: str
    file_ids: Optional[List[str]] = []
    model: Optional[str] = "gpt-oss:20b"


class ConversationCreate(BaseModel):
    title: Optional[str] = "New Chat"


class ConversationResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    message_count: Optional[int] = 0


class FileUploadResponse(BaseModel):
    file_id: str
    filename: str
    file_type: str
    content_preview: Optional[str] = None


class ModelInfo(BaseModel):
    name: str
    size: Optional[str] = None
    modified_at: Optional[str] = None


class ModelsResponse(BaseModel):
    models: List[ModelInfo]
