"""
响应安全审查模块
检测 LLM 输出是否包含不安全内容，必要时进行改写
"""
import re
import logging
from typing import List, Tuple, Optional, Dict, Any, Literal
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """验证结果"""
    is_safe: bool
    issues: List[str]
    action: Literal["pass", "refine", "reject"]
    modified_response: Optional[Dict[str, Any]] = None


# ============ 禁止内容模式 ============

FORBIDDEN_PATTERNS = [
    # 自残/自杀鼓励
    (r"(应该|可以|不如).*?(死|自杀|结束生命)", "鼓励自残/自杀"),
    (r"离开.*?世界", "鼓励自杀"),
    (r"一了百了", "暗示自杀"),
    
    # 暴力鼓励
    (r"(直接|就|可以).*?(打|揍|暴力|报复)", "鼓励暴力"),
    (r"毁掉.*?对方", "鼓励报复"),
    (r"让.*?(ta|他|她).*?付出代价", "鼓励报复"),
    
    # 违法建议
    (r"偷偷.*?(查|看|翻).*?手机", "建议侵犯隐私"),
    (r"跟踪", "建议违法行为"),
    (r"监视", "建议违法行为"),
]

# ============ 谨慎内容模式（需改写）============

CAUTIOUS_PATTERNS = [
    # 极端决策（结合风险等级判断）
    (r"立刻.*?(分手|离婚|断绝)", "极端决策建议"),
    (r"马上.*?(分手|离婚|断绝)", "极端决策建议"),
    
    # 过度自责
    (r"都是.*?你.*?的错", "过度自责"),
    (r"完全是.*?你.*?问题", "过度指责"),
    
    # 单方面指责
    (r"对方完全不对", "单方面指责"),
    (r"全是.*?(ta|他|她).*?的错", "单方面指责"),
    
    # 不现实承诺
    (r"保证.*?再也不会", "不现实承诺"),
    (r"以后永远不", "不现实承诺"),
]


class ResponseGuard:
    """
    响应安全审查类
    检测 LLM 输出的安全性
    """
    
    def __init__(self):
        """初始化审查器"""
        self.forbidden_compiled = [
            (re.compile(pattern, re.IGNORECASE), desc)
            for pattern, desc in FORBIDDEN_PATTERNS
        ]
        self.cautious_compiled = [
            (re.compile(pattern, re.IGNORECASE), desc)
            for pattern, desc in CAUTIOUS_PATTERNS
        ]
    
    def _check_forbidden(self, text: str) -> Tuple[bool, List[str]]:
        """
        检查禁止内容
        
        Args:
            text: 待检查文本
        
        Returns:
            (是否包含禁止内容, 问题列表)
        """
        issues = []
        
        for pattern, desc in self.forbidden_compiled:
            if pattern.search(text):
                issues.append(f"检测到禁止内容: {desc}")
                logger.warning(f"ResponseGuard 检测到禁止内容: {desc}")
        
        return (len(issues) > 0, issues)
    
    def _check_cautious(
        self, 
        text: str, 
        risk_level: str
    ) -> Tuple[bool, List[str]]:
        """
        检查谨慎内容（结合风险等级）
        
        Args:
            text: 待检查文本
            risk_level: 风险等级
        
        Returns:
            (是否包含谨慎内容, 问题列表)
        """
        issues = []
        
        # HIGH 和 CRITICAL 风险时，谨慎内容也视为问题
        if risk_level in ["HIGH", "CRITICAL"]:
            for pattern, desc in self.cautious_compiled:
                if pattern.search(text):
                    issues.append(f"检测到谨慎内容: {desc}")
                    logger.info(f"ResponseGuard 检测到谨慎内容: {desc}")
        
        return (len(issues) > 0, issues)
    
    def _extract_advice_messages(self, response: dict) -> List[str]:
        """
        提取响应中的建议消息文本
        
        Args:
            response: LLM 响应 dict
        
        Returns:
            建议消息文本列表
        """
        messages = []
        
        advice_list = response.get("advice", [])
        for advice in advice_list:
            if isinstance(advice, dict) and "message" in advice:
                messages.append(advice["message"])
        
        return messages
    
    def validate(
        self, 
        llm_response: dict, 
        risk_level: str
    ) -> ValidationResult:
        """
        验证 LLM 响应的安全性
        
        Args:
            llm_response: LLM 返回的 dict
            risk_level: 风险等级 (LOW/MEDIUM/HIGH/CRITICAL)
        
        Returns:
            ValidationResult 对象
        """
        # 提取所有需要检查的文本
        texts_to_check = []
        
        # 检查 summary
        if "summary" in llm_response:
            texts_to_check.append(llm_response["summary"])
        
        # 检查 advice messages
        advice_messages = self._extract_advice_messages(llm_response)
        texts_to_check.extend(advice_messages)
        
        # 检查 emotion_analysis explanations
        emotion_analysis = llm_response.get("emotion_analysis", {})
        for emotions in [emotion_analysis.get("my_emotions"), emotion_analysis.get("their_emotions")]:
            if emotions and isinstance(emotions, dict):
                if "explanation" in emotions:
                    texts_to_check.append(emotions["explanation"])
        
        # 合并所有文本
        combined_text = " ".join(texts_to_check)
        
        # 1. 检查禁止内容
        has_forbidden, forbidden_issues = self._check_forbidden(combined_text)
        
        if has_forbidden:
            logger.error(f"ResponseGuard 拒绝响应 - 禁止内容: {forbidden_issues}")
            return ValidationResult(
                is_safe=False,
                issues=forbidden_issues,
                action="reject"
            )
        
        # 2. 检查谨慎内容（仅在 HIGH/CRITICAL 时）
        has_cautious, cautious_issues = self._check_cautious(combined_text, risk_level)
        
        if has_cautious:
            logger.warning(
                f"ResponseGuard 检测到谨慎内容 - RiskLevel: {risk_level}, "
                f"Issues: {cautious_issues}"
            )
            return ValidationResult(
                is_safe=False,
                issues=cautious_issues,
                action="refine"
            )
        
        # 3. 通过检查
        logger.debug("ResponseGuard 验证通过")
        return ValidationResult(
            is_safe=True,
            issues=[],
            action="pass"
        )
    
    def get_fallback_response(self, risk_level: str) -> dict:
        """
        获取降级响应（当 LLM 输出不安全或失败时使用）
        
        Args:
            risk_level: 风险等级
        
        Returns:
            安全的降级响应 dict
        """
        if risk_level == "CRITICAL":
            # CRITICAL 风险的降级响应
            return {
                "summary": "当前情况较为复杂，我们建议您寻求专业支持。",
                "timeline": [],
                "emotion_analysis": {
                    "my_emotions": {
                        "primary": "复杂情绪",
                        "secondary": [],
                        "explanation": "当前正在经历困难的情绪状态"
                    },
                    "their_emotions": {
                        "primary": "复杂情绪",
                        "secondary": [],
                        "explanation": "对方也可能正在经历困难"
                    }
                },
                "needs_analysis": {
                    "my_needs": ["专业支持"],
                    "their_needs": ["专业支持"],
                    "conflict_core": "当前情况需要专业介入"
                },
                "advice": [],
                "risk_hints": [
                    "如果您或对方正在经历严重的情绪困扰：",
                    "• 心理危机干预热线：010-82951332",
                    "• 紧急情况请拨打 110",
                    "• 寻找专业心理咨询师"
                ]
            }
        else:
            # 其他风险级别的降级响应
            return {
                "summary": "抱歉，当前分析遇到技术问题，请稍后重试。",
                "timeline": [],
                "emotion_analysis": {
                    "my_emotions": {
                        "primary": "复杂情绪",
                        "secondary": [],
                        "explanation": "系统暂时无法完成分析"
                    },
                    "their_emotions": {
                        "primary": "复杂情绪",
                        "secondary": [],
                        "explanation": "系统暂时无法完成分析"
                    }
                },
                "needs_analysis": {
                    "my_needs": [],
                    "their_needs": [],
                    "conflict_core": "暂时无法识别"
                },
                "advice": [
                    {
                        "type": "fallback",
                        "title": "建议",
                        "message": "当前情况较为复杂，建议您冷静思考后，选择合适的时机与对方沟通。如有需要，可以寻求专业人士帮助。",
                        "explanation": "系统建议"
                    }
                ],
                "risk_hints": []
            }


# 全局审查器实例
response_guard = ResponseGuard()

