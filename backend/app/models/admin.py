"""
Admin 相关数据模型
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Literal
from datetime import datetime


class AdminOverviewStats(BaseModel):
    """管理后台概览统计"""
    total_users: int = Field(description="总用户数")
    new_users_today: int = Field(description="今日新增用户")
    new_users_week: int = Field(description="本周新增用户")
    total_sessions: int = Field(description="总会话数")
    sessions_today: int = Field(description="今日会话数")
    sessions_week: int = Field(description="本周会话数")
    # 各功能使用统计
    conflict_analysis_count: int = Field(description="冲突复盘总数")
    situation_judge_count: int = Field(description="情况评理总数")
    expression_helper_count: int = Field(description="表达助手总数")
    ai_chat_count: int = Field(description="AI对话总数")


class UserListItem(BaseModel):
    """用户列表项"""
    user_id: str
    nickname: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Literal["user", "admin"] = "user"
    is_anonymous: bool = False
    created_at: datetime
    last_login_at: Optional[datetime] = None


class UserListResponse(BaseModel):
    """用户列表响应"""
    items: List[UserListItem]
    total: int
    page: int
    page_size: int


class CreateUserRequest(BaseModel):
    """创建用户请求"""
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    nickname: str = Field(..., min_length=1, max_length=20)
    role: Literal["user", "admin"] = "user"


class UpdateUserRequest(BaseModel):
    """更新用户请求（管理员）"""
    nickname: Optional[str] = Field(None, min_length=1, max_length=20)
    role: Optional[Literal["user", "admin"]] = None


class SessionListItem(BaseModel):
    """会话列表项"""
    session_id: str
    user_id: str
    user_nickname: Optional[str] = None
    type: Literal["conflict", "situation_judge", "expression_helper", "ai_chat"]
    status: str
    risk_level: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class SessionListResponse(BaseModel):
    """会话列表响应"""
    items: List[SessionListItem]
    total: int
    page: int
    page_size: int


class UsageLimitUpdate(BaseModel):
    """使用限制更新请求"""
    conflict_analysis_limit: Optional[int] = Field(None, ge=0)
    situation_judge_limit: Optional[int] = Field(None, ge=0)
    expression_helper_limit: Optional[int] = Field(None, ge=0)
    ai_chat_limit: Optional[int] = Field(None, ge=0)


class UserUsageLimitDetail(BaseModel):
    """用户使用限制详情"""
    user_id: str
    user_nickname: Optional[str] = None
    user_level: str
    limits: dict
    usage: dict
    created_at: datetime
    updated_at: datetime


