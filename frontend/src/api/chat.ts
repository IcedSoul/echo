/**
 * AI 聊天 API
 */
import apiClient from './client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  image_url?: string;
}

export interface SendMessageRequest {
  session_id?: string;
  message: string;
  user_id: string;
  image_base64?: string;
}

export interface SendMessageResponse {
  session_id: string;
  message: ChatMessage;
  reply: ChatMessage;
}

export interface ChatSessionInfo {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ChatHistoryItem {
  session_id: string;
  title: string;
  last_message: string;
  created_at: string;
  updated_at: string;
}

export interface ChatHistoryResponse {
  sessions: ChatHistoryItem[];
  total: number;
}

export interface SessionMessagesResponse {
  session_id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
}

/**
 * 创建新聊天会话
 */
export const createChatSession = async (
  userId: string,
  title?: string,
  token?: string
): Promise<ChatSessionInfo> => {
  const headers: any = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await apiClient.post('/chat/sessions', {
    user_id: userId,
    title,
  }, { headers });

  return response.data;
};

/**
 * 发送消息
 */
export const sendMessage = async (
  request: SendMessageRequest,
  token?: string
): Promise<SendMessageResponse> => {
  const headers: any = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await apiClient.post('/chat/send', request, { headers });

  return response.data;
};

/**
 * 获取聊天会话列表
 */
export const getChatSessions = async (
  userId: string,
  token?: string,
  limit: number = 20,
  offset: number = 0
): Promise<ChatHistoryResponse> => {
  const headers: any = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await apiClient.get('/chat/sessions', {
    params: { user_id: userId, limit, offset },
    headers,
  });

  return response.data;
};

/**
 * 获取会话消息
 */
export const getSessionMessages = async (
  sessionId: string,
  userId: string,
  token?: string
): Promise<SessionMessagesResponse> => {
  const headers: any = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await apiClient.get(`/chat/sessions/${sessionId}`, {
    params: { user_id: userId },
    headers,
  });

  return response.data;
};

/**
 * 删除会话
 */
export const deleteChatSession = async (
  sessionId: string,
  userId: string,
  token?: string
): Promise<void> => {
  const headers: any = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  await apiClient.delete(`/chat/sessions/${sessionId}`, {
    params: { user_id: userId },
    headers,
  });
};

