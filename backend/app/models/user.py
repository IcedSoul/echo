"""
用户相关数据模型
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, Literal
from datetime import datetime
import re
import random
import string


def generate_random_nickname() -> str:
    """生成随机用户昵称"""
    adjectives = [
        "快乐的", "可爱的", "聪明的", "温柔的", "勇敢的", 
        "阳光的", "活泼的", "安静的", "神秘的", "优雅的",
        "机智的", "善良的", "热情的", "淡定的", "灵动的"
    ]
    nouns = [
        "小猫", "小狗", "兔子", "熊猫", "企鹅",
        "海豚", "松鼠", "考拉", "狐狸", "小鹿",
        "小鸟", "蝴蝶", "小象", "小龙", "独角兽"
    ]
    suffix = ''.join(random.choices(string.digits, k=4))
    return f"{random.choice(adjectives)}{random.choice(nouns)}{suffix}"


def is_valid_phone(value: str) -> bool:
    """检查是否为有效的中国手机号"""
    pattern = r'^1[3-9]\d{9}$'
    return bool(re.match(pattern, value))


def is_valid_email(value: str) -> bool:
    """检查是否为有效的邮箱"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, value))


class UserBase(BaseModel):
    """用户基础模型"""
    email: Optional[str] = None
    phone: Optional[str] = None
    nickname: Optional[str] = None
    is_anonymous: bool = False


class UserCreate(UserBase):
    """创建用户请求模型"""
    pass


class UserInDB(UserBase):
    """数据库中的用户模型"""
    user_id: str
    email_verified: bool = False
    phone_verified: bool = False
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    """用户响应模型（返回给前端）"""
    user_id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    nickname: Optional[str] = None
    is_anonymous: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    """更新用户信息请求"""
    nickname: Optional[str] = Field(None, min_length=1, max_length=20)


class Token(BaseModel):
    """JWT Token 响应模型 - 包含用户完整信息"""
    access_token: str
    token_type: str = "bearer"
    user_id: str
    is_new_user: bool = False
    # 用户信息（登录时一并返回，避免额外请求）
    nickname: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class TokenRefreshResponse(BaseModel):
    """Token 刷新响应（更新用户信息后返回新 token）"""
    access_token: str
    token_type: str = "bearer"
    user_id: str
    nickname: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class VerificationCodeRequest(BaseModel):
    """发送验证码请求 - 支持手机号或邮箱"""
    account: str = Field(..., description="手机号或邮箱")
    
    @field_validator('account')
    @classmethod
    def validate_account(cls, v: str) -> str:
        v = v.strip()
        if not is_valid_phone(v) and not is_valid_email(v):
            raise ValueError('请输入有效的手机号或邮箱地址')
        return v
    
    @property
    def account_type(self) -> Literal['phone', 'email']:
        """判断账号类型"""
        return 'phone' if is_valid_phone(self.account) else 'email'


class VerificationCodeVerify(BaseModel):
    """验证验证码请求"""
    account: str = Field(..., description="手机号或邮箱")
    code: str = Field(..., min_length=6, max_length=6)
    
    @field_validator('account')
    @classmethod
    def validate_account(cls, v: str) -> str:
        v = v.strip()
        if not is_valid_phone(v) and not is_valid_email(v):
            raise ValueError('请输入有效的手机号或邮箱地址')
        return v
    
    @property
    def account_type(self) -> Literal['phone', 'email']:
        """判断账号类型"""
        return 'phone' if is_valid_phone(self.account) else 'email'


# 保留旧的模型以兼容（可选，后续可删除）
class LegacyVerificationCodeRequest(BaseModel):
    """旧版发送验证码请求（仅邮箱）"""
    email: EmailStr


class LegacyVerificationCodeVerify(BaseModel):
    """旧版验证验证码请求（仅邮箱）"""
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)
