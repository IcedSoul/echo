"""
Admin 权限中间件
"""
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import logging

from app.core.security import decode_access_token
from app.db.mongodb import get_users_collection

logger = logging.getLogger(__name__)
security = HTTPBearer()


async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    验证管理员权限的依赖项
    
    Returns:
        user_id: 管理员用户ID
        
    Raises:
        HTTPException: 如果不是管理员或token无效
    """
    try:
        # 解码 token
        token = credentials.credentials
        payload = decode_access_token(token)
        
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": {
                        "code": "INVALID_TOKEN",
                        "message": "无效的 token",
                        "details": {}
                    }
                }
            )
        
        user_id = payload.get("user_id")
        
        # 从数据库查询用户角色
        users_collection = await get_users_collection()
        user_doc = await users_collection.find_one({"user_id": user_id})
        
        if not user_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": {
                        "code": "USER_NOT_FOUND",
                        "message": "用户不存在",
                        "details": {}
                    }
                }
            )
        
        # 检查是否为管理员
        user_role = user_doc.get("role", "user")
        if user_role != "admin":
            logger.warning(f"非管理员尝试访问 - UserID: {user_id}, Role: {user_role}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "ADMIN_REQUIRED",
                        "message": "需要管理员权限",
                        "details": {}
                    }
                }
            )
        
        logger.info(f"管理员访问 - UserID: {user_id}")
        return user_id
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"验证管理员权限失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "AUTH_ERROR",
                    "message": "权限验证失败",
                    "details": str(e)
                }
            }
        )


