"""
分析相关数据模型
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime


# ============ 请求模型 ============

class AnalyzeConflictRequest(BaseModel):
    """矛盾分析请求"""
    conversation_text: str = Field(
        ..., 
        min_length=10, 
        max_length=5000,
        description="聊天记录文本"
    )
    context_description: Optional[str] = Field(
        None,
        max_length=200,
        description="背景描述（可选）"
    )
    user_id: str = Field(..., description="用户 ID")


# ============ 风险分类 ============

class RiskClassification(BaseModel):
    """风险分类结果"""
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    tags: List[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0, default=0.0)


# ============ 分析结果 ============

class TimelineStep(BaseModel):
    """时间线步骤"""
    step: int
    description: str
    emotion: str
    speaker: Literal["我", "对方"]


class EmotionDetail(BaseModel):
    """情绪详情"""
    primary: str
    secondary: List[str] = Field(default_factory=list)
    explanation: str


class EmotionAnalysis(BaseModel):
    """情绪分析"""
    my_emotions: EmotionDetail
    their_emotions: EmotionDetail


class NeedsAnalysis(BaseModel):
    """需求分析"""
    my_needs: List[str]
    their_needs: List[str]
    conflict_core: str


class AdviceItem(BaseModel):
    """建议项"""
    type: Literal["gentle", "explanatory", "humorous", "fallback"]
    title: str
    message: str
    explanation: str = ""


class AnalysisResult(BaseModel):
    """完整分析结果"""
    summary: str
    timeline: List[TimelineStep] = Field(default_factory=list)
    emotion_analysis: EmotionAnalysis
    needs_analysis: NeedsAnalysis
    advice: List[AdviceItem] = Field(default_factory=list)
    risk_hints: List[str] = Field(default_factory=list)


# ============ 会话模型 ============

class AnalysisSessionInDB(BaseModel):
    """数据库中的分析会话"""
    session_id: str
    user_id: str
    status: Literal["processing", "completed", "failed"]
    
    # 输入数据（加密）
    input_conversation_encrypted: str
    input_context_encrypted: Optional[str] = None
    input_original_length: int
    
    # 风险分类结果
    risk_classification: RiskClassification
    
    # 分析结果
    analysis_result: Optional[AnalysisResult] = None
    
    # 元数据
    llm_metadata: Optional[dict] = None
    
    # 时间戳
    created_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True


# ============ 响应模型 ============

class AnalyzeConflictResponse(BaseModel):
    """矛盾分析响应（返回给前端）"""
    session_id: str
    status: Literal["processing", "completed", "failed"]
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    analysis_result: Optional[AnalysisResult] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class AnalysisSessionListItem(BaseModel):
    """历史记录列表项"""
    session_id: str
    summary: str
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    created_at: datetime
    status: Literal["processing", "completed", "failed"]


class AnalysisSessionListResponse(BaseModel):
    """历史记录列表响应"""
    sessions: List[AnalysisSessionListItem]
    total: int


# ============ 历史记录模型（新版）============

class HistoryItem(BaseModel):
    """历史记录列表项"""
    session_id: str
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    summary: str
    created_at: datetime


class HistoryResponse(BaseModel):
    """历史记录响应"""
    items: List[HistoryItem]
    total: int
    limit: int
    offset: int