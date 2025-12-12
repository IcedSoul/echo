/**
 * 认证相关 API
 */

import apiClient from './client';
import { LoginResponse, User, SendCodeResponse, UpdateUserRequest } from '../types';

/**
 * 判断输入是手机号还是邮箱
 */
export const getAccountType = (account: string): 'phone' | 'email' => {
  // 中国手机号正则
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(account) ? 'phone' : 'email';
};

/**
 * 验证账号格式是否有效
 */
export const isValidAccount = (account: string): boolean => {
  const phoneRegex = /^1[3-9]\d{9}$/;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return phoneRegex.test(account) || emailRegex.test(account);
};

/**
 * 发送验证码（支持手机号或邮箱）
 */
export const sendVerificationCode = async (account: string): Promise<SendCodeResponse> => {
  const response = await apiClient.post<SendCodeResponse>('/auth/send-code', { account });
  return response.data;
};

/**
 * 验证验证码并登录
 */
export const verifyCodeAndLogin = async (
  account: string,
  code: string
): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/verify-code', {
    account,
    code,
  });
  return response.data;
};

/**
 * 获取当前用户信息
 */
export const getCurrentUser = async (token: string): Promise<User> => {
  const response = await apiClient.get('/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  // 后端返回 snake_case，转换为前端 camelCase
  const data = response.data;
  return {
    userId: data.user_id,
    email: data.email,
    phone: data.phone,
    nickname: data.nickname,
    avatar: data.avatar,
    isAnonymous: data.is_anonymous,
    createdAt: data.created_at,
  };
};

export interface UpdateUserResponse {
  accessToken: string;
  userId: string;
  nickname?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

/**
 * 更新用户信息（返回新的 token）
 */
export const updateCurrentUser = async (
  token: string,
  data: UpdateUserRequest
): Promise<UpdateUserResponse> => {
  const response = await apiClient.put('/auth/me', data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  // 后端返回 snake_case，转换为前端 camelCase
  const result = response.data;
  return {
    accessToken: result.access_token,
    userId: result.user_id,
    nickname: result.nickname,
    email: result.email,
    phone: result.phone,
    avatar: result.avatar,
  };
};

/**
 * 用户使用统计数据
 */
export interface UserUsageStats {
  // 冲突复盘
  conflict_analysis_used: number;
  conflict_analysis_limit: number;
  conflict_analysis_remaining: number;
  // 情况评理
  situation_judge_used: number;
  situation_judge_limit: number;
  situation_judge_remaining: number;
  // 表达助手
  expression_helper_used: number;
  expression_helper_limit: number;
  expression_helper_remaining: number;
  // AI对话
  ai_chat_used: number;
  ai_chat_limit: number;
  ai_chat_remaining: number;
  // 用户等级
  user_level: string;
}

/**
 * 获取用户统计数据
 */
export const getUserStats = async (token: string): Promise<UserUsageStats> => {
  const response = await apiClient.get('/auth/stats', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};
