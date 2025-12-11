"""
语音识别服务
使用腾讯云一句话识别 API (SentenceRecognition) 将语音转换为文本
"""
import base64
import logging
from typing import Optional

from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException
from tencentcloud.asr.v20190614 import asr_client, models

from app.core.config import settings

logger = logging.getLogger(__name__)


class ASRService:
    """腾讯云语音识别服务"""
    
    def __init__(self):
        """初始化 ASR 客户端"""
        self._client = None
    
    @property
    def client(self) -> asr_client.AsrClient:
        """懒加载腾讯云 ASR 客户端"""
        if self._client is None:
            logger.info("正在初始化腾讯云 ASR 客户端...")
            
            cred = credential.Credential(
                settings.tencent_secret_id,
                settings.tencent_secret_key
            )
            
            http_profile = HttpProfile()
            http_profile.endpoint = "asr.tencentcloudapi.com"
            
            client_profile = ClientProfile()
            client_profile.httpProfile = http_profile
            
            self._client = asr_client.AsrClient(
                cred,
                "",  # ASR 不需要指定地域
                client_profile
            )
            
            logger.info("腾讯云 ASR 客户端初始化完成")
        return self._client
    
    def recognize_audio(
        self,
        audio_data: bytes,
        voice_format: str = "wav",
        source_type: int = 1,
        engine_model_type: str = "16k_zh"
    ) -> Optional[str]:
        """
        识别语音内容
        
        Args:
            audio_data: 音频字节数据
            voice_format: 音频格式，支持 wav, pcm, ogg-opus, speex, silk, mp3, m4a, aac, amr
            source_type: 语音数据来源，1 表示语音 Base64 编码后的数据
            engine_model_type: 引擎模型类型
                - 16k_zh: 中文普通话通用（默认）
                - 16k_zh-PY: 中英粤
                - 16k_en: 英语
                - 16k_yue: 粤语
        
        Returns:
            识别结果文本，失败返回 None
        
        Raises:
            TencentCloudSDKException: API 调用失败
        """
        try:
            # 将音频数据转换为 Base64
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')
            data_len = len(audio_data)
            
            logger.info(f"开始语音识别 - 格式: {voice_format}, 数据长度: {data_len} bytes")
            
            # 创建请求
            req = models.SentenceRecognitionRequest()
            req.ProjectId = 0
            req.SubServiceType = 2  # 一句话识别
            req.EngSerViceType = engine_model_type  # 引擎服务类型（必填）
            req.SourceType = source_type
            req.VoiceFormat = voice_format
            req.Data = audio_base64
            req.DataLen = data_len
            
            # 调用 API
            response = self.client.SentenceRecognition(req)
            
            result_text = response.Result
            logger.info(f"语音识别完成 - 结果长度: {len(result_text) if result_text else 0}")
            
            return result_text
            
        except TencentCloudSDKException as e:
            logger.error(f"腾讯云 ASR API 调用失败: {e}")
            raise
        except Exception as e:
            logger.error(f"语音识别处理失败: {e}")
            raise


# 全局单例
asr_service = ASRService()

