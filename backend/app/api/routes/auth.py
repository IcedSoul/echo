"""
认证相关 API 路由
支持手机号和邮箱双通道验证码登录
"""
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta
import uuid
import random
import logging

from app.models.user import (
    VerificationCodeRequest,
    VerificationCodeVerify,
    Token,
    TokenRefreshResponse,
    UserResponse,
    UserUpdateRequest,
    generate_random_nickname
)
from app.core.security import create_access_token, decode_access_token
from app.db.mongodb import get_users_collection, get_verification_codes_collection
from app.services.email_service import email_service
from app.services.sms_service import sms_service

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()


@router.post(
    "/send-code",
    summary="发送验证码",
    description="向指定手机号或邮箱发送 6 位数字验证码"
)
async def send_verification_code(request: VerificationCodeRequest):
    """
    发送验证码
    
    自动识别账号类型（手机号或邮箱），发送相应的验证码
    
    流程：
    1. 判断账号类型（手机号/邮箱）
    2. 生成 6 位随机验证码
    3. 存储到数据库（5分钟过期）
    4. 根据账号类型发送短信或邮件
    """
    try:
        account = request.account
        account_type = request.account_type
        
        # 生成 6 位随机验证码
        code = str(random.randint(100000, 999999))
        expires_minutes = 5
        
        # 存储验证码到数据库
        codes_collection = await get_verification_codes_collection()
        
        # 设置过期时间
        expires_at = datetime.utcnow() + timedelta(minutes=expires_minutes)
        
        await codes_collection.insert_one({
            "account": account,
            "account_type": account_type,
            "code": code,
            "expires_at": expires_at,
            "used": False,
            "created_at": datetime.utcnow()
        })
        
        # 根据账号类型发送验证码
        if account_type == 'phone':
            await sms_service.send_verification_code(
                phone_number=account,
                code=code,
                expires_minutes=expires_minutes
            )
            message = "验证码已发送到您的手机"
        else:
            await email_service.send_verification_code(
                to_email=account,
                code=code,
                expires_minutes=expires_minutes
            )
            message = "验证码已发送到您的邮箱"
        
        logger.info(f"Verification code sent - Account: {account}, Type: {account_type}")
        
        return {
            "message": message,
            "account": account,
            "account_type": account_type,
            "expires_in_minutes": expires_minutes
        }
        
    except Exception as e:
        logger.error(f"发送验证码失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "SEND_CODE_ERROR",
                    "message": "发送验证码失败，请稍后重试",
                    "details": str(e)
                }
            }
        )


@router.post(
    "/verify-code",
    response_model=Token,
    summary="验证验证码并登录",
    description="验证手机号或邮箱验证码，返回 JWT token。如果是新用户则自动注册。"
)
async def verify_code_and_login(request: VerificationCodeVerify):
    """
    验证验证码并登录/注册
    
    支持手机号和邮箱两种方式
    
    流程：
    1. 验证验证码是否正确且未过期
    2. 查询用户是否存在（通过手机号或邮箱）
    3. 不存在则创建新用户（自动生成随机昵称）
    4. 返回 JWT token
    """
    try:
        account = request.account
        account_type = request.account_type
        
        codes_collection = await get_verification_codes_collection()
        users_collection = await get_users_collection()
        
        # 查询验证码
        code_doc = await codes_collection.find_one({
            "account": account,
            "code": request.code,
            "used": False
        })
        
        if not code_doc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "INVALID_CODE",
                        "message": "验证码错误或已过期",
                        "details": {}
                    }
                }
            )
        
        # 检查是否过期
        if code_doc["expires_at"] < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "CODE_EXPIRED",
                        "message": "验证码已过期，请重新获取",
                        "details": {}
                    }
                }
            )
        
        # 标记验证码为已使用
        await codes_collection.update_one(
            {"_id": code_doc["_id"]},
            {"$set": {"used": True}}
        )
        
        # 根据账号类型查询用户
        if account_type == 'phone':
            user_doc = await users_collection.find_one({"phone": account})
        else:
            user_doc = await users_collection.find_one({"email": account})
        
        is_new_user = False
        
        if not user_doc:
            # 新用户：创建记录
            user_id = str(uuid.uuid4())
            nickname = generate_random_nickname()
            
            user_doc = {
                "user_id": user_id,
                "nickname": nickname,
                "is_anonymous": False,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "last_login_at": datetime.utcnow()
            }
            
            # 根据账号类型设置字段
            if account_type == 'phone':
                user_doc["phone"] = account
                user_doc["phone_verified"] = True
                user_doc["email"] = None
                user_doc["email_verified"] = False
            else:
                user_doc["email"] = account
                user_doc["email_verified"] = True
                user_doc["phone"] = None
                user_doc["phone_verified"] = False
            
            await users_collection.insert_one(user_doc)
            
            is_new_user = True
            
            logger.info(f"New user registered - UserID: {user_id}, Account: {account}, Type: {account_type}")
        else:
            # 已存在用户：更新最后登录时间
            user_id = user_doc["user_id"]
            
            update_data = {
                "last_login_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # 如果用户通过新方式登录，更新验证状态
            if account_type == 'phone' and not user_doc.get("phone_verified"):
                update_data["phone"] = account
                update_data["phone_verified"] = True
            elif account_type == 'email' and not user_doc.get("email_verified"):
                update_data["email"] = account
                update_data["email_verified"] = True
            
            await users_collection.update_one(
                {"user_id": user_id},
                {"$set": update_data}
            )
            
            logger.info(f"User logged in - UserID: {user_id}, Account: {account}, Type: {account_type}")
        
        # 获取用户完整信息
        nickname = user_doc.get("nickname")
        email = user_doc.get("email")
        phone = user_doc.get("phone")
        
        # 生成 JWT token（包含用户核心信息）
        token_data = {
            "user_id": user_id,
            "nickname": nickname,
            "email": email,
            "phone": phone
        }
            
        access_token = create_access_token(data=token_data)
        
        return Token(
            access_token=access_token,
            user_id=user_id,
            is_new_user=is_new_user,
            nickname=nickname,
            email=email,
            phone=phone
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"验证登录失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "VERIFY_ERROR",
                    "message": "登录失败，请稍后重试",
                    "details": str(e)
                }
            }
        )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="获取当前用户信息",
    description="需要在 Authorization header 中提供有效的 JWT token"
)
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    获取当前登录用户信息
    
    需要提供有效的 JWT token
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
        
        # 从数据库查询用户信息
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
        
        return UserResponse(
            user_id=user_doc["user_id"],
            email=user_doc.get("email"),
            phone=user_doc.get("phone"),
            nickname=user_doc.get("nickname"),
            is_anonymous=user_doc.get("is_anonymous", False),
            created_at=user_doc["created_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取用户信息失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "GET_USER_ERROR",
                    "message": "获取用户信息失败",
                    "details": str(e)
                }
            }
        )


@router.put(
    "/me",
    response_model=TokenRefreshResponse,
    summary="更新用户信息",
    description="更新当前用户的昵称等信息，返回新的 token"
)
async def update_current_user(
    request: UserUpdateRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    更新当前用户信息
    
    更新后会返回新的 token（因为用户信息存储在 token 中）
    
    目前支持更新：
    - nickname: 用户昵称
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
        
        # 从数据库查询用户信息
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
        
        # 构建更新数据
        update_data = {"updated_at": datetime.utcnow()}
        
        if request.nickname is not None:
            update_data["nickname"] = request.nickname
        
        # 更新数据库
        await users_collection.update_one(
            {"user_id": user_id},
            {"$set": update_data}
        )
        
        # 获取更新后的用户信息
        updated_user = await users_collection.find_one({"user_id": user_id})
        
        # 生成新的 token（包含更新后的用户信息）
        nickname = updated_user.get("nickname")
        email = updated_user.get("email")
        phone = updated_user.get("phone")
        
        token_data = {
            "user_id": user_id,
            "nickname": nickname,
            "email": email,
            "phone": phone
        }
        
        new_access_token = create_access_token(data=token_data)
        
        logger.info(f"User info updated - UserID: {user_id}")
        
        return TokenRefreshResponse(
            access_token=new_access_token,
            user_id=user_id,
            nickname=nickname,
            email=email,
            phone=phone
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新用户信息失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "UPDATE_USER_ERROR",
                    "message": "更新用户信息失败",
                    "details": str(e)
                }
            }
        )


@router.get(
    "/stats",
    summary="获取用户统计数据",
    description="获取当前用户的分析统计数据"
)
async def get_user_stats(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    获取用户统计数据
    
    返回：
    - total_analyses: 总分析次数
    - healthy_conversations: 健康对话数（LOW风险）
    - needs_attention: 需要关注数（MEDIUM/HIGH/CRITICAL风险）
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
        
        # 从数据库查询用户的分析记录统计
        from app.db.mongodb import get_sessions_collection
        sessions_collection = await get_sessions_collection()
        
        # 统计总分析次数
        total_analyses = await sessions_collection.count_documents({"user_id": user_id})
        
        # 统计健康对话数（LOW风险）
        healthy_conversations = await sessions_collection.count_documents({
            "user_id": user_id,
            "risk_classification.risk_level": "LOW"
        })
        
        # 统计需要关注数（MEDIUM/HIGH/CRITICAL风险）
        needs_attention = await sessions_collection.count_documents({
            "user_id": user_id,
            "risk_classification.risk_level": {"$in": ["MEDIUM", "HIGH", "CRITICAL"]}
        })
        
        return {
            "total_analyses": total_analyses,
            "healthy_conversations": healthy_conversations,
            "needs_attention": needs_attention
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取用户统计失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "GET_STATS_ERROR",
                    "message": "获取统计数据失败",
                    "details": str(e)
                }
            }
        )
