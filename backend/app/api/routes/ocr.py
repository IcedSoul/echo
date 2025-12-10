"""
OCR 聊天截图识别 API 路由
"""
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form
from typing import List, Optional
from pydantic import BaseModel
import logging

from app.services.ocr_service import ocr_service

logger = logging.getLogger(__name__)
router = APIRouter()


# ============ 响应模型 ============

class OCRChatResponse(BaseModel):
    """OCR 聊天识别响应"""
    success: bool
    conversation_text: str
    chat_name: Optional[str] = None
    image_count: int
    message: str


# ============ API 路由 ============

@router.post(
    "/ocr-chat",
    response_model=OCRChatResponse,
    summary="识别微信聊天截图",
    description="上传微信聊天截图，进行 OCR 识别并使用大模型整理对话内容"
)
async def ocr_chat_screenshots(
    images: List[UploadFile] = File(..., description="聊天截图文件列表"),
    max_images: int = Form(default=10, description="最大处理图片数量"),
    use_llm_refine: bool = Form(default=True, description="是否使用大模型整理对话"),
):
    """
    微信聊天截图 OCR 识别接口
    
    - 接收多张微信聊天截图（图片顺序不限，大模型会自动排序）
    - 使用 PaddleOCR PP-OCRv5 进行文字识别
    - 自动识别说话人（左侧气泡=对方，右侧气泡=我）
    - 使用大模型整理对话：
      - 按时间顺序重排图片
      - 去除重复内容
      - 识别对方名称
      - 整理成标准对话格式
    
    返回格式化的对话文本：
    ```
    我：你好
    
    小明：你好呀
    
    19:23
    
    我：最近怎么样？
    
    小明：还不错
    ```
    """
    try:
        # 验证文件数量
        if len(images) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "NO_IMAGES",
                        "message": "请至少上传一张截图",
                        "details": {}
                    }
                }
            )
        
        if len(images) > max_images:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "TOO_MANY_IMAGES",
                        "message": f"最多支持上传 {max_images} 张图片",
                        "details": {"max_images": max_images, "received": len(images)}
                    }
                }
            )
        
        # 验证文件类型
        allowed_types = {"image/jpeg", "image/png", "image/jpg", "image/webp"}
        image_bytes_list = []
        
        for i, img in enumerate(images):
            if img.content_type not in allowed_types:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": {
                            "code": "INVALID_FILE_TYPE",
                            "message": f"第 {i+1} 张图片格式不支持，请上传 JPG/PNG/WebP 格式",
                            "details": {"file_name": img.filename, "content_type": img.content_type}
                        }
                    }
                )
            
            # 读取图片内容
            content = await img.read()
            
            # 验证文件大小（最大 10MB）
            if len(content) > 10 * 1024 * 1024:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": {
                            "code": "FILE_TOO_LARGE",
                            "message": f"第 {i+1} 张图片超过 10MB 限制",
                            "details": {"file_name": img.filename, "size": len(content)}
                        }
                    }
                )
            
            image_bytes_list.append(content)
        
        logger.info(f"开始处理 {len(image_bytes_list)} 张聊天截图 (使用大模型整理: {use_llm_refine})")
        
        # 调用 OCR 服务处理图片（异步方法，支持大模型整理）
        conversation_text, chat_name = await ocr_service.process_multiple_images_async(
            image_bytes_list,
            use_llm_refine=use_llm_refine
        )
        
        if not conversation_text.strip():
            return OCRChatResponse(
                success=False,
                conversation_text="",
                chat_name=chat_name,
                image_count=len(image_bytes_list),
                message="未能从截图中识别出有效的对话内容，请确保上传的是微信聊天截图"
            )
        
        logger.info(
            f"OCR 处理完成 - 图片数: {len(image_bytes_list)}, "
            f"对话长度: {len(conversation_text)}, 聊天对象: {chat_name}"
        )
        
        return OCRChatResponse(
            success=True,
            conversation_text=conversation_text,
            chat_name=chat_name,
            image_count=len(image_bytes_list),
            message=f"成功识别并整理 {len(image_bytes_list)} 张截图"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR 处理失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "OCR_PROCESS_ERROR",
                    "message": "图片识别处理失败，请稍后重试",
                    "details": str(e)
                }
            }
        )

