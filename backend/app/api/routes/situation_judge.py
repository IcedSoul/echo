"""
情况评理 API 路由
"""
from fastapi import APIRouter, HTTPException, status
from datetime import datetime
import logging
import uuid

from app.models.situation_judge import (
    SituationJudgeRequest,
    SituationJudgeResponse,
    SituationJudgeResult,
    Perspectives,
    Responsibility,
    LogicIssue,
    SuggestionItem
)
from app.services.llm_client import llm_client, parse_llm_json, LLMAPIError, LLMTimeoutError
from app.prompts.situation_judge import (
    get_situation_judge_prompt,
    SITUATION_JUDGE_SYSTEM_MESSAGE
)
from app.db.mongodb import get_sessions_collection
from app.core.security import encrypt_text

logger = logging.getLogger(__name__)
router = APIRouter()


def get_fallback_response() -> dict:
    """获取降级响应"""
    return {
        "summary": "由于输入内容的复杂性，我们暂时无法提供完整的分析。建议您尝试更详细地描述事件经过，或者与信任的朋友讨论这件事。",
        "perspectives": {
            "yours": "您在这件事中感到困惑或不满，希望得到一个客观的分析。",
            "theirs": "对方可能有自己的考虑和立场，但由于信息有限，我们暂时无法完全推测。"
        },
        "responsibility": {
            "yours": 33,
            "theirs": 34,
            "shared": 33
        },
        "logic_issues": [
            {
                "type": "信息不足",
                "description": "当前描述可能不够完整，建议补充更多细节以获得更准确的分析。"
            }
        ],
        "suggestions": [
            {
                "style": "温和式",
                "text": "我想和你聊聊这件事，我觉得我们可能有些误解。你方便的时候，我们能好好谈谈吗？"
            },
            {
                "style": "坚定式",
                "text": "关于这件事，我需要和你明确沟通一下。我希望我们能坐下来，把各自的想法说清楚。"
            }
        ]
    }


@router.post(
    "/situation-judge",
    response_model=SituationJudgeResponse,
    summary="情况评理",
    description="分析事件或冲突，提供客观的责任分析和建议"
)
async def analyze_situation(request: SituationJudgeRequest):
    """
    情况评理接口
    
    流程：
    1. 生成 Prompt
    2. 调用 LLM 分析
    3. 解析结果
    4. 返回分析结果
    """
    session_id = str(uuid.uuid4())
    
    try:
        logger.info(
            f"收到情况评理请求 - SessionID: {session_id}, "
            f"UserID: {request.user_id}, "
            f"TextLength: {len(request.situation_text)}"
        )
        
        # 创建会话记录
        sessions = await get_sessions_collection()
        session_doc = {
            "session_id": session_id,
            "user_id": request.user_id,
            "type": "situation_judge",
            "status": "processing",
            "input_encrypted": encrypt_text(request.situation_text),
            "background_encrypted": encrypt_text(request.background_description or ""),
            "created_at": datetime.utcnow()
        }
        await sessions.insert_one(session_doc)
        
        # 生成 Prompt
        prompt = get_situation_judge_prompt(
            request.situation_text,
            request.background_description or ""
        )
        
        # 调用 LLM
        try:
            llm_result = await llm_client.generate_with_metadata(
                prompt=prompt,
                system_message=SITUATION_JUDGE_SYSTEM_MESSAGE,
                temperature=0.7,
                max_tokens=2000,
                force_json=True
            )
            llm_content = llm_result["content"]
            
        except (LLMAPIError, LLMTimeoutError) as e:
            logger.error(f"LLM 调用失败 - SessionID: {session_id}, Error: {e}")
            analysis_result = get_fallback_response()
            
            await sessions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "status": "completed",
                    "analysis_result": analysis_result,
                    "error_message": f"LLM 调用失败: {str(e)}",
                    "completed_at": datetime.utcnow()
                }}
            )
            
            return SituationJudgeResponse(
                session_id=session_id,
                status="completed",
                analysis_result=SituationJudgeResult(**analysis_result),
                created_at=datetime.utcnow(),
                completed_at=datetime.utcnow()
            )
        
        # 解析 LLM 输出
        try:
            parsed_result = parse_llm_json(llm_content)
        except ValueError as e:
            logger.error(f"JSON 解析失败 - SessionID: {session_id}, Error: {e}")
            analysis_result = get_fallback_response()
            
            await sessions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "status": "completed",
                    "analysis_result": analysis_result,
                    "error_message": f"JSON 解析失败: {str(e)}",
                    "completed_at": datetime.utcnow()
                }}
            )
            
            return SituationJudgeResponse(
                session_id=session_id,
                status="completed",
                analysis_result=SituationJudgeResult(**analysis_result),
                created_at=datetime.utcnow(),
                completed_at=datetime.utcnow()
            )
        
        # 验证并构建结果
        try:
            result = SituationJudgeResult(
                summary=parsed_result.get("summary", ""),
                perspectives=Perspectives(**parsed_result.get("perspectives", {"yours": "", "theirs": ""})),
                responsibility=Responsibility(**parsed_result.get("responsibility", {"yours": 33, "theirs": 34, "shared": 33})),
                logic_issues=[LogicIssue(**issue) for issue in parsed_result.get("logic_issues", [])],
                suggestions=[SuggestionItem(**sug) for sug in parsed_result.get("suggestions", [])]
            )
        except Exception as e:
            logger.error(f"结果验证失败 - SessionID: {session_id}, Error: {e}")
            result = SituationJudgeResult(**get_fallback_response())
        
        # 更新会话记录
        completed_at = datetime.utcnow()
        await sessions.update_one(
            {"session_id": session_id},
            {"$set": {
                "status": "completed",
                "analysis_result": result.model_dump(),
                "completed_at": completed_at
            }}
        )
        
        logger.info(f"情况评理完成 - SessionID: {session_id}")
        
        return SituationJudgeResponse(
            session_id=session_id,
            status="completed",
            analysis_result=result,
            created_at=datetime.utcnow(),
            completed_at=completed_at
        )
        
    except Exception as e:
        logger.error(f"情况评理接口错误: {e}", exc_info=True)
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

