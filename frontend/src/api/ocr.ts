/**
 * OCR 聊天截图识别 API
 */

import { API_BASE_URL } from '../config/api';

export interface OCRChatResponse {
  success: boolean;
  conversation_text: string;
  chat_name: string | null;
  image_count: number;
  message: string;
}

export interface ImageAsset {
  uri: string;
  type?: string;
  fileName?: string;
}

/**
 * 上传聊天截图进行 OCR 识别
 * @param images 图片资源列表
 * @returns OCR 识别结果
 */
export const uploadChatScreenshots = async (
  images: ImageAsset[]
): Promise<OCRChatResponse> => {
  const formData = new FormData();

  // 添加图片到 FormData
  images.forEach((image, index) => {
    const uri = image.uri;
    const type = image.type || 'image/jpeg';
    const fileName = image.fileName || `screenshot_${index + 1}.jpg`;

    // React Native 的 FormData 需要特殊格式
    formData.append('images', {
      uri,
      type,
      name: fileName,
    } as any);
  });

  const response = await fetch(`${API_BASE_URL}/ocr-chat`, {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `OCR 请求失败: ${response.status}`
    );
  }

  return response.json();
};

