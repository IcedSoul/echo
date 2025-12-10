"""
AI 聊天数据模型
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime


# ============ 聊天消息 ============

class ChatMessage(BaseModel):
    """聊天消息"""
    role: Literal["user", "assistant"] = Field(..., description="消息角色")
    content: str = Field(..., description="消息内容")
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow, description="消息时间")
    image_url: Optional[str] = Field(None, description="图片URL（如有）")


# ============ 请求模型 ============

class SendMessageRequest(BaseModel):
    """发送消息请求"""
    session_id: Optional[str] = Field(None, description="会话ID，为空则创建新会话")
    message: str = Field(..., min_length=1, max_length=5000, description="用户消息")
    user_id: str = Field(..., description="用户 ID")
    image_base64: Optional[str] = Field(None, description="图片Base64编码（可选）")


class CreateSessionRequest(BaseModel):
    """创建会话请求"""
    user_id: str = Field(..., description="用户 ID")
    title: Optional[str] = Field(None, description="会话标题")


# ============ 响应模型 ============

class ChatSessionInfo(BaseModel):
    """聊天会话信息"""
    session_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int


class ChatHistoryItem(BaseModel):
    """聊天历史项"""
    session_id: str
    title: str
    last_message: str
    created_at: datetime
    updated_at: datetime


class ChatHistoryResponse(BaseModel):
    """聊天历史响应"""
    sessions: List[ChatHistoryItem]
    total: int


class SendMessageResponse(BaseModel):
    """发送消息响应"""
    session_id: str
    message: ChatMessage
    reply: ChatMessage


class SessionMessagesResponse(BaseModel):
    """会话消息列表响应"""
    session_id: str
    title: str
    messages: List[ChatMessage]
    created_at: datetime


# ============ 数据库模型 ============

class ChatSessionInDB(BaseModel):
    """数据库中的聊天会话"""
    session_id: str
    user_id: str
    title: str
    messages: List[dict]  # ChatMessage 的 dict 列表
    created_at: datetime
    updated_at: datetime

