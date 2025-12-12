/**
 * 用户反馈相关 API
 */

import apiClient from './client';

export interface SubmitFeedbackRequest {
  content: string;
  contact?: string;
}

export interface SubmitFeedbackResponse {
  feedback_id: string;
  user_id: string;
  content: string;
  contact?: string;
  status: 'pending' | 'read' | 'replied';
  created_at: string;
}

/**
 * 提交用户反馈
 */
export const submitFeedback = async (
  request: SubmitFeedbackRequest,
  token: string
): Promise<SubmitFeedbackResponse> => {
  const response = await apiClient.post<SubmitFeedbackResponse>(
    '/feedback/submit',
    request,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};
