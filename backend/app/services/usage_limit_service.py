"""
用户使用限制服务
管理用户的功能使用次数和限制
"""
import logging
from datetime import datetime
from typing import Optional, Literal

from app.models.usage_limit import (
    UsageLimitConfig,
    UserUsageStats,
    UserUsageLimitInDB,
    UsageLimitResponse,
    UsageCheckResult
)
from app.db.mongodb import MongoDB

logger = logging.getLogger(__name__)

FeatureType = Literal["conflict_analysis", "situation_judge", "expression_helper", "ai_chat"]


class UsageLimitService:
    """使用限制服务"""
    
    async def get_usage_limits_collection(self):
        """获取使用限制集合"""
        return MongoDB.get_collection("user_usage_limits")
    
    async def initialize_user_limits(self, user_id: str) -> UserUsageLimitInDB:
        """
        初始化用户使用限制（新用户注册时调用）
        
        Args:
            user_id: 用户ID
            
        Returns:
            用户使用限制记录
        """
        collection = await self.get_usage_limits_collection()
        
        # 检查是否已存在
        existing = await collection.find_one({"user_id": user_id})
        if existing:
            return UserUsageLimitInDB(**existing)
        
        # 创建默认限制（普通用户）
        now = datetime.utcnow()
        usage_limit = UserUsageLimitInDB(
            user_id=user_id,
            limits=UsageLimitConfig(),  # 使用默认值
            usage=UserUsageStats(),  # 使用默认值
            user_level="free",
            created_at=now,
            updated_at=now
        )
        
        await collection.insert_one(usage_limit.model_dump())
        logger.info(f"初始化用户使用限制 - UserID: {user_id}")
        
        return usage_limit
    
    async def get_user_limits(self, user_id: str) -> UserUsageLimitInDB:
        """
        获取用户使用限制
        
        Args:
            user_id: 用户ID
            
        Returns:
            用户使用限制记录
        """
        collection = await self.get_usage_limits_collection()
        
        doc = await collection.find_one({"user_id": user_id})
        
        if not doc:
            # 如果不存在，自动初始化
            return await self.initialize_user_limits(user_id)
        
        return UserUsageLimitInDB(**doc)
    
    async def check_usage_limit(
        self,
        user_id: str,
        feature: FeatureType
    ) -> UsageCheckResult:
        """
        检查用户是否可以使用某功能
        
        Args:
            user_id: 用户ID
            feature: 功能类型
            
        Returns:
            检查结果
        """
        limits_data = await self.get_user_limits(user_id)
        
        # 根据功能类型获取使用次数和限制
        feature_map = {
            "conflict_analysis": {
                "used": limits_data.usage.conflict_analysis_used,
                "limit": limits_data.limits.conflict_analysis_limit,
                "name": "冲突复盘"
            },
            "situation_judge": {
                "used": limits_data.usage.situation_judge_used,
                "limit": limits_data.limits.situation_judge_limit,
                "name": "情况评理"
            },
            "expression_helper": {
                "used": limits_data.usage.expression_helper_used,
                "limit": limits_data.limits.expression_helper_limit,
                "name": "表达助手"
            },
            "ai_chat": {
                "used": limits_data.usage.ai_chat_used,
                "limit": limits_data.limits.ai_chat_limit,
                "name": "AI对话"
            }
        }
        
        feature_info = feature_map.get(feature)
        if not feature_info:
            raise ValueError(f"未知的功能类型: {feature}")
        
        used = feature_info["used"]
        limit = feature_info["limit"]
        remaining = max(0, limit - used)
        allowed = used < limit
        
        message = None
        if not allowed:
            message = f"{feature_info['name']}使用次数已达上限（{limit}次），请升级账户或等待下次重置"
        
        return UsageCheckResult(
            allowed=allowed,
            feature=feature,
            used=used,
            limit=limit,
            remaining=remaining,
            message=message
        )
    
    async def increment_usage(
        self,
        user_id: str,
        feature: FeatureType
    ) -> bool:
        """
        增加用户功能使用次数
        
        Args:
            user_id: 用户ID
            feature: 功能类型
            
        Returns:
            是否成功
        """
        collection = await self.get_usage_limits_collection()
        
        # 构建更新字段
        field_map = {
            "conflict_analysis": "usage.conflict_analysis_used",
            "situation_judge": "usage.situation_judge_used",
            "expression_helper": "usage.expression_helper_used",
            "ai_chat": "usage.ai_chat_used"
        }
        
        field = field_map.get(feature)
        if not field:
            raise ValueError(f"未知的功能类型: {feature}")
        
        result = await collection.update_one(
            {"user_id": user_id},
            {
                "$inc": {field: 1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.modified_count > 0:
            logger.info(f"使用次数增加 - UserID: {user_id}, Feature: {feature}")
            return True
        else:
            logger.warning(f"使用次数增加失败 - UserID: {user_id}, Feature: {feature}")
            return False
    
    async def get_usage_response(self, user_id: str) -> UsageLimitResponse:
        """
        获取用户使用情况响应
        
        Args:
            user_id: 用户ID
            
        Returns:
            使用限制响应
        """
        limits_data = await self.get_user_limits(user_id)
        
        return UsageLimitResponse(
            # 冲突复盘
            conflict_analysis_used=limits_data.usage.conflict_analysis_used,
            conflict_analysis_limit=limits_data.limits.conflict_analysis_limit,
            conflict_analysis_remaining=max(
                0,
                limits_data.limits.conflict_analysis_limit - limits_data.usage.conflict_analysis_used
            ),
            # 情况评理
            situation_judge_used=limits_data.usage.situation_judge_used,
            situation_judge_limit=limits_data.limits.situation_judge_limit,
            situation_judge_remaining=max(
                0,
                limits_data.limits.situation_judge_limit - limits_data.usage.situation_judge_used
            ),
            # 表达助手
            expression_helper_used=limits_data.usage.expression_helper_used,
            expression_helper_limit=limits_data.limits.expression_helper_limit,
            expression_helper_remaining=max(
                0,
                limits_data.limits.expression_helper_limit - limits_data.usage.expression_helper_used
            ),
            # AI对话
            ai_chat_used=limits_data.usage.ai_chat_used,
            ai_chat_limit=limits_data.limits.ai_chat_limit,
            ai_chat_remaining=max(
                0,
                limits_data.limits.ai_chat_limit - limits_data.usage.ai_chat_used
            ),
            # 用户等级
            user_level=limits_data.user_level
        )
    
    async def reset_user_usage(self, user_id: str) -> bool:
        """
        重置用户使用次数（管理员功能或定时任务）
        
        Args:
            user_id: 用户ID
            
        Returns:
            是否成功
        """
        collection = await self.get_usage_limits_collection()
        
        result = await collection.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "usage": UserUsageStats().model_dump(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count > 0:
            logger.info(f"用户使用次数已重置 - UserID: {user_id}")
            return True
        else:
            logger.warning(f"用户使用次数重置失败 - UserID: {user_id}")
            return False


# 全局服务实例
usage_limit_service = UsageLimitService()

