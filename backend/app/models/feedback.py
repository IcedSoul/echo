"""
用户反馈相关数据模型
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class FeedbackCreate(BaseModel):
    """创建反馈请求模型"""
    content: str = Field(..., min_length=1, max_length=1000, description="反馈内容")
    contact: Optional[str] = Field(None, max_length=100, description="联系方式（可选）")


class FeedbackResponse(BaseModel):
    """反馈响应模型"""
    feedback_id: str
    user_id: str
    content: str
    contact: Optional[str] = None
    status: Literal["pending", "read", "replied"] = "pending"
    created_at: datetime

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class FeedbackListResponse(BaseModel):
    """反馈列表响应模型"""
    feedbacks: list[FeedbackResponse]
    total: int
    page: int
    page_size: int


class FeedbackUpdateStatus(BaseModel):
    """更新反馈状态请求模型"""
    status: Literal["pending", "read", "replied"]
