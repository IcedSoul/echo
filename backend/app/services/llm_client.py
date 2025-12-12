"""
LLM 客户端封装
支持 OpenAI API 及兼容接口，实现超时重试机制
"""
import logging
import json
from typing import Optional, Dict, Any
import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type
)

from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMTimeoutError(Exception):
    """LLM 请求超时异常"""
    pass


class LLMAPIError(Exception):
    """LLM API 调用异常"""
    pass


class RateLimitError(Exception):
    """速率限制异常"""
    pass


class LLMClient:
    """
    LLM 客户端类
    封装对 OpenAI API 的调用，支持超时重试
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        base_url: str = "http://43.135.132.74:4000/v1",
        timeout: float = 30.0
    ):
        """
        初始化 LLM 客户端
        
        Args:
            api_key: OpenAI API Key（默认从配置读取）
            model: 使用的模型（默认从配置读取）
            base_url: API 基础 URL
            timeout: 请求超时时间（秒）
        """
        self.api_key = api_key or settings.openai_api_key
        self.model = model or settings.openai_model
        self.base_url = base_url
        self.timeout = timeout
        
        if not self.api_key:
            logger.warning("OpenAI API Key 未配置，LLM 功能将不可用")
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.TimeoutException, RateLimitError)),
        reraise=True
    )
    async def _call_api(
        self,
        messages: list,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        response_format: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        调用 OpenAI API（带重试）
        
        Args:
            messages: 消息列表
            temperature: 温度参数
            max_tokens: 最大 token 数
            response_format: 响应格式（如 {"type": "json_object"}）
        
        Returns:
            API 响应 JSON
        
        Raises:
            LLMTimeoutError: 请求超时
            LLMAPIError: API 调用错误
            RateLimitError: 速率限制
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": 0.9
        }
        
        # 如果支持，强制返回 JSON 格式
        if response_format:
            payload["response_format"] = response_format
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload
                )
                
                # 处理速率限制
                if response.status_code == 429:
                    logger.warning("遇到 OpenAI 速率限制，将重试...")
                    raise RateLimitError("Rate limit exceeded")
                
                # 处理其他错误
                if response.status_code != 200:
                    error_msg = f"OpenAI API 错误 {response.status_code}: {response.text}"
                    logger.error(error_msg)
                    raise LLMAPIError(error_msg)
                
                return response.json()
                
        except httpx.TimeoutException as e:
            logger.error(f"OpenAI API 请求超时: {e}")
            raise LLMTimeoutError(f"Request timeout: {e}")
        except httpx.HTTPError as e:
            logger.error(f"OpenAI API HTTP 错误: {e}")
            raise LLMAPIError(f"HTTP error: {e}")
    
    async def generate(
        self,
        prompt: str,
        system_message: str = "You are a helpful assistant.",
        temperature: float = 0.7,
        max_tokens: int = 2000,
        force_json: bool = True
    ) -> str:
        """
        生成文本（便捷方法）
        
        Args:
            prompt: 用户提示词
            system_message: 系统消息
            temperature: 温度参数
            max_tokens: 最大 token 数
            force_json: 是否强制返回 JSON 格式
        
        Returns:
            生成的文本内容
        
        Raises:
            LLMTimeoutError: 请求超时
            LLMAPIError: API 调用错误
        """
        if not self.api_key:
            raise LLMAPIError("OpenAI API Key 未配置")
        
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": prompt}
        ]
        
        response_format = {"type": "json_object"} if force_json else None
        
        logger.info(f"调用 LLM - Model: {self.model}, Temperature: {temperature}")
        
        try:
            result = await self._call_api(
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                response_format=response_format
            )
            
            content = result["choices"][0]["message"]["content"]
            
            # 记录 token 使用情况
            usage = result.get("usage", {})
            logger.info(
                f"LLM 调用成功 - "
                f"Prompt Tokens: {usage.get('prompt_tokens', 0)}, "
                f"Completion Tokens: {usage.get('completion_tokens', 0)}, "
                f"Total: {usage.get('total_tokens', 0)}"
            )
            
            return content
            
        except Exception as e:
            logger.error(f"LLM 生成失败: {e}")
            raise
    
    async def generate_with_metadata(
        self,
        prompt: str,
        system_message: str = "You are a helpful assistant.",
        temperature: float = 0.7,
        max_tokens: int = 2000,
        force_json: bool = True
    ) -> Dict[str, Any]:
        """
        生成文本并返回元数据

        Returns:
            {
                "content": "生成的内容",
                "metadata": {
                    "model": "gpt-4",
                    "prompt_tokens": 100,
                    "completion_tokens": 200,
                    "total_tokens": 300,
                    "latency_ms": 2500
                }
            }
        """
        import time
        start_time = time.time()

        if not self.api_key:
            raise LLMAPIError("OpenAI API Key 未配置")

        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": prompt}
        ]

        response_format = {"type": "json_object"} if force_json else None

        result = await self._call_api(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format=response_format
        )

        latency_ms = int((time.time() - start_time) * 1000)

        content = result["choices"][0]["message"]["content"]
        usage = result.get("usage", {})

        return {
            "content": content,
            "metadata": {
                "model": self.model,
                "prompt_tokens": usage.get("prompt_tokens", 0),
                "completion_tokens": usage.get("completion_tokens", 0),
                "total_tokens": usage.get("total_tokens", 0),
                "latency_ms": latency_ms
            }
        }

    async def generate_stream(
        self,
        prompt: str,
        system_message: str = "You are a helpful assistant.",
        temperature: float = 0.7,
        max_tokens: int = 2000
    ):
        """
        流式生成文本

        Args:
            prompt: 用户提示词
            system_message: 系统消息
            temperature: 温度参数
            max_tokens: 最大 token 数

        Yields:
            生成的文本片段

        Raises:
            LLMTimeoutError: 请求超时
            LLMAPIError: API 调用错误
        """
        if not self.api_key:
            raise LLMAPIError("OpenAI API Key 未配置")

        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": prompt}
        ]

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": 0.9,
            "stream": True  # 启用流式输出
        }

        logger.info(f"调用 LLM Stream - Model: {self.model}, Temperature: {temperature}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload
                ) as response:
                    if response.status_code != 200:
                        error_msg = f"OpenAI API 错误 {response.status_code}"
                        logger.error(error_msg)
                        raise LLMAPIError(error_msg)

                    # 逐行读取流式响应
                    async for line in response.aiter_lines():
                        if not line.strip():
                            continue

                        # SSE 格式: "data: {...}"
                        if line.startswith("data: "):
                            data_str = line[6:]  # 去掉 "data: " 前缀

                            # 检查是否是结束标记
                            if data_str == "[DONE]":
                                break

                            try:
                                data = json.loads(data_str)
                                # 提取内容增量
                                delta = data.get("choices", [{}])[0].get("delta", {})
                                content = delta.get("content", "")

                                if content:
                                    yield content

                            except json.JSONDecodeError:
                                logger.warning(f"无法解析流式数据: {data_str}")
                                continue

                    logger.info("LLM Stream 调用完成")

        except httpx.TimeoutException as e:
            logger.error(f"OpenAI API Stream 请求超时: {e}")
            raise LLMTimeoutError(f"Request timeout: {e}")
        except httpx.HTTPError as e:
            logger.error(f"OpenAI API Stream HTTP 错误: {e}")
            raise LLMAPIError(f"HTTP error: {e}")


def parse_llm_json(raw_text: str) -> dict:
    """
    解析 LLM 返回的 JSON（容错处理）
    
    Args:
        raw_text: LLM 返回的原始文本
    
    Returns:
        解析后的 dict
    
    Raises:
        ValueError: 无法解析 JSON
    """
    # 去除可能的代码块标记
    text = raw_text.strip()
    
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    
    if text.endswith("```"):
        text = text[:-3]
    
    text = text.strip()
    
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.error(f"JSON 解析失败: {e}, 原始文本前 200 字符: {raw_text[:200]}")
        raise ValueError(f"Invalid JSON format: {e}")


# 全局 LLM 客户端实例
llm_client = LLMClient()

