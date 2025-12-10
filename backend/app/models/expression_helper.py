"""
表达助手数据模型
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime


# ============ 请求模型 ============

class ExpressionHelperRequest(BaseModel):
    """表达助手请求"""
    original_message: str = Field(
        ..., 
        min_length=5, 
        max_length=2000,
        description="原始想说的话"
    )
    intent: Literal["reconcile", "boundary", "understand", "stance"] = Field(
        ...,
        description="目标意图：reconcile=和解, boundary=设界限, understand=求理解, stance=表态"
    )
    user_id: str = Field(..., description="用户 ID")


# ============ 分析结果 ============

class ExpressionItem(BaseModel):
    """表达项"""
    style: str = Field(..., description="表达风格，如：温和表达、坚定表达、理性清晰表达")
    text: str = Field(..., description="重写后的表达内容")


# ============ 响应模型 ============

class ExpressionHelperResponse(BaseModel):
    """表达助手响应"""
    session_id: str
    status: Literal["processing", "completed", "failed"]
    expressions: Optional[List[ExpressionItem]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

