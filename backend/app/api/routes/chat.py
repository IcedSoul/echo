"""
AI 聊天 API 路由
"""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.responses import StreamingResponse
from datetime import datetime
from typing import Optional, AsyncGenerator
import logging
import uuid
import base64
import json

from app.models.chat import (
    SendMessageRequest,
    SendMessageResponse,
    CreateSessionRequest,
    ChatMessage,
    ChatSessionInfo,
    ChatHistoryItem,
    ChatHistoryResponse,
    SessionMessagesResponse
)
from app.services.llm_client import llm_client, LLMAPIError, LLMTimeoutError
from app.prompts.chat import CHAT_SYSTEM_MESSAGE
from app.db.mongodb import MongoDB
from app.core.security import decode_access_token
from app.services.usage_limit_service import usage_limit_service

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer(auto_error=False)


async def get_chat_sessions_collection():
    """获取聊天会话集合"""
    return MongoDB.db["chat_sessions"]


def get_fallback_response() -> str:
    """获取降级响应"""
    return "抱歉，我现在遇到了一些技术问题，暂时无法回复你。请稍后再试，或者你可以尝试使用其他功能，比如「冲突复盘」或「表达助手」来帮助你。"


@router.post(
    "/chat/sessions",
    response_model=ChatSessionInfo,
    summary="创建新聊天会话",
    description="创建一个新的AI聊天会话"
)
async def create_chat_session(
    request: CreateSessionRequest,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """创建新的聊天会话"""
    try:
        # 验证用户身份
        if credentials:
            decode_access_token(credentials.credentials)
        
        session_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # 生成默认标题
        title = request.title or f"新对话 {now.strftime('%m-%d %H:%M')}"
        
        # 创建会话文档
        sessions = await get_chat_sessions_collection()
        session_doc = {
            "session_id": session_id,
            "user_id": request.user_id,
            "title": title,
            "messages": [],
            "created_at": now,
            "updated_at": now
        }
        await sessions.insert_one(session_doc)
        
        logger.info(f"创建聊天会话 - SessionID: {session_id}, UserID: {request.user_id}")
        
        return ChatSessionInfo(
            session_id=session_id,
            title=title,
            created_at=now,
            updated_at=now,
            message_count=0
        )
        
    except Exception as e:
        logger.error(f"创建聊天会话失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "CREATE_SESSION_FAILED", "message": str(e)}}
        )


@router.post(
    "/chat/send",
    response_model=SendMessageResponse,
    summary="发送消息",
    description="发送消息并获取AI回复"
)
async def send_message(
    request: SendMessageRequest,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """发送消息并获取AI回复"""
    try:
        # 验证用户身份
        if credentials:
            decode_access_token(credentials.credentials)
        
        # 检查使用限制
        usage_check = await usage_limit_service.check_usage_limit(
            request.user_id,
            "ai_chat"
        )
        
        if not usage_check.allowed:
            logger.warning(
                f"使用次数超限 - UserID: {request.user_id}, "
                f"Feature: ai_chat"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "USAGE_LIMIT_EXCEEDED",
                        "message": usage_check.message,
                        "details": {
                            "feature": "ai_chat",
                            "used": usage_check.used,
                            "limit": usage_check.limit
                        }
                    }
                }
            )
        
        sessions = await get_chat_sessions_collection()
        now = datetime.utcnow()
        
        # 如果没有 session_id，创建新会话
        if not request.session_id:
            session_id = str(uuid.uuid4())
            title = request.message[:20] + "..." if len(request.message) > 20 else request.message
            session_doc = {
                "session_id": session_id,
                "user_id": request.user_id,
                "title": title,
                "messages": [],
                "created_at": now,
                "updated_at": now
            }
            await sessions.insert_one(session_doc)
            logger.info(f"自动创建聊天会话 - SessionID: {session_id}")
        else:
            session_id = request.session_id
            # 验证会话存在且属于该用户
            session = await sessions.find_one({
                "session_id": session_id,
                "user_id": request.user_id
            })
            if not session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={"error": {"code": "SESSION_NOT_FOUND", "message": "会话不存在"}}
                )
        
        # 获取会话历史
        session = await sessions.find_one({"session_id": session_id})
        history = session.get("messages", []) if session else []
        
        # 处理图片（如果有）
        image_url = None
        if request.image_base64:
            # 这里可以将图片上传到云存储，返回URL
            # 简化处理：直接使用 data URL
            image_url = f"data:image/jpeg;base64,{request.image_base64[:100]}..."  # 截断显示
        
        # 创建用户消息记录
        user_message = {
            "role": "user",
            "content": request.message,
            "timestamp": now.isoformat(),
            "image_url": image_url
        }
        
        # 构建对话上下文作为prompt
        context_parts = []
        recent_history = history[-10:] if len(history) > 10 else history  # 最多10条历史
        for msg in recent_history:
            role_label = "用户" if msg["role"] == "user" else "助手"
            context_parts.append(f"{role_label}: {msg['content']}")
        
        if context_parts:
            context_str = "\n".join(context_parts)
            full_prompt = f"以下是之前的对话记录：\n\n{context_str}\n\n用户现在说: {request.message}\n\n请作为助手回复用户。"
        else:
            full_prompt = request.message
        
        if image_url:
            full_prompt = f"[用户发送了一张图片]\n\n{full_prompt}"
        
        # 调用 LLM
        try:
            llm_result = await llm_client.generate_with_metadata(
                prompt=full_prompt,
                system_message=CHAT_SYSTEM_MESSAGE,
                temperature=0.8,
                max_tokens=1000,
                force_json=False
            )
            ai_content = llm_result["content"]
            
        except (LLMAPIError, LLMTimeoutError) as e:
            logger.error(f"LLM 调用失败 - SessionID: {session_id}, Error: {e}")
            ai_content = get_fallback_response()
        
        # 创建AI回复记录
        reply_time = datetime.utcnow()
        ai_message = {
            "role": "assistant",
            "content": ai_content,
            "timestamp": reply_time.isoformat()
        }
        
        # 更新会话
        await sessions.update_one(
            {"session_id": session_id},
            {
                "$push": {"messages": {"$each": [user_message, ai_message]}},
                "$set": {"updated_at": reply_time}
            }
        )
        
        # 增加使用次数（每次对话算一次）
        await usage_limit_service.increment_usage(
            request.user_id,
            "ai_chat"
        )
        
        logger.info(f"消息发送成功 - SessionID: {session_id}")
        
        return SendMessageResponse(
            session_id=session_id,
            message=ChatMessage(
                role="user",
                content=request.message,
                timestamp=now,
                image_url=image_url
            ),
            reply=ChatMessage(
                role="assistant",
                content=ai_content,
                timestamp=reply_time
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"发送消息失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "SEND_MESSAGE_FAILED", "message": str(e)}}
        )


@router.get(
    "/chat/sessions",
    response_model=ChatHistoryResponse,
    summary="获取聊天历史列表",
    description="获取用户的所有聊天会话列表"
)
async def get_chat_sessions(
    user_id: str = Query(..., description="用户ID"),
    limit: int = Query(20, ge=1, le=100, description="返回数量限制"),
    offset: int = Query(0, ge=0, description="偏移量"),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """获取用户的聊天会话列表"""
    try:
        if credentials:
            decode_access_token(credentials.credentials)
        
        sessions = await get_chat_sessions_collection()
        
        # 查询用户的所有会话
        cursor = sessions.find(
            {"user_id": user_id}
        ).sort("updated_at", -1).skip(offset).limit(limit)
        
        items = []
        async for doc in cursor:
            # 获取最后一条消息
            messages = doc.get("messages", [])
            last_message = ""
            if messages:
                last_msg = messages[-1]
                last_message = last_msg.get("content", "")[:50]
                if len(last_msg.get("content", "")) > 50:
                    last_message += "..."
            
            items.append(ChatHistoryItem(
                session_id=doc["session_id"],
                title=doc.get("title", "新对话"),
                last_message=last_message,
                created_at=doc["created_at"],
                updated_at=doc.get("updated_at", doc["created_at"])
            ))
        
        total = await sessions.count_documents({"user_id": user_id})
        
        return ChatHistoryResponse(
            sessions=items,
            total=total
        )
        
    except Exception as e:
        logger.error(f"获取聊天历史失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "GET_SESSIONS_FAILED", "message": str(e)}}
        )


@router.get(
    "/chat/sessions/{session_id}",
    response_model=SessionMessagesResponse,
    summary="获取会话消息",
    description="获取指定会话的所有消息"
)
async def get_session_messages(
    session_id: str,
    user_id: str = Query(..., description="用户ID"),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """获取指定会话的所有消息"""
    try:
        if credentials:
            decode_access_token(credentials.credentials)
        
        sessions = await get_chat_sessions_collection()
        
        session = await sessions.find_one({
            "session_id": session_id,
            "user_id": user_id
        })
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "SESSION_NOT_FOUND", "message": "会话不存在"}}
            )
        
        # 转换消息格式
        messages = []
        for msg in session.get("messages", []):
            messages.append(ChatMessage(
                role=msg["role"],
                content=msg["content"],
                timestamp=datetime.fromisoformat(msg["timestamp"]) if isinstance(msg.get("timestamp"), str) else msg.get("timestamp"),
                image_url=msg.get("image_url")
            ))
        
        return SessionMessagesResponse(
            session_id=session_id,
            title=session.get("title", "新对话"),
            messages=messages,
            created_at=session["created_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取会话消息失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "GET_MESSAGES_FAILED", "message": str(e)}}
        )


@router.delete(
    "/chat/sessions/{session_id}",
    summary="删除会话",
    description="删除指定的聊天会话"
)
async def delete_chat_session(
    session_id: str,
    user_id: str = Query(..., description="用户ID"),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """删除聊天会话"""
    try:
        if credentials:
            decode_access_token(credentials.credentials)

        sessions = await get_chat_sessions_collection()

        result = await sessions.delete_one({
            "session_id": session_id,
            "user_id": user_id
        })

        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "SESSION_NOT_FOUND", "message": "会话不存在"}}
            )

        logger.info(f"删除聊天会话 - SessionID: {session_id}")

        return {"message": "会话已删除", "session_id": session_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除会话失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "DELETE_SESSION_FAILED", "message": str(e)}}
        )


@router.post(
    "/chat/send/stream",
    summary="发送消息（流式）",
    description="发送消息并以流式方式获取AI回复"
)
async def send_message_stream(
    request: SendMessageRequest,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """发送消息并以流式方式获取AI回复"""

    async def event_generator() -> AsyncGenerator[str, None]:
        """SSE 事件生成器"""
        try:
            # 验证用户身份
            if credentials:
                decode_access_token(credentials.credentials)

            # 检查使用限制
            usage_check = await usage_limit_service.check_usage_limit(
                request.user_id,
                "ai_chat"
            )

            if not usage_check.allowed:
                logger.warning(
                    f"使用次数超限 - UserID: {request.user_id}, Feature: ai_chat"
                )
                error_data = {
                    "error": {
                        "code": "USAGE_LIMIT_EXCEEDED",
                        "message": usage_check.message,
                        "details": {
                            "feature": "ai_chat",
                            "used": usage_check.used,
                            "limit": usage_check.limit
                        }
                    }
                }
                yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
                return

            sessions = await get_chat_sessions_collection()
            now = datetime.utcnow()

            # 如果没有 session_id，创建新会话
            if not request.session_id:
                session_id = str(uuid.uuid4())
                title = request.message[:20] + "..." if len(request.message) > 20 else request.message
                session_doc = {
                    "session_id": session_id,
                    "user_id": request.user_id,
                    "title": title,
                    "messages": [],
                    "created_at": now,
                    "updated_at": now
                }
                await sessions.insert_one(session_doc)
                logger.info(f"自动创建聊天会话 - SessionID: {session_id}")

                # 发送 session_id
                yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id}, ensure_ascii=False)}\n\n"
            else:
                session_id = request.session_id
                # 验证会话存在且属于该用户
                session = await sessions.find_one({
                    "session_id": session_id,
                    "user_id": request.user_id
                })
                if not session:
                    error_data = {"error": {"code": "SESSION_NOT_FOUND", "message": "会话不存在"}}
                    yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
                    return

            # 获取会话历史
            session = await sessions.find_one({"session_id": session_id})
            history = session.get("messages", []) if session else []

            # 处理图片（如果有）
            image_url = None
            if request.image_base64:
                image_url = f"data:image/jpeg;base64,{request.image_base64[:100]}..."

            # 创建用户消息记录
            user_message = {
                "role": "user",
                "content": request.message,
                "timestamp": now.isoformat(),
                "image_url": image_url
            }

            # 构建对话上下文
            context_parts = []
            recent_history = history[-10:] if len(history) > 10 else history
            for msg in recent_history:
                role_label = "用户" if msg["role"] == "user" else "助手"
                context_parts.append(f"{role_label}: {msg['content']}")

            if context_parts:
                context_str = "\n".join(context_parts)
                full_prompt = f"以下是之前的对话记录：\n\n{context_str}\n\n用户现在说: {request.message}\n\n请作为助手回复用户。"
            else:
                full_prompt = request.message

            if image_url:
                full_prompt = f"[用户发送了一张图片]\n\n{full_prompt}"

            # 流式调用 LLM
            ai_content_parts = []
            try:
                async for content_chunk in llm_client.generate_stream(
                    prompt=full_prompt,
                    system_message=CHAT_SYSTEM_MESSAGE,
                    temperature=0.8,
                    max_tokens=1000
                ):
                    ai_content_parts.append(content_chunk)
                    # 发送内容片段
                    chunk_data = {
                        "type": "content",
                        "content": content_chunk
                    }
                    yield f"data: {json.dumps(chunk_data, ensure_ascii=False)}\n\n"

                ai_content = "".join(ai_content_parts)

            except (LLMAPIError, LLMTimeoutError) as e:
                logger.error(f"LLM 调用失败 - SessionID: {session_id}, Error: {e}")
                ai_content = get_fallback_response()
                # 发送降级响应
                chunk_data = {
                    "type": "content",
                    "content": ai_content
                }
                yield f"data: {json.dumps(chunk_data, ensure_ascii=False)}\n\n"

            # 创建AI回复记录
            reply_time = datetime.utcnow()
            ai_message = {
                "role": "assistant",
                "content": ai_content,
                "timestamp": reply_time.isoformat()
            }

            # 更新会话
            await sessions.update_one(
                {"session_id": session_id},
                {
                    "$push": {"messages": {"$each": [user_message, ai_message]}},
                    "$set": {"updated_at": reply_time}
                }
            )

            # 增加使用次数
            await usage_limit_service.increment_usage(
                request.user_id,
                "ai_chat"
            )

            # 发送完成信号
            done_data = {
                "type": "done",
                "session_id": session_id,
                "timestamp": reply_time.isoformat()
            }
            yield f"data: {json.dumps(done_data, ensure_ascii=False)}\n\n"

            logger.info(f"流式消息发送成功 - SessionID: {session_id}")

        except Exception as e:
            logger.error(f"流式发送消息失败: {e}", exc_info=True)
            error_data = {
                "error": {
                    "code": "SEND_MESSAGE_FAILED",
                    "message": str(e)
                }
            }
            yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # 禁用 nginx 缓冲
        }
    )

