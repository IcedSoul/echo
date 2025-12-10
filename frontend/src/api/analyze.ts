/**
 * 分析相关 API
 */

import apiClient from './client';
import { AnalyzeConflictRequest, AnalyzeConflictResponse, HistoryItem, HistoryResponse } from '../types';

/**
 * 分析矛盾冲突
 */
export const analyzeConflict = async (
  data: AnalyzeConflictRequest
): Promise<AnalyzeConflictResponse> => {
  const response = await apiClient.post<AnalyzeConflictResponse>(
    '/analyze-conflict',
    data
  );
  return response.data;
};

/**
 * 获取分析结果
 */
export const getAnalysisResult = async (
  sessionId: string,
  userId: string,
  token?: string
): Promise<AnalyzeConflictResponse> => {
  const headers: any = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await apiClient.get<AnalyzeConflictResponse>(
    `/sessions/${sessionId}`,
    { 
      headers,
      params: { user_id: userId }
    }
  );
  return response.data;
};

/**
 * 获取用户历史记录
 */
export const getUserHistory = async (
  userId: string,
  token?: string,
  limit: number = 50,
  offset: number = 0,
  type?: string
): Promise<HistoryResponse> => {
  const headers: any = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const params: any = { user_id: userId, limit, offset };
  if (type) {
    params.type = type;
  }
  
  const response = await apiClient.get('/history', {
    params,
    headers,
  });
  
  // 转换后端响应格式
  const data = response.data;
  return {
    items: data.items.map((item: any) => ({
      sessionId: item.session_id,
      type: item.type || 'conflict',
      riskLevel: item.risk_level,
      summary: item.summary,
      createdAt: item.created_at,
    })),
    total: data.total,
    limit: data.limit,
    offset: data.offset,
  };
};

