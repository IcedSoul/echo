"""
语音识别 API 路由
"""
import logging
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional

from app.services.asr_service import asr_service

logger = logging.getLogger(__name__)
router = APIRouter()


# ============ 响应模型 ============

class ASRResponse(BaseModel):
    """语音识别响应"""
    success: bool
    text: str
    message: str


# ============ API 路由 ============

@router.post(
    "/asr",
    response_model=ASRResponse,
    summary="语音识别",
    description="上传语音文件，转换为文本"
)
async def recognize_speech(
    audio: UploadFile = File(..., description="语音文件"),
    voice_format: str = Form(default="wav", description="音频格式：wav, pcm, mp3, m4a, aac, ogg-opus, speex, silk, amr"),
    engine_model_type: str = Form(default="16k_zh", description="引擎类型：16k_zh(中文), 16k_en(英语), 16k_yue(粤语)")
):
    """
    语音识别接口
    
    - 支持格式: wav, pcm, mp3, m4a, aac, ogg-opus, speex, silk, amr
    - 音频时长限制: 60秒以内
    - 文件大小限制: 10MB
    - 推荐采样率: 16kHz
    
    返回识别的文本内容
    """
    try:
        # 验证文件类型
        allowed_formats = {"wav", "pcm", "mp3", "m4a", "aac", "ogg-opus", "speex", "silk", "amr"}
        if voice_format not in allowed_formats:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "INVALID_FORMAT",
                        "message": f"不支持的音频格式: {voice_format}",
                        "details": {"allowed_formats": list(allowed_formats)}
                    }
                }
            )
        
        # 读取音频内容
        audio_content = await audio.read()
        
        # 验证文件大小（最大 10MB）
        if len(audio_content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "FILE_TOO_LARGE",
                        "message": "音频文件超过 10MB 限制",
                        "details": {"size": len(audio_content)}
                    }
                }
            )
        
        # 验证文件不为空
        if len(audio_content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "EMPTY_FILE",
                        "message": "音频文件为空",
                        "details": {}
                    }
                }
            )
        
        logger.info(f"开始处理语音识别 - 格式: {voice_format}, 大小: {len(audio_content)} bytes")
        
        # 调用 ASR 服务
        result_text = asr_service.recognize_audio(
            audio_data=audio_content,
            voice_format=voice_format,
            engine_model_type=engine_model_type
        )
        
        if not result_text or not result_text.strip():
            return ASRResponse(
                success=False,
                text="",
                message="未能识别出有效的语音内容，请确保音频清晰"
            )
        
        logger.info(f"语音识别完成 - 结果长度: {len(result_text)}")
        
        return ASRResponse(
            success=True,
            text=result_text.strip(),
            message="识别成功"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"语音识别失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "ASR_PROCESS_ERROR",
                    "message": "语音识别处理失败，请稍后重试",
                    "details": str(e)
                }
            }
        )

