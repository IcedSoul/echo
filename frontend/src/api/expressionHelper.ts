/**
 * 表达助手 API
 */

import apiClient from './client';
import { ExpressionHelperRequest, ExpressionHelperResponse } from '../types';

/**
 * 生成表达方式
 */
export const generateExpressions = async (
  data: ExpressionHelperRequest
): Promise<ExpressionHelperResponse> => {
  const response = await apiClient.post<ExpressionHelperResponse>(
    '/expression-helper',
    data
  );
  return response.data;
};

