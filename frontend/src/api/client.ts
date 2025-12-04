/**
 * API 客户端配置
 * 使用 axios 封装后端 API 调用
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_BASE_URL } from '../config/api';

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：添加认证 token
apiClient.interceptors.request.use(
  (config) => {
    // TODO: 从 AsyncStorage 获取 token
    // const token = await AsyncStorage.getItem('auth_token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器：统一错误处理
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      // 服务器返回错误
      const { status, data } = error.response;
      
      if (status === 401) {
        // 未授权：清除 token，跳转登录
        // TODO: 实现登出逻辑
        console.log('Unauthorized, please login again');
      } else if (status === 500) {
        console.error('Server error:', data);
      }
    } else if (error.request) {
      // 请求发出但没有收到响应
      console.error('Network error:', error.message);
    } else {
      // 其他错误
      console.error('Request error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;

