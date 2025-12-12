"""
用户反馈 API 路由
"""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime
import uuid
import logging

from app.models.feedback import (
    FeedbackCreate,
    FeedbackResponse,
    FeedbackListResponse,
    FeedbackUpdateStatus
)
from app.core.security import decode_access_token
from app.db.mongodb import get_feedbacks_collection

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()


@router.post(
    "/submit",
    response_model=FeedbackResponse,
    summary="提交用户反馈",
    description="用户提交反馈内容"
)
async def submit_feedback(
    request: FeedbackCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    提交用户反馈

    流程：
    1. 验证用户 token
    2. 创建反馈记录
    3. 存储到数据库
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

        # 创建反馈记录
        feedback_id = str(uuid.uuid4())
        feedback_doc = {
            "feedback_id": feedback_id,
            "user_id": user_id,
            "content": request.content,
            "contact": request.contact,
            "status": "pending",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        # 存储到数据库
        feedbacks_collection = await get_feedbacks_collection()
        await feedbacks_collection.insert_one(feedback_doc)

        logger.info(f"Feedback submitted - FeedbackID: {feedback_id}, UserID: {user_id}")

        return FeedbackResponse(
            feedback_id=feedback_id,
            user_id=user_id,
            content=request.content,
            contact=request.contact,
            status="pending",
            created_at=feedback_doc["created_at"]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"提交反馈失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "SUBMIT_FEEDBACK_ERROR",
                    "message": "提交反馈失败",
                    "details": str(e)
                }
            }
        )


@router.get(
    "/list",
    response_model=FeedbackListResponse,
    summary="获取反馈列表（管理员）",
    description="管理员获取所有用户反馈列表"
)
async def get_feedbacks(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    status_filter: str = Query(None, description="状态筛选：pending/read/replied"),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    获取反馈列表（管理员功能）

    需要管理员权限
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

        # 检查管理员权限
        user_role = payload.get("role", "user")
        if user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "INSUFFICIENT_PERMISSIONS",
                        "message": "需要管理员权限",
                        "details": {}
                    }
                }
            )

        feedbacks_collection = await get_feedbacks_collection()

        # 构建查询条件
        query = {}
        if status_filter:
            query["status"] = status_filter

        # 计算总数
        total = await feedbacks_collection.count_documents(query)

        # 分页查询
        skip = (page - 1) * page_size
        cursor = feedbacks_collection.find(query).sort("created_at", -1).skip(skip).limit(page_size)

        feedbacks = []
        async for doc in cursor:
            feedbacks.append(FeedbackResponse(
                feedback_id=doc["feedback_id"],
                user_id=doc["user_id"],
                content=doc["content"],
                contact=doc.get("contact"),
                status=doc["status"],
                created_at=doc["created_at"]
            ))

        return FeedbackListResponse(
            feedbacks=feedbacks,
            total=total,
            page=page,
            page_size=page_size
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取反馈列表失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "GET_FEEDBACKS_ERROR",
                    "message": "获取反馈列表失败",
                    "details": str(e)
                }
            }
        )


@router.put(
    "/{feedback_id}/status",
    summary="更新反馈状态（管理员）",
    description="管理员更新反馈状态"
)
async def update_feedback_status(
    feedback_id: str,
    request: FeedbackUpdateStatus,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    更新反馈状态（管理员功能）

    需要管理员权限
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

        # 检查管理员权限
        user_role = payload.get("role", "user")
        if user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "INSUFFICIENT_PERMISSIONS",
                        "message": "需要管理员权限",
                        "details": {}
                    }
                }
            )

        feedbacks_collection = await get_feedbacks_collection()

        # 更新状态
        result = await feedbacks_collection.update_one(
            {"feedback_id": feedback_id},
            {
                "$set": {
                    "status": request.status,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": {
                        "code": "FEEDBACK_NOT_FOUND",
                        "message": "反馈不存在",
                        "details": {}
                    }
                }
            )

        logger.info(f"Feedback status updated - FeedbackID: {feedback_id}, Status: {request.status}")

        return {"message": "状态更新成功"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新反馈状态失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "UPDATE_FEEDBACK_ERROR",
                    "message": "更新反馈状态失败",
                    "details": str(e)
                }
            }
        )
