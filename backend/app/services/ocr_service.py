"""
微信聊天记录截图 OCR 服务
使用腾讯云通用印刷体识别 API 进行中文识别，并调用大模型进行对话整理
支持基于气泡颜色的说话人识别
"""
import base64
import logging
import io
import re
import json
from typing import List, Tuple, Optional
from dataclasses import dataclass, field
from PIL import Image
import colorsys

from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException
from tencentcloud.ocr.v20181119 import ocr_client, models

from app.core.config import settings

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
    def bottom_y(self) -> float:
        """文本框底部 Y 坐标"""
        return max(p[1] for p in self.box)
    
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
    
    @property
    def height(self) -> float:
        """文本框高度"""
        return self.bottom_y - self.top_y


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
        # 系统状态栏（这些无论在哪都过滤）
        r'^\d{1,2}:\d{2}$',  # 时间 HH:MM
        r'^\d{1,2}:\d{2}:\d{2}$',  # 时间 HH:MM:SS
        r'^\d+\s*%$',  # 电量百分比
        r'^[45]G',  # 4G/5G 开头的（如 "5G 5G26"）
        r'5G\d*',  # 包含 5G 的
        r'^HD$|^VoLTE$',
        r'^中国移动|^中国联通|^中国电信',
        r'^CMCC|^CUCC|^CTCC',
        # 微信 UI 按钮
        r'^返回$|^发送$|^更多$|^取消$',
        r'^语音$|^视频$|^转账$|^红包$|^位置$',
        r'^表情$|^相册$|^拍摄$|^收藏$',
        r'^\+$',
        r'^消息$|^通讯录$|^发现$',
        r'^聊天$|^朋友圈$|^扫一扫$',
        r'^\[.*\]$',  # [语音] [图片] 等
        r'^···$|^\.\.\.$|^…$|^•••$',  # 注意: \.\.\. 匹配字面的三个点
        # 导航符号
        r'^<$|^>$|^<<$|^>>$',
        r'^←$|^→$|^▶$|^◀$',
        # 键盘相关
        r'^GC\d*$',  # 键盘识别错误
    ]
    
    # 时间戳模式（用于识别对话中的时间分隔，不过滤但标记）
    TIME_STAMP_PATTERNS = [
        r'^\d{1,2}月\d{1,2}日',
        r'^星期[一二三四五六日]$',
        r'^周[一二三四五六日]$',
        r'^上午|^下午|^凌晨|^晚上',
        r'^昨天|^今天|^刚刚',
        r'\d{4}[/\-年]\d{1,2}[/\-月]\d{1,2}',
        r'\d{1,2}月\d{1,2}日.*\d{1,2}:\d{2}',  # 如 "12月5日晚上6:28"
    ]
    
    def __init__(self):
        """初始化腾讯云 OCR 客户端"""
        self._client = None
    
    @property
    def client(self) -> ocr_client.OcrClient:
        """懒加载腾讯云 OCR 客户端"""
        if self._client is None:
            logger.info("正在初始化腾讯云 OCR 客户端...")
            
            cred = credential.Credential(
                settings.tencent_secret_id,
                settings.tencent_secret_key
            )
            
            http_profile = HttpProfile()
            http_profile.endpoint = "ocr.tencentcloudapi.com"
            
            client_profile = ClientProfile()
            client_profile.httpProfile = http_profile
            
            self._client = ocr_client.OcrClient(
                cred,
                settings.tencent_ocr_region,
                client_profile
            )
            
            logger.info("腾讯云 OCR 客户端初始化完成")
        return self._client
    
    def _is_ui_text(self, text: str) -> bool:
        """
        判断是否是 UI 元素文本（需要过滤）
        只过滤明确的 UI 元素，不过滤可能是聊天内容的短文本
        """
        text = text.strip()
        
        # 空文本过滤
        if not text:
            return True
        
        # 只过滤单个非中文的特殊字符
        if len(text) == 1:
            # 中文字符范围
            if '\u4e00' <= text <= '\u9fff':
                return False  # 中文单字不过滤，可能是聊天内容
            # 数字和字母不过滤
            if text.isalnum():
                return False
            # 其他单字符（标点符号等）过滤
            return True
        
        # 2-3个字的短文本，只有明确匹配UI模式才过滤
        # 像 "太亏了"、"为啥呀"、"嗯嗯" 这些不应该被过滤
        
        # 匹配 UI 过滤模式
        for pattern in self.UI_FILTER_PATTERNS:
            if re.match(pattern, text, re.IGNORECASE):
                return True
        
        # 不过滤
        return False
    
    def _is_time_stamp(self, text: str) -> bool:
        """判断是否是时间戳（对话分隔符）"""
        text = text.strip()
        for pattern in self.TIME_STAMP_PATTERNS:
            if re.match(pattern, text) or re.search(pattern, text):
                return True
        return False
    
    def _is_in_status_bar(self, box: TextBox, image_height: float) -> bool:
        """判断文本是否在状态栏区域（顶部 5%）"""
        return box.top_y < image_height * 0.05
    
    def _is_in_input_area(self, box: TextBox, image_height: float) -> bool:
        """判断文本是否在输入框区域（底部 8%）"""
        return box.bottom_y > image_height * 0.92
    
    def _get_bubble_color(self, image: Image.Image, box: TextBox) -> Tuple[str, Tuple[int, int, int]]:
        """
        检测文本框周围的气泡颜色
        
        微信气泡颜色：
        - 绿色气泡（我）：RGB 约 (149, 236, 105) 或 HSV 色相约 90-130
        - 白色气泡（对方）：RGB 约 (255, 255, 255) 或接近白色/浅灰
        
        采样策略：在文本框的上方和左右两侧采样，取最可能的颜色
        
        Returns:
            (speaker, avg_color): 说话人标识和平均颜色
        """
        try:
            img_width, img_height = image.size
            
            def sample_color(x: int, y: int, w: int, h: int) -> Optional[Tuple[int, int, int, float, float, float]]:
                """采样指定区域的颜色，返回 (R, G, B, H, S, V)"""
                x = max(0, min(x, img_width - w))
                y = max(0, min(y, img_height - h))
                
                region = image.crop((x, y, x + w, y + h))
                if region.mode != 'RGB':
                    region = region.convert('RGB')
                
                pixels = list(region.getdata())
                if not pixels:
                    return None
                
                avg_r = sum(p[0] for p in pixels) // len(pixels)
                avg_g = sum(p[1] for p in pixels) // len(pixels)
                avg_b = sum(p[2] for p in pixels) // len(pixels)
                
                h, s, v = colorsys.rgb_to_hsv(avg_r / 255, avg_g / 255, avg_b / 255)
                return (avg_r, avg_g, avg_b, h * 360, s * 100, v * 100)
            
            def is_green(h: float, s: float, v: float) -> bool:
                """判断是否是微信绿色"""
                return 70 <= h <= 150 and s > 20 and v > 40
            
            def is_white(s: float, v: float) -> bool:
                """判断是否是白色/浅灰色"""
                return s < 25 and v > 75
            
            # 采样点列表：(x, y, width, height, description)
            sample_points = [
                # 文本框上方
                (int(box.left_x) + 5, int(box.top_y) - 15, 20, 10, "上方"),
                # 文本框左侧
                (int(box.left_x) - 25, int(box.center_y) - 10, 20, 20, "左侧"),
                # 文本框右侧
                (int(box.right_x) + 5, int(box.center_y) - 10, 20, 20, "右侧"),
            ]
            
            green_count = 0
            white_count = 0
            last_color = (0, 0, 0)
            
            for x, y, w, h, desc in sample_points:
                color_info = sample_color(x, y, w, h)
                if color_info:
                    r, g, b, hue, sat, val = color_info
                    last_color = (r, g, b)
                    
                    if is_green(hue, sat, val):
                        green_count += 1
                    elif is_white(sat, val):
                        white_count += 1
            
            # 根据投票结果判断
            if green_count > white_count and green_count >= 1:
                return "我", last_color
            elif white_count > green_count and white_count >= 1:
                return "对方", last_color
            
            # 无法确定
            return "", last_color
            
        except Exception as e:
            logger.warning(f"颜色检测失败: {e}")
            return "", (0, 0, 0)
    
    def _classify_speaker_by_color(
        self, 
        image: Image.Image,
        box: TextBox, 
        chat_name: Optional[str]
    ) -> Tuple[str, str]:
        """
        基于气泡颜色判断说话人
        
        Returns:
            (speaker, color_info): 说话人和颜色信息
        """
        speaker, color = self._get_bubble_color(image, box)
        color_info = f"RGB{color}"
        
        if speaker == "我":
            return "我", f"绿色气泡 {color_info}"
        elif speaker == "对方":
            return chat_name or "对方", f"白色气泡 {color_info}"
        else:
            return "", f"未识别 {color_info}"
    
    def _extract_chat_name(self, boxes: List[TextBox], image_width: float, image_height: float) -> Optional[str]:
        """
        从截图顶部提取聊天对象名称
        微信聊天界面顶部中央通常显示对方名称
        
        特点：
        - 位于顶部（约 3-8% 的位置）
        - 水平居中
        - 长度通常为 1-6 个字符
        """
        if not boxes:
            return None
        
        # 状态栏高度通常占 3% 左右，聊天标题在 3-10% 区域
        top_region_start = image_height * 0.03
        top_region_end = image_height * 0.10
        
        # 找到顶部区域的文本框（排除状态栏）
        top_boxes = [
            b for b in boxes 
            if top_region_start < b.center_y < top_region_end
        ]
        
        if not top_boxes:
            # 放宽条件再试
            top_boxes = [b for b in boxes if b.center_y < image_height * 0.12]
        
        if not top_boxes:
            return None
        
        # 找中间位置的文本（排除左右两侧的返回按钮等）
        center_x = image_width / 2
        
        # 候选名称列表
        candidates = []
        for b in top_boxes:
            text = b.text.strip()
            
            # 过滤条件
            if self._is_ui_text(text):
                continue
            
            # 微信用户名长度通常为 1-12 个字符
            if len(text) < 1 or len(text) > 12:
                continue
            
            # 检查是否在中间区域（左右各 25% 范围内）
            if abs(b.center_x - center_x) > image_width * 0.25:
                continue
            
            # 计算与中心的距离作为权重
            distance_to_center = abs(b.center_x - center_x)
            candidates.append((text, distance_to_center, b))
        
        if candidates:
            # 选择最接近中心的
            candidates.sort(key=lambda x: x[1])
            chat_name = candidates[0][0]
            return chat_name
        
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
        - 右侧气泡（绿色）是"我"发送的 - 文本右边缘靠近屏幕右侧
        - 左侧气泡（白色）是对方发送的 - 文本左边缘靠近屏幕左侧
        
        使用边缘位置而非中心点，因为长消息的中心点会偏向中间
        """
        # 计算相对位置
        relative_left = box.left_x / image_width
        relative_right = box.right_x / image_width
        
        # 右侧气泡：文本右边缘超过 75%，且左边缘超过 35%（排除跨越全屏的文本）
        if relative_right > 0.75 and relative_left > 0.35:
            return "我"
        
        # 左侧气泡：文本左边缘小于 25%，且右边缘小于 65%（排除跨越全屏的文本）
        if relative_left < 0.25 and relative_right < 0.65:
            return chat_name or "对方"
        
        # 中间位置的文本，可能是：
        # 1. 长消息跨越较大区域
        # 2. 时间戳等系统消息
        # 
        # 对于跨越较大区域的消息，根据左边缘判断
        if relative_right - relative_left > 0.3:  # 文本宽度超过屏幕 30%
            if relative_left < 0.20:
                return chat_name or "对方"
            elif relative_left > 0.30:
                return "我"
        
        # 其他情况视为系统消息，返回空字符串表示过滤
        return ""
    
    def _parse_tencent_ocr_result(self, response: models.GeneralBasicOCRResponse) -> List[TextBox]:
        """
        解析腾讯云 OCR 返回的结果
        """
        boxes = []
        
        if not response.TextDetections:
            return boxes
        
        for detection in response.TextDetections:
            text = detection.DetectedText
            if not text or not text.strip():
                continue
            
            confidence = detection.Confidence / 100.0  # 转换为 0-1 范围
            
            # 使用 Polygon 获取四个角的坐标
            if detection.Polygon:
                box_coords = [[p.X, p.Y] for p in detection.Polygon]
            elif detection.ItemPolygon:
                # 如果没有 Polygon，使用 ItemPolygon 构造矩形框
                ip = detection.ItemPolygon
                box_coords = [
                    [ip.X, ip.Y],
                    [ip.X + ip.Width, ip.Y],
                    [ip.X + ip.Width, ip.Y + ip.Height],
                    [ip.X, ip.Y + ip.Height]
                ]
            else:
                continue
            
            boxes.append(TextBox(
                text=text.strip(),
                box=box_coords,
                confidence=confidence
            ))
        
        return boxes
    
    def _preprocess_image(self, image: Image.Image, max_side: int = 2000) -> Image.Image:
        """
        预处理图片：如果图片太大，等比例缩小
        """
        width, height = image.size
        
        if width <= max_side and height <= max_side:
            return image
        
        scale = min(max_side / width, max_side / height)
        new_width = int(width * scale)
        new_height = int(height * scale)
        
        logger.info(f"图片缩放: {width}x{height} -> {new_width}x{new_height}")
        
        return image.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    def process_image(self, image_bytes: bytes) -> Tuple[List[TextBox], float, float, Image.Image]:
        """
        处理单张图片进行 OCR
        返回：(文本框列表, 图片宽度, 图片高度, 原始图片对象)
        """
        original_image = Image.open(io.BytesIO(image_bytes))
        original_width, original_height = original_image.size
        
        # 确保是 RGB 模式用于后续颜色分析
        if original_image.mode != 'RGB':
            original_image = original_image.convert('RGB')
        
        image = self._preprocess_image(original_image.copy())
        width, height = image.size
        
        scale_x = original_width / width
        scale_y = original_height / height
        
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG', quality=95)
        image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        try:
            req = models.GeneralBasicOCRRequest()
            req.ImageBase64 = image_base64
            req.LanguageType = "zh"
            
            response = self.client.GeneralBasicOCR(req)
            boxes = self._parse_tencent_ocr_result(response)
            
            if scale_x != 1.0 or scale_y != 1.0:
                for box in boxes:
                    box.box = [[p[0] * scale_x, p[1] * scale_y] for p in box.box]
            
            logger.info(f"OCR 识别完成: 图片尺寸 {original_width}x{original_height}, 识别到 {len(boxes)} 个文本框")
            
            return boxes, original_width, original_height, original_image
            
        except TencentCloudSDKException as e:
            logger.error(f"腾讯云 OCR API 调用失败: {e}")
            raise
    
    def extract_chat_from_image(
        self, 
        image_bytes: bytes,
        default_chat_name: Optional[str] = None
    ) -> Tuple[List[ChatMessage], Optional[str]]:
        """
        从单张截图中提取聊天消息
        返回：(消息列表, 检测到的聊天对象名称)
        """
        boxes, width, height, pil_image = self.process_image(image_bytes)
        
        if not boxes:
            return [], None
        
        chat_name = self._extract_chat_name(boxes, width, height) or default_chat_name
        
        messages = []
        for box in boxes:
            # 过滤状态栏和输入框区域
            if self._is_in_status_bar(box, height):
                continue
            if self._is_in_input_area(box, height):
                continue
            # 过滤时间戳
            if self._is_time_stamp(box.text):
                continue
            # 过滤 UI 元素
            if self._is_ui_text(box.text):
                continue
            
            # 使用颜色识别说话人
            speaker, _ = self._classify_speaker_by_color(pil_image, box, chat_name)
            
            # 回退到位置判断
            if not speaker:
                speaker = self._classify_speaker(box, width, chat_name)
            
            if not speaker:
                continue
            
            messages.append(ChatMessage(
                speaker=speaker,
                text=box.text.strip(),
                y_position=box.center_y
            ))
        
        messages.sort(key=lambda m: m.y_position)
        
        return messages, chat_name
    
    def _merge_consecutive_messages(
        self, 
        messages: List[ChatMessage],
        y_threshold: float = 120
    ) -> List[ChatMessage]:
        """
        合并连续相同说话人的消息（可能是换行导致的分割）
        
        Args:
            messages: 消息列表
            y_threshold: Y 坐标差值阈值，小于此值认为是同一条消息的不同行
        """
        if not messages:
            return []
        
        # 先按 Y 坐标排序
        sorted_messages = sorted(messages, key=lambda m: m.y_position)
        
        merged = []
        current = ChatMessage(
            speaker=sorted_messages[0].speaker,
            text=sorted_messages[0].text,
            y_position=sorted_messages[0].y_position
        )
        last_y = sorted_messages[0].y_position
        
        for msg in sorted_messages[1:]:
            y_diff = msg.y_position - last_y
            
            # 如果是同一说话人且 Y 坐标相近（同一条消息的多行）
            if msg.speaker == current.speaker and y_diff < y_threshold:
                # 合并文本（不加空格，中文不需要）
                current.text = current.text + msg.text
            else:
                # 保存当前消息，开始新消息
                merged.append(current)
                current = ChatMessage(
                    speaker=msg.speaker,
                    text=msg.text,
                    y_position=msg.y_position
                )
            
            last_y = msg.y_position
        
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
            if speaker != "我" and chat_name:
                speaker = "对方"
            
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
            output.append(f"原始识别文本（共{len(result.raw_texts)}个）:")
            for i, text in enumerate(result.raw_texts):
                output.append(f"  {i+1}. {text}")
            output.append("")
            output.append(f"提取的对话消息（共{len(result.messages)}条）:")
            for msg in result.messages:
                output.append(f"  [{msg.speaker}] {msg.text}")
            output.append("")
        
        return "\n".join(output)
    
    async def _refine_conversation_with_llm(
        self,
        raw_ocr_text: str,
        detected_chat_name: Optional[str]
    ) -> Tuple[str, Optional[str]]:
        """
        使用大模型整理 OCR 识别的对话
        """
        from app.services.llm_client import llm_client, parse_llm_json, LLMAPIError
        
        system_prompt = """你是微信聊天记录整理助手。将输入的对话消息原样转换为标准格式。

## 核心规则（必须遵守）：

1. **完整保留所有消息**：输入中每一条 [我] 或 [对方名称] 的消息都必须出现在输出中
2. **保持原始顺序**：第一条消息可能是"我"说的，也可能是对方说的，按原顺序输出
3. **不要丢弃任何消息**：即使是很短的消息（如"嗯"、"好"）也要保留

## 格式转换：

输入格式：
  [涵宝] 消息内容
  [我] 消息内容

输出格式：
涵宝：消息内容

我：消息内容

（每条消息之间用空行分隔）

## 输出 JSON：
{
    "other_name": "对方名称",
    "conversation": "转换后的对话"
}"""

        user_prompt = f"""请将以下对话消息转换为标准格式。

**重要：第一条消息是 [{detected_chat_name or '对方'}] 的，不要丢弃！**

{raw_ocr_text}

对方名称：{detected_chat_name or '对方'}

请将所有消息（共{raw_ocr_text.count('[我]') + raw_ocr_text.count('[' + (detected_chat_name or '') + ']')}条）转换为标准格式输出。"""

        try:
            response = await llm_client.generate(
                prompt=user_prompt,
                system_message=system_prompt,
                temperature=0.3,
                max_tokens=4000,
                force_json=True
            )
            
            result = parse_llm_json(response)
            other_name = result.get("other_name", detected_chat_name or "对方")
            conversation = result.get("conversation", "")
            
            return conversation, other_name
            
        except LLMAPIError as e:
            logger.error(f"大模型调用失败: {e}")
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
        """
        image_results: List[ImageOCRResult] = []
        detected_chat_name: Optional[str] = None
        
        for i, image_bytes in enumerate(images):
            try:
                boxes, width, height, pil_image = self.process_image(image_bytes)
                
                # 提取聊天对象名称
                chat_name = self._extract_chat_name(boxes, width, height)
                if chat_name and not detected_chat_name:
                    detected_chat_name = chat_name
                
                # 构建消息列表
                messages = []
                raw_texts = []
                filtered_texts = []
                time_stamps = []
                
                for box in boxes:
                    raw_texts.append(box.text)
                    
                    # 1. 检查是否在状态栏区域
                    if self._is_in_status_bar(box, height):
                        filtered_texts.append(box.text)
                        continue
                    
                    # 2. 检查是否在输入框区域
                    if self._is_in_input_area(box, height):
                        filtered_texts.append(box.text)
                        continue
                    
                    # 3. 检查是否是时间戳
                    if self._is_time_stamp(box.text):
                        time_stamps.append(box.text)
                        continue
                    
                    # 4. 检查是否是 UI 元素
                    if self._is_ui_text(box.text):
                        filtered_texts.append(box.text)
                        continue
                    
                    # 5. 检查是否是聊天标题（顶部显示的对方名称）
                    current_chat_name = chat_name or detected_chat_name
                    if current_chat_name and box.text.strip() == current_chat_name:
                        # 检查是否在顶部区域（前 15% 的位置）
                        if box.center_y / height < 0.15:
                            filtered_texts.append(box.text)
                            continue
                    
                    # 6. 使用颜色识别说话人（主要方法）
                    speaker, _ = self._classify_speaker_by_color(
                        pil_image, box, chat_name or detected_chat_name
                    )
                    
                    # 7. 如果颜色识别失败，回退到位置判断
                    if not speaker:
                        speaker = self._classify_speaker(box, width, chat_name or detected_chat_name)
                    
                    if speaker:
                        messages.append(ChatMessage(
                            speaker=speaker,
                            text=box.text.strip(),
                            y_position=box.center_y
                        ))
                    else:
                        filtered_texts.append(box.text)
                
                # 按 Y 坐标排序
                messages.sort(key=lambda m: m.y_position)
                
                # 合并相邻消息
                merged_messages = self._merge_consecutive_messages(messages)
                
                image_results.append(ImageOCRResult(
                    image_index=i,
                    raw_texts=raw_texts,
                    messages=merged_messages
                ))
                
                logger.info(f"图片 {i+1} 处理完成: 提取 {len(merged_messages)} 条消息")
                
            except Exception as e:
                logger.error(f"处理图片 {i+1} 时出错: {e}", exc_info=True)
                continue
        
        if not image_results:
            return "", None
        
        # 格式化原始 OCR 结果（用于大模型处理）
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
        """
        all_messages: List[ChatMessage] = []
        detected_chat_name: Optional[str] = None
        
        for i, image_bytes in enumerate(images):
            try:
                messages, chat_name = self.extract_chat_from_image(
                    image_bytes, 
                    default_chat_name=detected_chat_name
                )
                
                if chat_name and not detected_chat_name:
                    detected_chat_name = chat_name
                    logger.info(f"检测到聊天对象名称: {chat_name}")
                
                offset = i * 100000
                for msg in messages:
                    msg.y_position += offset
                
                all_messages.extend(messages)
                logger.info(f"图片 {i+1}: 提取了 {len(messages)} 条消息")
                
            except Exception as e:
                logger.error(f"处理图片 {i+1} 时出错: {e}")
                continue
        
        all_messages.sort(key=lambda m: m.y_position)
        merged_messages = self._merge_consecutive_messages(all_messages)
        conversation_text = self._format_conversation(merged_messages, detected_chat_name)
        
        return conversation_text, detected_chat_name


# 全局单例
ocr_service = WeChatOCRService()
