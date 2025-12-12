"""
表达助手 API 路由
"""
from fastapi import APIRouter, HTTPException, status
from datetime import datetime
import logging
import uuid

from app.models.expression_helper import (
    ExpressionHelperRequest,
    ExpressionHelperResponse,
    ExpressionItem
)
from app.services.llm_client import llm_client, parse_llm_json, LLMAPIError, LLMTimeoutError
from app.prompts.expression_helper import (
    get_expression_helper_prompt,
    EXPRESSION_HELPER_SYSTEM_MESSAGE
)
from app.db.mongodb import get_sessions_collection
from app.core.security import encrypt_text
from app.services.usage_limit_service import usage_limit_service

logger = logging.getLogger(__name__)
router = APIRouter()


def get_fallback_response() -> list:
    """获取降级响应"""
    return [
        {
            "style": "温和表达",
            "text": "我能理解这件事对你来说可能也不容易。我想和你聊聊我的感受——当那件事发生时，我感到有些受伤。我希望我们能一起找到让彼此都舒服的方式，你觉得呢？"
        },
        {
            "style": "坚定表达",
            "text": "我需要和你明确一件事。这次发生的情况让我很不舒服，我希望以后不要再发生类似的事情。我们可以讨论如何改善，但这个问题需要被正视。"
        },
        {
            "style": "理性清晰表达",
            "text": "我想客观地和你讨论一下这件事。从我的角度来看，发生了A，这让我产生了B的感受。我理解你可能有不同的视角，所以我想听听你的想法，看看我们能不能找到一个双方都能接受的解决方案。"
        }
    ]


@router.post(
    "/expression-helper",
    response_model=ExpressionHelperResponse,
    summary="表达助手",
    description="优化用户的表达方式，生成多种风格的表达"
)
async def generate_expressions(request: ExpressionHelperRequest):
    """
    表达助手接口
    
    流程：
    1. 生成 Prompt
    2. 调用 LLM 生成
    3. 解析结果
    4. 返回表达结果
    """
    session_id = str(uuid.uuid4())
    
    try:
        logger.info(
            f"收到表达助手请求 - SessionID: {session_id}, "
            f"UserID: {request.user_id}, "
            f"Intent: {request.intent}, "
            f"TextLength: {len(request.original_message)}"
        )
        
        # 检查使用限制
        usage_check = await usage_limit_service.check_usage_limit(
            request.user_id,
            "expression_helper"
        )
        
        if not usage_check.allowed:
            logger.warning(
                f"使用次数超限 - UserID: {request.user_id}, "
                f"Feature: expression_helper"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "USAGE_LIMIT_EXCEEDED",
                        "message": usage_check.message,
                        "details": {
                            "feature": "expression_helper",
                            "used": usage_check.used,
                            "limit": usage_check.limit
                        }
                    }
                }
            )
        
        # 创建会话记录
        sessions = await get_sessions_collection()
        session_doc = {
            "session_id": session_id,
            "user_id": request.user_id,
            "type": "expression_helper",
            "intent": request.intent,
            "status": "processing",
            "input_encrypted": encrypt_text(request.original_message),
            "created_at": datetime.utcnow()
        }
        await sessions.insert_one(session_doc)
        
        # 增加使用次数
        await usage_limit_service.increment_usage(
            request.user_id,
            "expression_helper"
        )
        
        # 生成 Prompt
        prompt = get_expression_helper_prompt(
            request.original_message,
            request.intent
        )
        
        # 调用 LLM
        try:
            llm_result = await llm_client.generate_with_metadata(
                prompt=prompt,
                system_message=EXPRESSION_HELPER_SYSTEM_MESSAGE,
                temperature=0.7,
                max_tokens=1500,
                force_json=True
            )
            llm_content = llm_result["content"]
            
        except (LLMAPIError, LLMTimeoutError) as e:
            logger.error(f"LLM 调用失败 - SessionID: {session_id}, Error: {e}")
            expressions = get_fallback_response()
            
            await sessions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "status": "completed",
                    "expressions": expressions,
                    "error_message": f"LLM 调用失败: {str(e)}",
                    "completed_at": datetime.utcnow()
                }}
            )
            
            return ExpressionHelperResponse(
                session_id=session_id,
                status="completed",
                expressions=[ExpressionItem(**exp) for exp in expressions],
                created_at=datetime.utcnow(),
                completed_at=datetime.utcnow()
            )
        
        # 解析 LLM 输出
        try:
            parsed_result = parse_llm_json(llm_content)
            expressions_data = parsed_result.get("expressions", [])
        except ValueError as e:
            logger.error(f"JSON 解析失败 - SessionID: {session_id}, Error: {e}")
            expressions = get_fallback_response()
            
            await sessions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "status": "completed",
                    "expressions": expressions,
                    "error_message": f"JSON 解析失败: {str(e)}",
                    "completed_at": datetime.utcnow()
                }}
            )
            
            return ExpressionHelperResponse(
                session_id=session_id,
                status="completed",
                expressions=[ExpressionItem(**exp) for exp in expressions],
                created_at=datetime.utcnow(),
                completed_at=datetime.utcnow()
            )
        
        # 验证并构建结果
        try:
            expressions = [ExpressionItem(**exp) for exp in expressions_data]
            if len(expressions) < 3:
                # 补充缺失的表达风格
                fallback = get_fallback_response()
                while len(expressions) < 3:
                    expressions.append(ExpressionItem(**fallback[len(expressions)]))
        except Exception as e:
            logger.error(f"结果验证失败 - SessionID: {session_id}, Error: {e}")
            expressions = [ExpressionItem(**exp) for exp in get_fallback_response()]
        
        # 更新会话记录
        completed_at = datetime.utcnow()
        await sessions.update_one(
            {"session_id": session_id},
            {"$set": {
                "status": "completed",
                "expressions": [exp.model_dump() for exp in expressions],
                "completed_at": completed_at
            }}
        )
        
        logger.info(f"表达助手完成 - SessionID: {session_id}")
        
        return ExpressionHelperResponse(
            session_id=session_id,
            status="completed",
            expressions=expressions,
            created_at=datetime.utcnow(),
            completed_at=completed_at
        )
        
    except Exception as e:
        logger.error(f"表达助手接口错误: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "生成过程遇到错误，请稍后重试",
                    "details": str(e)
                }
            }
        )

