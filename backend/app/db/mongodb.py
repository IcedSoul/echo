"""
MongoDB 数据库连接与操作管理
"""
import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class MongoDB:
    """MongoDB 连接管理类"""
    
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None
    
    @classmethod
    async def connect(cls):
        """连接到 MongoDB 数据库"""
        try:
            cls.client = AsyncIOMotorClient(
                settings.mongo_uri,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=10000,
            )
            
            # 测试连接
            await cls.client.admin.command('ping')
            
            cls.db = cls.client[settings.mongo_db_name]
            
            logger.info(f"成功连接到 MongoDB 数据库: {settings.mongo_db_name}")
            
        except Exception as e:
            logger.error(f"连接 MongoDB 失败: {e}")
            raise
    
    @classmethod
    async def close(cls):
        """关闭 MongoDB 连接"""
        if cls.client:
            cls.client.close()
            logger.info("MongoDB 连接已关闭")
    
    @classmethod
    def get_collection(cls, name: str) -> AsyncIOMotorCollection:
        """
        获取集合
        
        Args:
            name: 集合名称
        
        Returns:
            集合对象
        """
        if cls.db is None:
            raise RuntimeError("数据库未连接，请先调用 MongoDB.connect()")
        
        return cls.db[name]
    
    @classmethod
    async def create_indexes(cls):
        """创建所有必要的索引"""
        if cls.db is None:
            logger.warning("数据库未连接，无法创建索引")
            return
        
        try:
            # users 集合索引
            # user_id 是唯一标识，email 和 phone 是登录方式（可选）
            users = cls.get_collection("users")
            await users.create_index("user_id", unique=True)
            await users.create_index("email", unique=True, sparse=True)  # sparse=True 允许多个 null
            await users.create_index("phone", unique=True, sparse=True)  # sparse=True 允许多个 null
            await users.create_index("created_at")
            logger.info("✓ users 集合索引创建完成")
            
            # analysis_sessions 集合索引
            sessions = cls.get_collection("analysis_sessions")
            await sessions.create_index("session_id", unique=True)
            await sessions.create_index([("user_id", 1), ("created_at", -1)])
            await sessions.create_index("status")
            await sessions.create_index("risk_classification.risk_level")
            logger.info("✓ analysis_sessions 集合索引创建完成")
            
            # verification_codes 集合索引（带 TTL）
            # account 可以是手机号或邮箱
            codes = cls.get_collection("verification_codes")
            await codes.create_index([("account", 1), ("created_at", -1)])
            # TTL 索引：5 分钟后自动过期
            await codes.create_index("expires_at", expireAfterSeconds=0)
            logger.info("✓ verification_codes 集合索引创建完成")
            
            logger.info("所有数据库索引创建完成")
            
        except Exception as e:
            logger.error(f"创建索引失败: {e}")
            # 索引创建失败不应中断应用启动
            pass


# Repository 模式的便捷访问函数

async def get_users_collection() -> AsyncIOMotorCollection:
    """获取 users 集合"""
    return MongoDB.get_collection("users")


async def get_sessions_collection() -> AsyncIOMotorCollection:
    """获取 analysis_sessions 集合"""
    return MongoDB.get_collection("analysis_sessions")


async def get_verification_codes_collection() -> AsyncIOMotorCollection:
    """获取 verification_codes 集合"""
    return MongoDB.get_collection("verification_codes")
