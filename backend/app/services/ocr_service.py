"""
微信聊天记录截图 OCR 服务
使用 PaddleOCR 3.x (PP-OCRv5) 进行中文识别，并调用大模型进行对话整理
"""
import logging
import io
import re
import json
import numpy as np
from typing import List, Tuple, Optional
from dataclasses import dataclass, field
from PIL import Image
from paddleocr import PaddleOCR

logger = logging.getLogger(__name__)


@dataclass
class TextBox:
    """OCR 识别的文本框"""
    text: str
    box: List[List[float]]  # 四个角的坐标 [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
    confidence: float
    
    @property
    def center_x(self) -> float:
        """文本框中心 X 坐标"""
        return sum(p[0] for p in self.box) / 4
    
    @property
    def center_y(self) -> float:
        """文本框中心 Y 坐标"""
        return sum(p[1] for p in self.box) / 4
    
    @property
    def top_y(self) -> float:
        """文本框顶部 Y 坐标"""
        return min(p[1] for p in self.box)
    
    @property
    def left_x(self) -> float:
        """文本框左侧 X 坐标"""
        return min(p[0] for p in self.box)
    
    @property
    def right_x(self) -> float:
        """文本框右侧 X 坐标"""
        return max(p[0] for p in self.box)
    
    @property
    def width(self) -> float:
        """文本框宽度"""
        return self.right_x - self.left_x


@dataclass
class ChatMessage:
    """聊天消息"""
    speaker: str  # "我" 或对方名称
    text: str
    y_position: float  # 用于排序


@dataclass
class ImageOCRResult:
    """单张图片的 OCR 结果"""
    image_index: int
    raw_texts: List[str] = field(default_factory=list)
    messages: List[ChatMessage] = field(default_factory=list)


class WeChatOCRService:
    """微信聊天截图 OCR 服务"""
    
    # 需要过滤的 UI 元素关键词
    UI_FILTER_PATTERNS = [
        r'^\d{1,2}:\d{2}$',  # 时间 HH:MM
        r'^\d{1,2}月\d{1,2}日',  # 日期
        r'^星期[一二三四五六日]$',
        r'^周[一二三四五六日]$',
        r'^上午$|^下午$|^凌晨$|^晚上$',
        r'^昨天$|^今天$|^刚刚$',
        r'^\d+%$',  # 电量百分比
        r'^[45]G$|^WiFi$|^WIFI$',  # 网络信号
        r'^返回$|^发送$|^更多$',
        r'^语音$|^视频$|^转账$|^红包$',
        r'^\+$|^表情$',
        r'^消息$|^通讯录$|^发现$|^我$',  # 微信底部导航
        r'^聊天$',
        r'^\[.*\]$',  # [语音] [图片] 等
        r'^···$|^...$|^…$',
        r'^\d{4}/\d{1,2}/\d{1,2}',  # 日期格式
        r'^中国移动$|^中国联通$|^中国电信$',
    ]
    
    def __init__(self):
        """初始化 OCR 引擎"""
        self._ocr = None
    
    @property
    def ocr(self) -> PaddleOCR:
        """懒加载 OCR 引擎 - PaddleOCR 3.x (PP-OCRv5)"""
        if self._ocr is None:
            logger.info("正在初始化 PaddleOCR 3.x 引擎 (PP-OCRv5)...")
            
            # PaddleOCR 3.x 初始化参数
            # 参考: https://www.paddleocr.ai/latest/quick_start.html
            # 关闭文档方向分类和矫正以提高速度
            self._ocr = PaddleOCR(
                lang='ch',
                use_doc_orientation_classify=False,
                use_doc_unwarping=False,
                use_textline_orientation=False,  # 不使用文本行方向检测
            )
            
            logger.info("PaddleOCR 引擎初始化完成")
        return self._ocr
    
    def _is_ui_text(self, text: str) -> bool:
        """判断是否是 UI 元素文本（需要过滤）"""
        text = text.strip()
        if len(text) <= 1:
            return True
        
        for pattern in self.UI_FILTER_PATTERNS:
            if re.match(pattern, text):
                return True
        return False
    
    def _extract_chat_name(self, boxes: List[TextBox], image_width: float) -> Optional[str]:
        """
        从截图顶部提取聊天对象名称
        微信聊天界面顶部中央通常显示对方名称
        """
        # 找到顶部区域（前 15% 高度）的文本框
        if not boxes:
            return None
        
        top_boxes = [b for b in boxes if b.top_y < max(b.top_y for b in boxes) * 0.15]
        if not top_boxes:
            return None
        
        # 找中间位置的文本（排除左右两侧的返回按钮等）
        center_x = image_width / 2
        center_boxes = [
            b for b in top_boxes 
            if abs(b.center_x - center_x) < image_width * 0.3
            and not self._is_ui_text(b.text)
        ]
        
        if center_boxes:
            # 返回最接近中心的文本
            center_boxes.sort(key=lambda b: abs(b.center_x - center_x))
            return center_boxes[0].text
        
        return None
    
    def _classify_speaker(
        self, 
        box: TextBox, 
        image_width: float, 
        chat_name: Optional[str]
    ) -> str:
        """
        根据气泡位置判断说话人
        微信中：
        - 右侧气泡（绿色）是"我"发送的
        - 左侧气泡（白色）是对方发送的
        """
        # 计算文本框中心相对于图片的位置
        relative_x = box.center_x / image_width
        
        # 右侧超过 55% 认为是"我"，左侧低于 45% 认为是对方
        if relative_x > 0.55:
            return "我"
        elif relative_x < 0.45:
            return chat_name or "对方"
        else:
            # 中间位置，可能是系统消息或时间戳，默认过滤
            return ""
    
    def _parse_ocr_result(self, result) -> List[TextBox]:
        """
        解析 PaddleOCR 3.x 返回的结果
        
        PaddleOCR 3.x (PP-OCRv5) 返回格式:
        - result 是一个列表，每个元素是单张图片的识别结果对象
        - 结果对象有 rec_texts, rec_scores, dt_polys 等属性
        """
        boxes = []
        
        for res in result:
            try:
                # 方式1: 对象属性访问 (PaddleOCR 3.x 风格)
                if hasattr(res, 'rec_texts') and hasattr(res, 'dt_polys'):
                    rec_texts = res.rec_texts if res.rec_texts is not None else []
                    rec_scores = res.rec_scores if hasattr(res, 'rec_scores') and res.rec_scores is not None else []
                    dt_polys = res.dt_polys if res.dt_polys is not None else []
                    
                    logger.debug(f"解析到 {len(rec_texts)} 个文本, {len(dt_polys)} 个边界框")
                    
                    for i, text in enumerate(rec_texts):
                        if text and i < len(dt_polys):
                            poly = dt_polys[i]
                            confidence = float(rec_scores[i]) if i < len(rec_scores) else 0.0
                            # 转换坐标为列表格式
                            if hasattr(poly, 'tolist'):
                                box_coords = poly.tolist()
                            else:
                                box_coords = [list(p) for p in poly]
                            boxes.append(TextBox(
                                text=str(text).strip(),
                                box=box_coords,
                                confidence=confidence
                            ))
                
                # 方式2: 字典格式
                elif isinstance(res, dict):
                    rec_texts = res.get('rec_texts', [])
                    rec_scores = res.get('rec_scores', [])
                    dt_polys = res.get('dt_polys', [])
                    
                    for i, text in enumerate(rec_texts):
                        if text and i < len(dt_polys):
                            poly = dt_polys[i]
                            confidence = float(rec_scores[i]) if i < len(rec_scores) else 0.0
                            if hasattr(poly, 'tolist'):
                                box_coords = poly.tolist()
                            else:
                                box_coords = [list(p) for p in poly]
                            boxes.append(TextBox(
                                text=str(text).strip(),
                                box=box_coords,
                                confidence=confidence
                            ))
                
                # 方式3: 旧版 PaddleOCR 2.x 格式 [[box, (text, score)], ...]
                elif isinstance(res, list) and len(res) > 0:
                    for item in res:
                        if isinstance(item, (list, tuple)) and len(item) >= 2:
                            box_data = item[0]
                            text_data = item[1]
                            if isinstance(text_data, (list, tuple)) and len(text_data) >= 2:
                                text = str(text_data[0]).strip()
                                confidence = float(text_data[1])
                                if hasattr(box_data, 'tolist'):
                                    box_coords = box_data.tolist()
                                else:
                                    box_coords = [list(p) for p in box_data]
                                boxes.append(TextBox(
                                    text=text,
                                    box=box_coords,
                                    confidence=confidence
                                ))
                else:
                    # 记录未知格式以便调试
                    logger.warning(f"未知的 OCR 结果格式: type={type(res)}, value={str(res)[:200]}")
                    
            except Exception as e:
                logger.warning(f"解析 OCR 结果时出错: {e}, 结果类型: {type(res)}")
                continue
        
        return boxes
    
    def _preprocess_image(self, image: Image.Image, max_side: int = 2000) -> Image.Image:
        """
        预处理图片：如果图片太大，等比例缩小
        
        Args:
            image: PIL Image 对象
            max_side: 最大边长限制（默认 2000 像素）
        
        Returns:
            处理后的 PIL Image 对象
        """
        width, height = image.size
        
        # 如果图片不需要缩小，直接返回
        if width <= max_side and height <= max_side:
            return image
        
        # 计算缩放比例
        scale = min(max_side / width, max_side / height)
        new_width = int(width * scale)
        new_height = int(height * scale)
        
        logger.info(f"图片缩放: {width}x{height} -> {new_width}x{new_height}")
        
        # 使用高质量的缩放算法
        return image.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    def process_image(self, image_bytes: bytes) -> Tuple[List[TextBox], float, float]:
        """
        处理单张图片进行 OCR
        返回：(文本框列表, 图片宽度, 图片高度)
        """
        # 读取图片获取尺寸
        image = Image.open(io.BytesIO(image_bytes))
        original_width, original_height = image.size
        
        # 预处理：缩小过大的图片
        image = self._preprocess_image(image)
        width, height = image.size
        
        # 计算缩放比例（用于坐标转换）
        scale_x = original_width / width
        scale_y = original_height / height
        
        # 转换为 numpy 数组 (RGB)
        img_array = np.array(image.convert('RGB'))
        
        # 使用 PaddleOCR 3.x predict 方法
        # 注意: PaddleOCR 3.x 不再使用 cls 参数，而是使用 use_textline_orientation
        result = self.ocr.predict(img_array)
        
        # 解析结果
        boxes = self._parse_ocr_result(result)
        
        # 如果图片被缩小了，需要将坐标还原到原始尺寸
        if scale_x != 1.0 or scale_y != 1.0:
            for box in boxes:
                box.box = [[p[0] * scale_x, p[1] * scale_y] for p in box.box]
        
        logger.info(f"OCR 识别完成: 图片尺寸 {original_width}x{original_height}, 识别到 {len(boxes)} 个文本框")
        
        return boxes, original_width, original_height
    
    def extract_chat_from_image(
        self, 
        image_bytes: bytes,
        default_chat_name: Optional[str] = None
    ) -> Tuple[List[ChatMessage], Optional[str]]:
        """
        从单张截图中提取聊天消息
        返回：(消息列表, 检测到的聊天对象名称)
        """
        boxes, width, height = self.process_image(image_bytes)
        
        if not boxes:
            return [], None
        
        # 提取聊天对象名称
        chat_name = self._extract_chat_name(boxes, width) or default_chat_name
        
        messages = []
        for box in boxes:
            # 过滤 UI 文本
            if self._is_ui_text(box.text):
                continue
            
            # 判断说话人
            speaker = self._classify_speaker(box, width, chat_name)
            if not speaker:
                continue
            
            messages.append(ChatMessage(
                speaker=speaker,
                text=box.text.strip(),
                y_position=box.center_y
            ))
        
        # 按 Y 坐标排序（从上到下）
        messages.sort(key=lambda m: m.y_position)
        
        return messages, chat_name
    
    def process_multiple_images(
        self, 
        images: List[bytes]
    ) -> Tuple[str, Optional[str]]:
        """
        处理多张聊天截图，拼接成完整对话
        
        Args:
            images: 图片字节数据列表（按时间顺序）
        
        Returns:
            (拼接后的对话文本, 检测到的聊天对象名称)
        """
        all_messages: List[ChatMessage] = []
        detected_chat_name: Optional[str] = None
        
        for i, image_bytes in enumerate(images):
            try:
                messages, chat_name = self.extract_chat_from_image(
                    image_bytes, 
                    default_chat_name=detected_chat_name
                )
                
                # 更新聊天对象名称（如果检测到）
                if chat_name and not detected_chat_name:
                    detected_chat_name = chat_name
                    logger.info(f"检测到聊天对象名称: {chat_name}")
                
                # 为每张图的消息添加图片索引偏移，保证时间顺序
                # 假设每张图的高度相同，偏移量 = 图片索引 * 大数值
                offset = i * 100000
                for msg in messages:
                    msg.y_position += offset
                
                all_messages.extend(messages)
                logger.info(f"图片 {i+1}: 提取了 {len(messages)} 条消息")
                
            except Exception as e:
                logger.error(f"处理图片 {i+1} 时出错: {e}")
                continue
        
        # 按位置排序
        all_messages.sort(key=lambda m: m.y_position)
        
        # 合并连续相同说话人的消息
        merged_messages = self._merge_consecutive_messages(all_messages)
        
        # 格式化输出
        conversation_text = self._format_conversation(merged_messages, detected_chat_name)
        
        return conversation_text, detected_chat_name
    
    def _merge_consecutive_messages(
        self, 
        messages: List[ChatMessage]
    ) -> List[ChatMessage]:
        """合并连续相同说话人的消息（可能是换行导致的分割）"""
        if not messages:
            return []
        
        merged = []
        current = messages[0]
        
        for msg in messages[1:]:
            # 如果是同一说话人且 Y 坐标相近，合并
            if (msg.speaker == current.speaker and 
                abs(msg.y_position - current.y_position) < 50):
                current.text += msg.text
            else:
                merged.append(current)
                current = msg
        
        merged.append(current)
        return merged
    
    def _format_conversation(
        self, 
        messages: List[ChatMessage],
        chat_name: Optional[str]
    ) -> str:
        """格式化对话输出"""
        lines = []
        
        for msg in messages:
            speaker = msg.speaker
            # 如果是对方且有名称，可以选择使用名称或统一用"对方"
            if speaker != "我" and chat_name:
                speaker = "对方"  # 统一使用"对方"以便后续分析
            
            lines.append(f"{speaker}：{msg.text}")
        
        return "\n".join(lines)
    
    def _format_raw_ocr_for_llm(
        self,
        image_results: List[ImageOCRResult]
    ) -> str:
        """
        将原始 OCR 结果格式化为大模型可理解的格式
        """
        output = []
        for result in image_results:
            output.append(f"=== 图片 {result.image_index + 1} ===")
            for msg in result.messages:
                output.append(f"[{msg.speaker}] {msg.text}")
            output.append("")  # 空行分隔
        
        return "\n".join(output)
    
    async def _refine_conversation_with_llm(
        self,
        raw_ocr_text: str,
        detected_chat_name: Optional[str]
    ) -> Tuple[str, Optional[str]]:
        """
        使用大模型整理 OCR 识别的对话
        
        Args:
            raw_ocr_text: 原始 OCR 识别结果
            detected_chat_name: 检测到的聊天对象名称
        
        Returns:
            (整理后的对话文本, 对方名称)
        """
        from app.services.llm_client import llm_client, parse_llm_json, LLMAPIError
        
        system_prompt = """你是一个专业的聊天记录整理助手。你的任务是将 OCR 识别的微信聊天截图文本整理成标准格式的对话。

你需要：
1. 识别对话双方：一方是"我"，另一方是聊天对方（从截图顶部标题或对话内容推断对方名称）
2. 按时间顺序重新整理对话：图片可能不是按时间顺序给的，你需要根据对话的逻辑关系判断正确顺序
3. 去除重复内容：同一条消息可能在多张截图中出现
4. 过滤无关内容：移除 UI 元素、系统提示、时间戳等非对话内容
5. 合并被截断的消息：如果一条消息被分成多行，合并成完整的一条

输出格式要求（JSON）：
{
    "other_name": "对方名称",
    "conversation": "整理后的对话文本"
}

对话文本格式示例：
我：你好

小明：你好呀

19:23

我：最近怎么样？

小明：还不错，你呢？

注意：
- 时间戳单独占一行，用于分隔不同时段的对话
- 每条消息格式为 "说话人：消息内容"
- 说话人只能是"我"或对方的名称
- 对话内容要保持原意，不要修改或补充
- 如果无法确定对方名称，使用"对方"作为默认值"""

        user_prompt = f"""请整理以下 OCR 识别的微信聊天截图内容：

{raw_ocr_text}

{'检测到的聊天对象名称：' + detected_chat_name if detected_chat_name else '未检测到聊天对象名称，请从内容中推断'}

请按照要求整理成标准对话格式，输出 JSON。"""

        try:
            response = await llm_client.generate(
                prompt=user_prompt,
                system_message=system_prompt,
                temperature=0.3,  # 低温度保证输出稳定
                max_tokens=4000,
                force_json=True
            )
            
            result = parse_llm_json(response)
            
            other_name = result.get("other_name", detected_chat_name or "对方")
            conversation = result.get("conversation", "")
            
            logger.info(f"大模型整理完成 - 对方名称: {other_name}, 对话长度: {len(conversation)}")
            
            return conversation, other_name
            
        except LLMAPIError as e:
            logger.error(f"大模型调用失败: {e}")
            # 如果大模型调用失败，返回原始结果
            return raw_ocr_text, detected_chat_name
        except Exception as e:
            logger.error(f"对话整理失败: {e}")
            return raw_ocr_text, detected_chat_name
    
    async def process_multiple_images_async(
        self, 
        images: List[bytes],
        use_llm_refine: bool = True
    ) -> Tuple[str, Optional[str]]:
        """
        异步处理多张聊天截图，拼接成完整对话
        
        Args:
            images: 图片字节数据列表
            use_llm_refine: 是否使用大模型整理对话
        
        Returns:
            (整理后的对话文本, 聊天对象名称)
        """
        image_results: List[ImageOCRResult] = []
        detected_chat_name: Optional[str] = None
        
        for i, image_bytes in enumerate(images):
            try:
                boxes, width, height = self.process_image(image_bytes)
                
                # 提取聊天对象名称
                chat_name = self._extract_chat_name(boxes, width)
                if chat_name and not detected_chat_name:
                    detected_chat_name = chat_name
                    logger.info(f"检测到聊天对象名称: {chat_name}")
                
                # 构建消息列表
                messages = []
                raw_texts = []
                for box in boxes:
                    raw_texts.append(box.text)
                    
                    # 过滤 UI 文本
                    if self._is_ui_text(box.text):
                        continue
                    
                    # 判断说话人
                    speaker = self._classify_speaker(box, width, detected_chat_name or chat_name)
                    if not speaker:
                        continue
                    
                    messages.append(ChatMessage(
                        speaker=speaker,
                        text=box.text.strip(),
                        y_position=box.center_y
                    ))
                
                # 按 Y 坐标排序
                messages.sort(key=lambda m: m.y_position)
                
                image_results.append(ImageOCRResult(
                    image_index=i,
                    raw_texts=raw_texts,
                    messages=messages
                ))
                
                logger.info(f"图片 {i+1}: 识别了 {len(raw_texts)} 个文本框, 提取了 {len(messages)} 条消息")
                
            except Exception as e:
                logger.error(f"处理图片 {i+1} 时出错: {e}")
                continue
        
        if not image_results:
            return "", None
        
        # 格式化原始 OCR 结果
        raw_ocr_text = self._format_raw_ocr_for_llm(image_results)
        
        # 使用大模型整理对话
        if use_llm_refine:
            try:
                conversation, other_name = await self._refine_conversation_with_llm(
                    raw_ocr_text,
                    detected_chat_name
                )
                return conversation, other_name
            except Exception as e:
                logger.error(f"大模型整理失败，回退到原始结果: {e}")
        
        # 如果不使用大模型或大模型失败，使用原始合并逻辑
        all_messages: List[ChatMessage] = []
        for i, result in enumerate(image_results):
            offset = i * 100000
            for msg in result.messages:
                msg.y_position += offset
            all_messages.extend(result.messages)
        
        all_messages.sort(key=lambda m: m.y_position)
        merged_messages = self._merge_consecutive_messages(all_messages)
        conversation_text = self._format_conversation(merged_messages, detected_chat_name)
        
        return conversation_text, detected_chat_name
    
    def process_multiple_images(
        self, 
        images: List[bytes]
    ) -> Tuple[str, Optional[str]]:
        """
        处理多张聊天截图，拼接成完整对话（同步版本，不使用大模型）
        
        Args:
            images: 图片字节数据列表（按时间顺序）
        
        Returns:
            (拼接后的对话文本, 检测到的聊天对象名称)
        """
        all_messages: List[ChatMessage] = []
        detected_chat_name: Optional[str] = None
        
        for i, image_bytes in enumerate(images):
            try:
                messages, chat_name = self.extract_chat_from_image(
                    image_bytes, 
                    default_chat_name=detected_chat_name
                )
                
                # 更新聊天对象名称（如果检测到）
                if chat_name and not detected_chat_name:
                    detected_chat_name = chat_name
                    logger.info(f"检测到聊天对象名称: {chat_name}")
                
                # 为每张图的消息添加图片索引偏移，保证时间顺序
                # 假设每张图的高度相同，偏移量 = 图片索引 * 大数值
                offset = i * 100000
                for msg in messages:
                    msg.y_position += offset
                
                all_messages.extend(messages)
                logger.info(f"图片 {i+1}: 提取了 {len(messages)} 条消息")
                
            except Exception as e:
                logger.error(f"处理图片 {i+1} 时出错: {e}")
                continue
        
        # 按位置排序
        all_messages.sort(key=lambda m: m.y_position)
        
        # 合并连续相同说话人的消息
        merged_messages = self._merge_consecutive_messages(all_messages)
        
        # 格式化输出
        conversation_text = self._format_conversation(merged_messages, detected_chat_name)
        
        return conversation_text, detected_chat_name


# 全局单例
ocr_service = WeChatOCRService()

