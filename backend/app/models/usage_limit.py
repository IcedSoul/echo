"""
用户使用限制相关数据模型
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class UsageLimitConfig(BaseModel):
    """使用限制配置"""
    conflict_analysis_limit: int = Field(default=10, description="冲突复盘使用上限")
    situation_judge_limit: int = Field(default=10, description="情况评理使用上限")
    expression_helper_limit: int = Field(default=10, description="表达助手使用上限")
    ai_chat_limit: int = Field(default=20, description="AI对话使用上限")


class UserUsageStats(BaseModel):
    """用户使用统计"""
    conflict_analysis_used: int = Field(default=0, description="冲突复盘已使用次数")
    situation_judge_used: int = Field(default=0, description="情况评理已使用次数")
    expression_helper_used: int = Field(default=0, description="表达助手已使用次数")
    ai_chat_used: int = Field(default=0, description="AI对话已使用次数")


class UserUsageLimitInDB(BaseModel):
    """数据库中的用户使用限制记录"""
    user_id: str
    # 使用限制配置
    limits: UsageLimitConfig = Field(default_factory=UsageLimitConfig)
    # 当前使用统计
    usage: UserUsageStats = Field(default_factory=UserUsageStats)
    # 用户级别（可扩展）
    user_level: Literal["free", "premium", "vip"] = Field(default="free", description="用户等级")
    # 时间戳
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UsageLimitResponse(BaseModel):
    """使用限制响应模型"""
    # 冲突复盘
    conflict_analysis_used: int
    conflict_analysis_limit: int
    conflict_analysis_remaining: int
    # 情况评理
    situation_judge_used: int
    situation_judge_limit: int
    situation_judge_remaining: int
    # 表达助手
    expression_helper_used: int
    expression_helper_limit: int
    expression_helper_remaining: int
    # AI对话
    ai_chat_used: int
    ai_chat_limit: int
    ai_chat_remaining: int
    # 用户等级
    user_level: str


class UsageCheckResult(BaseModel):
    """使用限制检查结果"""
    allowed: bool
    feature: str
    used: int
    limit: int
    remaining: int
    message: Optional[str] = None

