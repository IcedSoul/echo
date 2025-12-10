"""
分析相关 API 路由
"""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime
from typing import Optional, List
import logging

from app.models.analysis import (
    AnalyzeConflictRequest,
    AnalyzeConflictResponse,
    HistoryItem,
    HistoryResponse
)
from app.services.orchestrator import orchestrator
from app.core.security import decode_access_token
from app.db.mongodb import get_sessions_collection

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer(auto_error=False)  # auto_error=False 允许匿名访问


@router.post(
    "/analyze-conflict",
    response_model=AnalyzeConflictResponse,
    summary="分析矛盾冲突",
    description="提交聊天记录进行矛盾分析，返回结构化的分析结果（接入真实 LLM）"
)
async def analyze_conflict(request: AnalyzeConflictRequest):
    """
    矛盾分析接口（Phase 2 - 真实 LLM 版本）
    
    完整流程：
    1. 风险分类
    2. 选择 Prompt 模板
    3. 调用 LLM 生成分析
    4. 安全审查
    5. 返回结果
    """
    try:
        logger.info(
            f"收到分析请求 - UserID: {request.user_id}, "
            f"TextLength: {len(request.conversation_text)}"
        )
        
        # 调用 Orchestrator 执行完整分析流程
        result = await orchestrator.analyze(request)
        
        # 将 dict 转换为 Pydantic 模型
        response = AnalyzeConflictResponse(**result)
        
        logger.info(
            f"分析完成 - SessionID: {response.session_id}, "
            f"RiskLevel: {response.risk_level}"
        )
        
        return response
        
    except Exception as e:
        logger.error(f"分析接口错误: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "分析过程遇到错误，请稍后重试",
                    "details": str(e)
                }
            }
        )


@router.get(
    "/sessions/{session_id}",
    response_model=AnalyzeConflictResponse,
    summary="获取分析结果",
    description="根据 session_id 获取历史分析结果"
)
async def get_analysis_session(
    session_id: str,
    user_id: Optional[str] = Query(None, description="用户 ID（匿名用户需提供）"),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """
    获取单次分析结果详情
    
    需要验证用户权限（只能查看自己的分析记录）
    - 登录用户：通过 token 验证
    - 匿名用户：通过 user_id 查询参数验证
    """
    try:
        # 获取用户 ID（优先使用 token 中的）
        authenticated_user_id = None
        if credentials:
            payload = decode_access_token(credentials.credentials)
            if payload:
                authenticated_user_id = payload.get("user_id")
        
        # 确定要验证的用户 ID
        request_user_id = authenticated_user_id or user_id
        
        if not request_user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": {
                        "code": "USER_ID_REQUIRED",
                        "message": "需要提供用户 ID",
                        "details": {}
                    }
                }
            )
        
        sessions = await get_sessions_collection()
        session_doc = await sessions.find_one({"session_id": session_id})
        
        if not session_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": {
                        "code": "SESSION_NOT_FOUND",
                        "message": "分析记录不存在",
                        "details": {}
                    }
                }
            )
        
        # 权限验证：只能查看自己的记录
        if session_doc.get("user_id") != request_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "ACCESS_DENIED",
                        "message": "无权访问此分析记录",
                        "details": {}
                    }
                }
            )
        
        return AnalyzeConflictResponse(
            session_id=session_doc["session_id"],
            status=session_doc.get("status", "completed"),
            risk_level=session_doc.get("risk_classification", {}).get("risk_level", "LOW"),
            analysis_result=session_doc.get("analysis_result"),
            created_at=session_doc["created_at"],
            completed_at=session_doc.get("completed_at")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取分析记录失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "GET_SESSION_ERROR",
                    "message": "获取分析记录失败",
                    "details": str(e)
                }
            }
        )


@router.get(
    "/history",
    response_model=HistoryResponse,
    summary="获取用户历史记录",
    description="获取当前用户的分析历史记录列表"
)
async def get_user_history(
    user_id: str = Query(..., description="用户 ID（登录用户或匿名用户临时 ID）"),
    limit: int = Query(50, ge=1, le=100, description="返回数量限制"),
    offset: int = Query(0, ge=0, description="偏移量"),
    type: Optional[str] = Query(None, description="记录类型：conflict, situation, expression"),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """
    获取用户的分析历史记录
    
    安全机制：
    - 登录用户：只能查询自己的记录（通过 token 验证）
    - 匿名用户：通过传入的 user_id 查询（客户端生成的临时 ID）
    
    支持按类型过滤：
    - conflict: 冲突复盘
    - situation: 情况评理
    - expression: 表达助手
    """
    try:
        # 验证用户权限
        authenticated_user_id = None
        if credentials:
            payload = decode_access_token(credentials.credentials)
            if payload:
                authenticated_user_id = payload.get("user_id")
        
        # 如果是登录用户，必须查询自己的记录
        if authenticated_user_id and authenticated_user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "ACCESS_DENIED",
                        "message": "只能查询自己的历史记录",
                        "details": {}
                    }
                }
            )
        
        sessions = await get_sessions_collection()
        
        # 构建查询条件
        query = {
            "user_id": user_id,
            "status": "completed"  # 只返回已完成的
        }
        
        # 按类型过滤
        if type:
            if type == "conflict":
                # 冲突复盘：没有 type 字段或 type 为空的旧记录
                query["$or"] = [
                    {"type": {"$exists": False}},
                    {"type": None},
                    {"type": "conflict"}
                ]
            else:
                query["type"] = type
        
        # 查询用户的历史记录
        cursor = sessions.find(query).sort("created_at", -1).skip(offset).limit(limit)
        
        items = []
        async for doc in cursor:
            doc_type = doc.get("type", "conflict")  # 默认为 conflict
            
            # 根据类型提取 summary
            if doc_type == "conflict" or not doc_type:
                summary = doc.get("analysis_result", {}).get("summary", "")
                risk_level = doc.get("risk_classification", {}).get("risk_level", "LOW")
            elif doc_type == "situation":
                summary = doc.get("analysis_result", {}).get("summary", "")
                risk_level = None
            elif doc_type == "expression":
                # 表达助手没有 summary，使用第一条表达
                expressions = doc.get("expressions", [])
                summary = expressions[0].get("text", "") if expressions else ""
                risk_level = None
            else:
                summary = ""
                risk_level = None
            
            items.append(HistoryItem(
                session_id=doc["session_id"],
                risk_level=risk_level or "LOW",
                summary=summary,
                created_at=doc["created_at"]
            ))
        
        # 获取总数
        total = await sessions.count_documents(query)
        
        logger.info(f"获取历史记录 - UserID: {user_id}, Type: {type}, Count: {len(items)}, Total: {total}")
        
        return HistoryResponse(
            items=items,
            total=total,
            limit=limit,
            offset=offset
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取历史记录失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "GET_HISTORY_ERROR",
                    "message": "获取历史记录失败",
                    "details": str(e)
                }
            }
        )
