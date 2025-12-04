"""
风险分类器
基于规则匹配和关键词检测，判断对话的风险等级
"""
import re
import logging
from typing import List, Tuple, Literal
from dataclasses import dataclass

logger = logging.getLogger(__name__)


# 风险等级类型
RiskLevel = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]


@dataclass
class RiskClassification:
    """风险分类结果"""
    risk_level: RiskLevel
    tags: List[str]
    confidence: float
    matched_keywords: List[str] = None
    
    def __post_init__(self):
        if self.matched_keywords is None:
            self.matched_keywords = []


# ============ 关键词库 ============

# CRITICAL 级别：自残、自杀、严重暴力
CRITICAL_KEYWORDS = {
    "self_harm": [
        "自残", "割腕", "自伤", "伤害自己", "割自己", "自虐"
    ],
    "suicide": [
        "自杀", "不想活", "活着没意思", "想死", "去死吧",
        "结束生命", "了结", "解脱", "一了百了", "自尽",
        "轻生", "寻死", "死了算了"
    ],
    "violence_threat": [
        "杀了你", "弄死", "宰了", "要你命", "杀掉你",
        "打死你", "灭了你", "让你消失"
    ],
    "domestic_violence": [
        "家暴", "打我", "动手打", "暴力", "揍我", "打人"
    ]
}

# HIGH 级别：极端情绪、分手威胁
HIGH_KEYWORDS = {
    "breakup_threat": [
        "分手", "离婚", "断绝关系", "再也不见", "一刀两断",
        "我们结束吧", "不要在一起了", "分开吧"
    ],
    "extreme_emotion": [
        "恨死", "恨透", "永远不原谅", "永远不会原谅",
        "受够了", "忍无可忍", "再也忍受不了"
    ],
    "threat": [
        "威胁", "要你好看", "让你后悔", "报复"
    ]
}

# MEDIUM 级别：强烈负面情绪
MEDIUM_KEYWORDS = [
    "讨厌", "烦死了", "烦透了", "生气", "愤怒",
    "失望", "难过", "伤心", "委屈", "受伤"
]


class RiskClassifier:
    """
    风险分类器类
    基于关键词规则判断对话风险等级
    """
    
    def __init__(self):
        """初始化分类器"""
        self.critical_patterns = self._compile_patterns(CRITICAL_KEYWORDS)
        self.high_patterns = self._compile_patterns(HIGH_KEYWORDS)
    
    def _compile_patterns(self, keyword_dict: dict) -> dict:
        """
        将关键词编译为正则表达式模式
        
        Args:
            keyword_dict: 关键词字典
        
        Returns:
            编译后的模式字典
        """
        patterns = {}
        for category, keywords in keyword_dict.items():
            # 将关键词转换为正则模式（精确匹配）
            pattern = "|".join(re.escape(kw) for kw in keywords)
            patterns[category] = re.compile(pattern, re.IGNORECASE)
        return patterns
    
    def _check_critical(self, text: str) -> Tuple[bool, List[str], List[str]]:
        """
        检查 CRITICAL 级别关键词
        
        Args:
            text: 待检测文本
        
        Returns:
            (是否匹配, 匹配的标签列表, 匹配的关键词列表)
        """
        tags = []
        matched = []
        
        for category, pattern in self.critical_patterns.items():
            matches = pattern.findall(text)
            if matches:
                tags.append(category)
                matched.extend(matches)
        
        return (len(tags) > 0, tags, matched)
    
    def _check_high(self, text: str) -> Tuple[bool, List[str], List[str]]:
        """
        检查 HIGH 级别关键词
        
        Args:
            text: 待检测文本
        
        Returns:
            (是否匹配, 匹配的标签列表, 匹配的关键词列表)
        """
        tags = []
        matched = []
        
        for category, pattern in self.high_patterns.items():
            matches = pattern.findall(text)
            if matches:
                tags.append(category)
                matched.extend(matches)
        
        return (len(tags) > 0, tags, matched)
    
    def _check_medium(self, text: str) -> Tuple[bool, List[str]]:
        """
        检查 MEDIUM 级别关键词
        
        Args:
            text: 待检测文本
        
        Returns:
            (是否匹配, 匹配的关键词列表)
        """
        matched = []
        
        for keyword in MEDIUM_KEYWORDS:
            if keyword in text:
                matched.append(keyword)
        
        # 负面词汇密度计算
        text_length = len(text)
        if text_length > 0 and len(matched) > 0:
            density = len(matched) / (text_length / 10)  # 每 10 字的负面词数
            if density > 0.3:  # 密度超过 30%
                return (True, matched)
        
        # 标点符号强度检测（连续叹号/问号）
        if re.search(r'[!！?？]{3,}', text):
            matched.append("[连续标点]")
            return (True, matched)
        
        return (len(matched) >= 3, matched)  # 至少 3 个负面词才算 MEDIUM
    
    def classify(self, text: str) -> RiskClassification:
        """
        分类文本的风险等级
        
        Args:
            text: 待分类的对话文本
        
        Returns:
            RiskClassification 对象
        """
        if not text or len(text.strip()) == 0:
            return RiskClassification(
                risk_level="LOW",
                tags=[],
                confidence=1.0,
                matched_keywords=[]
            )
        
        # 优先级检测：CRITICAL > HIGH > MEDIUM > LOW
        
        # 检测 CRITICAL
        is_critical, critical_tags, critical_matched = self._check_critical(text)
        if is_critical:
            logger.warning(
                f"检测到 CRITICAL 风险 - Tags: {critical_tags}, "
                f"Keywords: {critical_matched[:3]}"  # 只记录前 3 个
            )
            return RiskClassification(
                risk_level="CRITICAL",
                tags=critical_tags,
                confidence=0.95,
                matched_keywords=critical_matched
            )
        
        # 检测 HIGH
        is_high, high_tags, high_matched = self._check_high(text)
        if is_high:
            logger.info(
                f"检测到 HIGH 风险 - Tags: {high_tags}, "
                f"Keywords: {high_matched[:3]}"
            )
            return RiskClassification(
                risk_level="HIGH",
                tags=high_tags,
                confidence=0.85,
                matched_keywords=high_matched
            )
        
        # 检测 MEDIUM
        is_medium, medium_matched = self._check_medium(text)
        if is_medium:
            logger.info(f"检测到 MEDIUM 风险 - Keywords: {medium_matched[:3]}")
            return RiskClassification(
                risk_level="MEDIUM",
                tags=[],
                confidence=0.75,
                matched_keywords=medium_matched
            )
        
        # 默认 LOW
        logger.debug("风险级别：LOW")
        return RiskClassification(
            risk_level="LOW",
            tags=[],
            confidence=0.9,
            matched_keywords=[]
        )


# 全局分类器实例
risk_classifier = RiskClassifier()

