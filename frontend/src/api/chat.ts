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

/**
 * 流式消息事件类型
 */
export interface StreamEvent {
  type: 'session_id' | 'content' | 'done' | 'error';
  session_id?: string;
  content?: string;
  timestamp?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * 流式发送消息回调
 */
export interface StreamCallbacks {
  onSessionId?: (sessionId: string) => void;
  onContent?: (content: string) => void;
  onDone?: (sessionId: string, timestamp: string) => void;
  onError?: (error: any) => void;
}

/**
 * 发送消息（流式）
 */
export const sendMessageStream = async (
  request: SendMessageRequest,
  callbacks: StreamCallbacks,
  token?: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${apiClient.defaults.baseURL}/chat/send/stream`;

    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    let buffer = '';
    let lastProcessedIndex = 0;

    // 处理流式响应
    xhr.onprogress = () => {
      const newText = xhr.responseText.substring(lastProcessedIndex);
      lastProcessedIndex = xhr.responseText.length;
      buffer += newText;

      // 按行分割
      const lines = buffer.split('\n');
      // 保留最后一个可能不完整的行
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }

        // SSE 格式: "data: {...}"
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);

          try {
            const event: StreamEvent = JSON.parse(dataStr);

            // 处理不同类型的事件
            switch (event.type) {
              case 'session_id':
                if (event.session_id && callbacks.onSessionId) {
                  callbacks.onSessionId(event.session_id);
                }
                break;

              case 'content':
                if (event.content && callbacks.onContent) {
                  callbacks.onContent(event.content);
                }
                break;

              case 'done':
                if (callbacks.onDone && event.session_id && event.timestamp) {
                  callbacks.onDone(event.session_id, event.timestamp);
                }
                break;

              case 'error':
                if (callbacks.onError && event.error) {
                  callbacks.onError(event.error);
                }
                break;
            }
          } catch (e) {
            console.warn('Failed to parse SSE data:', dataStr, e);
          }
        }
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve();
      } else {
        const error = new Error(`Request failed with status ${xhr.status}`);
        if (callbacks.onError) {
          callbacks.onError(error);
        }
        reject(error);
      }
    };

    xhr.onerror = () => {
      const error = new Error('Network error occurred');
      if (callbacks.onError) {
        callbacks.onError(error);
      }
      reject(error);
    };

    xhr.ontimeout = () => {
      const error = new Error('Request timeout');
      if (callbacks.onError) {
        callbacks.onError(error);
      }
      reject(error);
    };

    // 发送请求
    xhr.send(JSON.stringify(request));
  });
};

