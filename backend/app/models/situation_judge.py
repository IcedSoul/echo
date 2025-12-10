"""
情况评理数据模型
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime


# ============ 请求模型 ============

class SituationJudgeRequest(BaseModel):
    """情况评理请求"""
    situation_text: str = Field(
        ..., 
        min_length=20, 
        max_length=5000,
        description="事情经过描述"
    )
    background_description: Optional[str] = Field(
        None,
        max_length=300,
        description="背景描述（可选）"
    )
    user_id: str = Field(..., description="用户 ID")


# ============ 分析结果 ============

class LogicIssue(BaseModel):
    """逻辑问题"""
    type: str = Field(..., description="问题类型，如：情绪推论、归因扩大、确认偏误")
    description: str = Field(..., description="问题描述")


class SuggestionItem(BaseModel):
    """建议项"""
    style: str = Field(..., description="建议风格，如：温和式、坚定式")
    text: str = Field(..., description="建议内容")


class Perspectives(BaseModel):
    """双方视角"""
    yours: str = Field(..., description="你的视角")
    theirs: str = Field(..., description="对方的视角")


class Responsibility(BaseModel):
    """责任分析"""
    yours: int = Field(..., ge=0, le=100, description="你的责任占比")
    theirs: int = Field(..., ge=0, le=100, description="对方的责任占比")
    shared: int = Field(..., ge=0, le=100, description="共同因素占比")


class SituationJudgeResult(BaseModel):
    """情况评理结果"""
    summary: str = Field(..., description="事件概要")
    perspectives: Perspectives = Field(..., description="双方视角")
    responsibility: Responsibility = Field(..., description="责任分析")
    logic_issues: List[LogicIssue] = Field(default_factory=list, description="逻辑问题")
    suggestions: List[SuggestionItem] = Field(default_factory=list, description="建议回复")


# ============ 响应模型 ============

class SituationJudgeResponse(BaseModel):
    """情况评理响应"""
    session_id: str
    status: Literal["processing", "completed", "failed"]
    analysis_result: Optional[SituationJudgeResult] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

