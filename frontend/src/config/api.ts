/**
 * API 配置
 * 根据运行平台自动选择正确的后端地址
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * 获取本机 IP 地址
 * 在 Expo Go 中，可以从 manifest 获取
 */
const getLocalIP = (): string => {
  const manifest = Constants.expoConfig;
  if (manifest?.hostUri) {
    // Expo Go 开发模式，从 hostUri 获取 IP
    const ip = manifest.hostUri.split(':')[0];
    return ip;
  }
  return 'localhost';
};

/**
 * 根据平台获取 API 基础 URL
 */
export const getApiBaseUrl = (): string => {
  const API_PORT = 8000;
  
  if (!__DEV__) {
    // 生产环境
    return 'https://wavecho.cn/echo/api';
  }
  
  // 开发环境
  if (Platform.OS === 'android') {
    const localIP = getLocalIP();
    if (localIP === 'localhost') {
      return `http://10.0.2.2:${API_PORT}/api`;
    }
    return `http://${localIP}:${API_PORT}/api`;
  } else if (Platform.OS === 'ios') {
    // iOS 模拟器可以使用 localhost
    return `http://localhost:${API_PORT}/api`;
  } else if (Platform.OS === 'web') {
    // Web 使用 localhost
    return `http://localhost:${API_PORT}/api`;
  }
  
  // 默认
  return `http://localhost:${API_PORT}/api`;
};

/**
 * 手动配置 API 地址（如果自动检测失败）
 * 
 * 使用方法：
 * 1. 查看电脑的局域网 IP（运行 ipconfig 或 ifconfig）
 * 2. 取消下面的注释，填入您的 IP 地址
 * 3. 重启 Expo 开发服务器
 */
// export const API_BASE_URL = 'https://wavecho.cn/echo/api';

export const API_BASE_URL = getApiBaseUrl();

// 打印当前使用的 API 地址（调试用）
console.log('API Base URL:', API_BASE_URL);

