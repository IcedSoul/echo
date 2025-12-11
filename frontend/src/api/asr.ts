/**
 * 语音识别 API
 */

import { API_BASE_URL } from '../config/api';

export interface ASRResponse {
  success: boolean;
  text: string;
  message: string;
}

export interface AudioAsset {
  uri: string;
  type?: string;
  fileName?: string;
}

/**
 * 上传语音进行识别
 * @param audio 音频资源
 * @param voiceFormat 音频格式（默认 wav）
 * @returns 识别结果
 */
export const recognizeSpeech = async (
  audio: AudioAsset,
  voiceFormat: string = 'wav'
): Promise<ASRResponse> => {
  const formData = new FormData();

  // 添加音频到 FormData
  formData.append('audio', {
    uri: audio.uri,
    type: audio.type || 'audio/wav',
    name: audio.fileName || `recording.${voiceFormat}`,
  } as any);

  formData.append('voice_format', voiceFormat);

  const response = await fetch(`${API_BASE_URL}/asr`, {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `语音识别请求失败: ${response.status}`
    );
  }

  return response.json();
};

