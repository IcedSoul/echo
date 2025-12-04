/**
 * 矛盾分析 Hook
 * 使用 React Query 管理分析请求
 */

import { useMutation } from '@tanstack/react-query';
import { analyzeConflict } from '../api/analyze';
import { AnalyzeConflictRequest, AnalyzeConflictResponse } from '../types';

export const useAnalyzeConflict = () => {
  return useMutation<AnalyzeConflictResponse, Error, AnalyzeConflictRequest>({
    mutationFn: analyzeConflict,
    onSuccess: (data) => {
      console.log('Analysis completed:', data.session_id);
    },
    onError: (error) => {
      console.error('Analysis failed:', error.message);
    },
  });
};

