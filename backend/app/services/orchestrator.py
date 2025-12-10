"""
分析编排服务（Orchestrator）
核心业务逻辑：编排整个分析流程
"""
import logging
import uuid
from datetime import datetime
from typing import Optional

from app.models.analysis import (
    AnalyzeConflictRequest,
    AnalysisResult,
    RiskClassification as RiskClassificationModel
)
from app.services.risk_classifier import risk_classifier
from app.services.llm_client import llm_client, parse_llm_json, LLMAPIError, LLMTimeoutError
from app.services.response_guard import response_guard
from app.prompts import standard, cautious, high_risk
from app.core.security import encrypt_text
from app.db.mongodb import get_sessions_collection

logger = logging.getLogger(__name__)


class AnalysisOrchestrator:
    """
    分析编排器
    协调整个分析流程：风险分类 → LLM 生成 → 安全审查 → 存储
    """
    
    async def analyze(
        self,
        request: AnalyzeConflictRequest
    ) -> dict:
        """
        执行完整的分析流程
        
        Args:
            request: 分析请求
        
        Returns:
            分析结果 dict
        
        Raises:
            Exception: 分析过程中的各种异常
        """
        session_id = str(uuid.uuid4())
        
        logger.info(
            f"开始分析 - SessionID: {session_id}, "
            f"UserID: {request.user_id}, "
            f"TextLength: {len(request.conversation_text)}"
        )
        
        try:
            # ========== 1. 创建会话记录 ==========
            await self._create_session_record(session_id, request)
            
            # ========== 2. 风险分类 ==========
            risk_classification = risk_classifier.classify(
                request.conversation_text
            )
            
            logger.info(
                f"风险分类完成 - SessionID: {session_id}, "
                f"RiskLevel: {risk_classification.risk_level}, "
                f"Tags: {risk_classification.tags}"
            )
            
            # ========== 3. 选择 Prompt 模板 ==========
            prompt, system_message = self._select_prompt(
                risk_classification.risk_level,
                request.conversation_text,
                request.context_description or ""
            )
            
            # ========== 4. 调用 LLM 生成 ==========
            try:
                llm_result = await llm_client.generate_with_metadata(
                    prompt=prompt,
                    system_message=system_message,
                    temperature=0.7,
                    max_tokens=2000,
                    force_json=True
                )
                
                llm_content = llm_result["content"]
                llm_metadata = llm_result["metadata"]
                
            except (LLMAPIError, LLMTimeoutError) as e:
                logger.error(f"LLM 调用失败 - SessionID: {session_id}, Error: {e}")
                # 使用降级响应
                analysis_result = response_guard.get_fallback_response(
                    risk_classification.risk_level
                )
                
                await self._update_session_completed(
                    session_id,
                    risk_classification,
                    analysis_result,
                    None,
                    error_message=f"LLM 调用失败: {str(e)}"
                )
                
                return self._build_response(
                    session_id,
                    risk_classification.risk_level,
                    analysis_result,
                    datetime.utcnow(),
                    datetime.utcnow()
                )
            
            # ========== 5. 解析 LLM 输出 ==========
            try:
                parsed_result = parse_llm_json(llm_content)
            except ValueError as e:
                logger.error(f"JSON 解析失败 - SessionID: {session_id}, Error: {e}")
                # 使用降级响应
                analysis_result = response_guard.get_fallback_response(
                    risk_classification.risk_level
                )
                
                await self._update_session_completed(
                    session_id,
                    risk_classification,
                    analysis_result,
                    llm_metadata,
                    error_message=f"JSON 解析失败: {str(e)}"
                )
                
                return self._build_response(
                    session_id,
                    risk_classification.risk_level,
                    analysis_result,
                    datetime.utcnow(),
                    datetime.utcnow()
                )
            
            # ========== 6. 安全审查 ==========
            validation_result = response_guard.validate(
                parsed_result,
                risk_classification.risk_level
            )
            
            if validation_result.action == "reject":
                # 拒绝：使用降级响应
                logger.warning(
                    f"响应被拒绝 - SessionID: {session_id}, "
                    f"Issues: {validation_result.issues}"
                )
                analysis_result = response_guard.get_fallback_response(
                    risk_classification.risk_level
                )
                
            elif validation_result.action == "refine":
                # 需要改写：暂时使用降级响应（完整的改写逻辑可在 V2 实现）
                logger.warning(
                    f"响应需要改写 - SessionID: {session_id}, "
                    f"Issues: {validation_result.issues}"
                )
                analysis_result = response_guard.get_fallback_response(
                    risk_classification.risk_level
                )
                
            else:
                # 通过：使用原始结果
                analysis_result = parsed_result
            
            # ========== 7. 更新会话记录为完成状态 ==========
            completed_at = datetime.utcnow()
            
            await self._update_session_completed(
                session_id,
                risk_classification,
                analysis_result,
                llm_metadata
            )
            
            logger.info(f"分析完成 - SessionID: {session_id}")
            
            # ========== 8. 返回结果 ==========
            return self._build_response(
                session_id,
                risk_classification.risk_level,
                analysis_result,
                datetime.utcnow(),
                completed_at
            )
            
        except Exception as e:
            logger.error(
                f"分析流程异常 - SessionID: {session_id}, Error: {e}",
                exc_info=True
            )
            
            # 更新会话为失败状态
            try:
                sessions = await get_sessions_collection()
                await sessions.update_one(
                    {"session_id": session_id},
                    {
                        "$set": {
                            "status": "failed",
                            "error_message": str(e),
                            "completed_at": datetime.utcnow()
                        }
                    }
                )
            except Exception as db_error:
                logger.error(f"更新失败状态异常: {db_error}")
            
            raise
    
    async def _create_session_record(
        self,
        session_id: str,
        request: AnalyzeConflictRequest
    ):
        """
        创建会话记录（status: processing）
        
        Args:
            session_id: 会话 ID
            request: 分析请求
        """
        sessions = await get_sessions_collection()
        
        # 加密敏感数据
        encrypted_text = encrypt_text(request.conversation_text)
        encrypted_context = encrypt_text(
            request.context_description if request.context_description else ""
        )
        
        session_doc = {
            "session_id": session_id,
            "user_id": request.user_id,
            "type": "conflict",  # 标记为冲突复盘类型
            "status": "processing",
            "input_conversation_encrypted": encrypted_text,
            "input_context_encrypted": encrypted_context,
            "input_original_length": len(request.conversation_text),
            "created_at": datetime.utcnow()
        }
        
        await sessions.insert_one(session_doc)
        logger.debug(f"会话记录已创建 - SessionID: {session_id}")
    
    def _select_prompt(
        self,
        risk_level: str,
        conversation_text: str,
        context_description: str
    ) -> tuple:
        """
        根据风险等级选择 Prompt 模板
        
        Args:
            risk_level: 风险等级
            conversation_text: 聊天记录
            context_description: 背景描述
        
        Returns:
            (prompt, system_message) 元组
        """
        if risk_level == "CRITICAL":
            return (
                high_risk.get_high_risk_prompt(conversation_text, context_description),
                high_risk.HIGH_RISK_SYSTEM_MESSAGE
            )
        elif risk_level == "HIGH":
            return (
                cautious.get_cautious_prompt(conversation_text, context_description),
                cautious.CAUTIOUS_SYSTEM_MESSAGE
            )
        else:  # LOW or MEDIUM
            return (
                standard.get_standard_prompt(conversation_text, context_description),
                standard.STANDARD_SYSTEM_MESSAGE
            )
    
    async def _update_session_completed(
        self,
        session_id: str,
        risk_classification,
        analysis_result: dict,
        llm_metadata: Optional[dict],
        error_message: Optional[str] = None
    ):
        """
        更新会话记录为完成状态
        
        Args:
            session_id: 会话 ID
            risk_classification: 风险分类结果
            analysis_result: 分析结果
            llm_metadata: LLM 元数据
            error_message: 错误消息（如果有）
        """
        sessions = await get_sessions_collection()
        
        update_data = {
            "status": "completed" if not error_message else "failed",
            "risk_classification": {
                "risk_level": risk_classification.risk_level,
                "tags": risk_classification.tags,
                "confidence": risk_classification.confidence
            },
            "analysis_result": analysis_result,
            "llm_metadata": llm_metadata,
            "completed_at": datetime.utcnow()
        }
        
        if error_message:
            update_data["error_message"] = error_message
        
        await sessions.update_one(
            {"session_id": session_id},
            {"$set": update_data}
        )
    
    def _build_response(
        self,
        session_id: str,
        risk_level: str,
        analysis_result: dict,
        created_at: datetime,
        completed_at: datetime
    ) -> dict:
        """
        构建返回给前端的响应
        
        Args:
            session_id: 会话 ID
            risk_level: 风险等级
            analysis_result: 分析结果
            created_at: 创建时间
            completed_at: 完成时间
        
        Returns:
            响应 dict
        """
        return {
            "session_id": session_id,
            "status": "completed",
            "risk_level": risk_level,
            "analysis_result": analysis_result,
            "created_at": created_at,
            "completed_at": completed_at
        }


# 全局编排器实例
orchestrator = AnalysisOrchestrator()
