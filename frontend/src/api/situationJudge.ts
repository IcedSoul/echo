/**
 * 情况评理 API
 */

import apiClient from './client';
import { SituationJudgeRequest, SituationJudgeResponse } from '../types';

/**
 * 分析情况/评理
 */
export const analyzeSituation = async (
  data: SituationJudgeRequest
): Promise<SituationJudgeResponse> => {
  const response = await apiClient.post<SituationJudgeResponse>(
    '/situation-judge',
    data
  );
  return response.data;
};

