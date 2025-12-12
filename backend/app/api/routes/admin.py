"""
Admin API 路由
管理员后台管理接口
"""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from datetime import datetime, timedelta
from typing import Optional
import logging
import uuid

from app.models.admin import (
    AdminOverviewStats,
    UserListResponse,
    UserListItem,
    CreateUserRequest,
    UpdateUserRequest,
    SessionListResponse,
    SessionListItem,
    UsageLimitUpdate,
    UserUsageLimitDetail
)
from app.models.user import generate_random_nickname
from app.core.admin_middleware import require_admin
from app.db.mongodb import get_users_collection, get_sessions_collection
from app.services.usage_limit_service import usage_limit_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Admin"])


@router.get(
    "/overview",
    response_model=AdminOverviewStats,
    summary="获取概览统计",
    description="获取管理后台首页的概览统计数据"
)
async def get_overview_stats(admin_id: str = Depends(require_admin)):
    """获取概览统计数据"""
    try:
        users_collection = await get_users_collection()
        sessions_collection = await get_sessions_collection()
        
        # 时间范围
        now = datetime.utcnow()
        today_start = datetime(now.year, now.month, now.day)
        week_start = now - timedelta(days=7)
        
        # 用户统计
        total_users = await users_collection.count_documents({})
        new_users_today = await users_collection.count_documents({
            "created_at": {"$gte": today_start}
        })
        new_users_week = await users_collection.count_documents({
            "created_at": {"$gte": week_start}
        })
        
        # 会话统计
        total_sessions = await sessions_collection.count_documents({"status": "completed"})
        sessions_today = await sessions_collection.count_documents({
            "created_at": {"$gte": today_start},
            "status": "completed"
        })
        sessions_week = await sessions_collection.count_documents({
            "created_at": {"$gte": week_start},
            "status": "completed"
        })
        
        # 各功能使用统计
        conflict_analysis_count = await sessions_collection.count_documents({
            "$or": [
                {"type": "conflict"},
                {"type": {"$exists": False}},
                {"type": None}
            ],
            "status": "completed"
        })
        situation_judge_count = await sessions_collection.count_documents({
            "type": "situation_judge",
            "status": "completed"
        })
        expression_helper_count = await sessions_collection.count_documents({
            "type": "expression_helper",
            "status": "completed"
        })
        
        # AI对话统计（聊天会话中的消息数）
        from app.db.mongodb import MongoDB
        chat_sessions = MongoDB.db["chat_sessions"]
        pipeline = [
            {"$unwind": "$messages"},
            {"$match": {"messages.role": "user"}},
            {"$count": "total"}
        ]
        ai_chat_result = await chat_sessions.aggregate(pipeline).to_list(1)
        ai_chat_count = ai_chat_result[0]["total"] if ai_chat_result else 0
        
        return AdminOverviewStats(
            total_users=total_users,
            new_users_today=new_users_today,
            new_users_week=new_users_week,
            total_sessions=total_sessions,
            sessions_today=sessions_today,
            sessions_week=sessions_week,
            conflict_analysis_count=conflict_analysis_count,
            situation_judge_count=situation_judge_count,
            expression_helper_count=expression_helper_count,
            ai_chat_count=ai_chat_count
        )
        
    except Exception as e:
        logger.error(f"获取概览统计失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "GET_STATS_ERROR", "message": str(e)}}
        )


@router.get(
    "/users",
    response_model=UserListResponse,
    summary="获取用户列表",
    description="分页获取用户列表"
)
async def get_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="搜索关键词（昵称/邮箱/手机号）"),
    role: Optional[str] = Query(None, description="角色筛选"),
    admin_id: str = Depends(require_admin)
):
    """获取用户列表"""
    try:
        users_collection = await get_users_collection()
        
        # 构建查询条件
        query = {}
        if search:
            query["$or"] = [
                {"nickname": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}}
            ]
        if role:
            query["role"] = role
        
        # 分页查询
        skip = (page - 1) * page_size
        cursor = users_collection.find(query).sort("created_at", -1).skip(skip).limit(page_size)
        
        items = []
        async for doc in cursor:
            items.append(UserListItem(
                user_id=doc["user_id"],
                nickname=doc.get("nickname"),
                email=doc.get("email"),
                phone=doc.get("phone"),
                role=doc.get("role", "user"),
                is_anonymous=doc.get("is_anonymous", False),
                created_at=doc["created_at"],
                last_login_at=doc.get("last_login_at")
            ))
        
        total = await users_collection.count_documents(query)
        
        return UserListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size
        )
        
    except Exception as e:
        logger.error(f"获取用户列表失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "GET_USERS_ERROR", "message": str(e)}}
        )


@router.post(
    "/users",
    response_model=UserListItem,
    summary="创建用户",
    description="管理员创建新用户"
)
async def create_user(
    request: CreateUserRequest,
    admin_id: str = Depends(require_admin)
):
    """创建用户"""
    try:
        users_collection = await get_users_collection()
        
        # 检查邮箱或手机号是否已存在
        if request.email:
            existing = await users_collection.find_one({"email": request.email})
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"error": {"code": "EMAIL_EXISTS", "message": "邮箱已存在"}}
                )
        if request.phone:
            existing = await users_collection.find_one({"phone": request.phone})
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"error": {"code": "PHONE_EXISTS", "message": "手机号已存在"}}
                )
        
        # 创建用户
        user_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        user_doc = {
            "user_id": user_id,
            "nickname": request.nickname,
            "role": request.role,
            "is_anonymous": False,
            "created_at": now,
            "updated_at": now
        }
        
        if request.email:
            user_doc["email"] = request.email
            user_doc["email_verified"] = True
        if request.phone:
            user_doc["phone"] = request.phone
            user_doc["phone_verified"] = True
        
        await users_collection.insert_one(user_doc)
        
        # 初始化使用限制
        await usage_limit_service.initialize_user_limits(user_id)
        
        logger.info(f"管理员创建用户 - AdminID: {admin_id}, NewUserID: {user_id}")
        
        return UserListItem(
            user_id=user_id,
            nickname=request.nickname,
            email=request.email,
            phone=request.phone,
            role=request.role,
            is_anonymous=False,
            created_at=now,
            last_login_at=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建用户失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "CREATE_USER_ERROR", "message": str(e)}}
        )


@router.put(
    "/users/{user_id}",
    response_model=UserListItem,
    summary="更新用户",
    description="管理员更新用户信息"
)
async def update_user(
    user_id: str,
    request: UpdateUserRequest,
    admin_id: str = Depends(require_admin)
):
    """更新用户信息"""
    try:
        users_collection = await get_users_collection()
        
        # 查询用户
        user_doc = await users_collection.find_one({"user_id": user_id})
        if not user_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "USER_NOT_FOUND", "message": "用户不存在"}}
            )
        
        # 构建更新数据
        update_data = {"updated_at": datetime.utcnow()}
        if request.nickname is not None:
            update_data["nickname"] = request.nickname
        if request.role is not None:
            update_data["role"] = request.role
        
        # 更新用户
        await users_collection.update_one(
            {"user_id": user_id},
            {"$set": update_data}
        )
        
        # 获取更新后的用户
        updated_user = await users_collection.find_one({"user_id": user_id})
        
        logger.info(f"管理员更新用户 - AdminID: {admin_id}, TargetUserID: {user_id}")
        
        return UserListItem(
            user_id=updated_user["user_id"],
            nickname=updated_user.get("nickname"),
            email=updated_user.get("email"),
            phone=updated_user.get("phone"),
            role=updated_user.get("role", "user"),
            is_anonymous=updated_user.get("is_anonymous", False),
            created_at=updated_user["created_at"],
            last_login_at=updated_user.get("last_login_at")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新用户失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "UPDATE_USER_ERROR", "message": str(e)}}
        )


@router.delete(
    "/users/{user_id}",
    summary="删除用户",
    description="管理员删除用户（软删除）"
)
async def delete_user(
    user_id: str,
    admin_id: str = Depends(require_admin)
):
    """删除用户"""
    try:
        users_collection = await get_users_collection()
        
        # 检查用户是否存在
        user_doc = await users_collection.find_one({"user_id": user_id})
        if not user_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "USER_NOT_FOUND", "message": "用户不存在"}}
            )
        
        # 不允许删除管理员
        if user_doc.get("role") == "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": {"code": "CANNOT_DELETE_ADMIN", "message": "不能删除管理员用户"}}
            )
        
        # 软删除：标记为已删除
        await users_collection.update_one(
            {"user_id": user_id},
            {"$set": {"deleted": True, "deleted_at": datetime.utcnow()}}
        )
        
        logger.info(f"管理员删除用户 - AdminID: {admin_id}, TargetUserID: {user_id}")
        
        return {"message": "用户已删除", "user_id": user_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除用户失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "DELETE_USER_ERROR", "message": str(e)}}
        )


@router.get(
    "/sessions",
    response_model=SessionListResponse,
    summary="获取会话列表",
    description="分页获取所有用户的会话记录"
)
async def get_sessions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    type: Optional[str] = Query(None, description="类型筛选"),
    user_id: Optional[str] = Query(None, description="用户ID筛选"),
    admin_id: str = Depends(require_admin)
):
    """获取会话列表"""
    try:
        sessions_collection = await get_sessions_collection()
        users_collection = await get_users_collection()
        
        # 构建查询条件
        query = {"status": "completed"}
        if type:
            query["type"] = type
        if user_id:
            query["user_id"] = user_id
        
        # 分页查询
        skip = (page - 1) * page_size
        cursor = sessions_collection.find(query).sort("created_at", -1).skip(skip).limit(page_size)
        
        items = []
        async for doc in cursor:
            # 获取用户昵称
            user_doc = await users_collection.find_one({"user_id": doc["user_id"]})
            user_nickname = user_doc.get("nickname") if user_doc else None
            
            session_type = doc.get("type", "conflict")
            risk_level = None
            if session_type == "conflict" or not session_type:
                risk_level = doc.get("risk_classification", {}).get("risk_level")
            
            items.append(SessionListItem(
                session_id=doc["session_id"],
                user_id=doc["user_id"],
                user_nickname=user_nickname,
                type=session_type,
                status=doc.get("status", "completed"),
                risk_level=risk_level,
                created_at=doc["created_at"],
                completed_at=doc.get("completed_at")
            ))
        
        total = await sessions_collection.count_documents(query)
        
        return SessionListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size
        )
        
    except Exception as e:
        logger.error(f"获取会话列表失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "GET_SESSIONS_ERROR", "message": str(e)}}
        )


@router.get(
    "/usage-limits",
    response_model=list,
    summary="获取所有用户使用限制",
    description="获取所有用户的使用限制信息"
)
async def get_all_usage_limits(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin_id: str = Depends(require_admin)
):
    """获取所有用户使用限制"""
    try:
        from app.db.mongodb import MongoDB
        limits_collection = MongoDB.get_collection("user_usage_limits")
        users_collection = await get_users_collection()
        
        # 分页查询
        skip = (page - 1) * page_size
        cursor = limits_collection.find({}).sort("created_at", -1).skip(skip).limit(page_size)
        
        items = []
        async for doc in cursor:
            # 获取用户昵称
            user_doc = await users_collection.find_one({"user_id": doc["user_id"]})
            user_nickname = user_doc.get("nickname") if user_doc else None
            
            items.append(UserUsageLimitDetail(
                user_id=doc["user_id"],
                user_nickname=user_nickname,
                user_level=doc.get("user_level", "free"),
                limits=doc.get("limits", {}),
                usage=doc.get("usage", {}),
                created_at=doc["created_at"],
                updated_at=doc["updated_at"]
            ))
        
        return items
        
    except Exception as e:
        logger.error(f"获取使用限制列表失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "GET_LIMITS_ERROR", "message": str(e)}}
        )


@router.put(
    "/usage-limits/{user_id}",
    summary="更新用户使用限制",
    description="管理员更新用户的使用限制"
)
async def update_usage_limit(
    user_id: str,
    request: UsageLimitUpdate,
    admin_id: str = Depends(require_admin)
):
    """更新用户使用限制"""
    try:
        from app.db.mongodb import MongoDB
        limits_collection = MongoDB.get_collection("user_usage_limits")
        
        # 检查用户限制是否存在
        limit_doc = await limits_collection.find_one({"user_id": user_id})
        if not limit_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "LIMIT_NOT_FOUND", "message": "用户使用限制不存在"}}
            )
        
        # 构建更新数据
        update_data = {"updated_at": datetime.utcnow()}
        if request.conflict_analysis_limit is not None:
            update_data["limits.conflict_analysis_limit"] = request.conflict_analysis_limit
        if request.situation_judge_limit is not None:
            update_data["limits.situation_judge_limit"] = request.situation_judge_limit
        if request.expression_helper_limit is not None:
            update_data["limits.expression_helper_limit"] = request.expression_helper_limit
        if request.ai_chat_limit is not None:
            update_data["limits.ai_chat_limit"] = request.ai_chat_limit
        
        # 更新限制
        await limits_collection.update_one(
            {"user_id": user_id},
            {"$set": update_data}
        )
        
        logger.info(f"管理员更新使用限制 - AdminID: {admin_id}, TargetUserID: {user_id}")
        
        return {"message": "使用限制已更新", "user_id": user_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新使用限制失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "UPDATE_LIMIT_ERROR", "message": str(e)}}
        )


@router.post(
    "/usage-limits/{user_id}/reset",
    summary="重置用户使用次数",
    description="管理员重置用户的使用次数"
)
async def reset_usage(
    user_id: str,
    admin_id: str = Depends(require_admin)
):
    """重置用户使用次数"""
    try:
        success = await usage_limit_service.reset_user_usage(user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "USER_NOT_FOUND", "message": "用户不存在"}}
            )
        
        logger.info(f"管理员重置使用次数 - AdminID: {admin_id}, TargetUserID: {user_id}")
        
        return {"message": "使用次数已重置", "user_id": user_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"重置使用次数失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "RESET_USAGE_ERROR", "message": str(e)}}
        )


