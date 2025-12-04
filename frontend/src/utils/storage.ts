/**
 * 本地存储工具类
 * 使用 AsyncStorage 进行持久化
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 生成简单的 UUID（不依赖外部库）
 */
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// 存储键
const STORAGE_KEYS = {
  USER: '@wavecho:user',
  TOKEN: '@wavecho:token',
  ANONYMOUS_USER_ID: '@wavecho:anonymous_user_id',  // 匿名用户 ID
  // 历史记录按用户 ID 区分
  getHistoryKey: (userId: string) => `@wavecho:history:${userId}`,
};

// ============ 用户相关 ============

export const saveUser = async (user: any) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (error) {
    console.error('保存用户信息失败:', error);
  }
};

export const getUser = async () => {
  try {
    const userStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return null;
  }
};

export const saveToken = async (token: string) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
  } catch (error) {
    console.error('保存 Token 失败:', error);
  }
};

export const getToken = async () => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
  } catch (error) {
    console.error('获取 Token 失败:', error);
    return null;
  }
};

export const clearAuth = async () => {
  try {
    await AsyncStorage.multiRemove([STORAGE_KEYS.USER, STORAGE_KEYS.TOKEN]);
  } catch (error) {
    console.error('清除认证信息失败:', error);
  }
};

// ============ 匿名用户 ID 管理 ============

/**
 * 获取或创建匿名用户 ID
 * 匿名用户的 ID 会持久化存储，确保同一设备上的匿名用户有一致的 ID
 */
export const getOrCreateAnonymousUserId = async (): Promise<string> => {
  try {
    let anonymousId = await AsyncStorage.getItem(STORAGE_KEYS.ANONYMOUS_USER_ID);
    
    if (!anonymousId) {
      // 生成新的匿名用户 ID（带前缀以便区分）
      anonymousId = `anon_${generateUUID()}`;
      await AsyncStorage.setItem(STORAGE_KEYS.ANONYMOUS_USER_ID, anonymousId);
      console.log('Created new anonymous user ID:', anonymousId);
    }
    
    return anonymousId;
  } catch (error) {
    console.error('获取匿名用户 ID 失败:', error);
    // 降级：返回一个临时 ID（不会被持久化）
    return `anon_temp_${Date.now()}`;
  }
};

/**
 * 获取当前有效的用户 ID
 * 优先返回登录用户的 ID，否则返回匿名用户 ID
 */
export const getCurrentUserId = async (): Promise<string> => {
  try {
    const user = await getUser();
    if (user?.userId) {
      return user.userId;
    }
    return await getOrCreateAnonymousUserId();
  } catch (error) {
    console.error('获取当前用户 ID 失败:', error);
    return await getOrCreateAnonymousUserId();
  }
};

// ============ 历史记录相关（按用户区分）============

/**
 * 保存用户的历史记录（本地缓存）
 */
export const saveAnalysisHistory = async (userId: string, history: any[]) => {
  try {
    const key = STORAGE_KEYS.getHistoryKey(userId);
    await AsyncStorage.setItem(key, JSON.stringify(history));
  } catch (error) {
    console.error('保存历史记录失败:', error);
  }
};

/**
 * 获取用户的历史记录（本地缓存）
 */
export const getAnalysisHistory = async (userId?: string): Promise<any[]> => {
  try {
    const currentUserId = userId || await getCurrentUserId();
    const key = STORAGE_KEYS.getHistoryKey(currentUserId);
    const historyStr = await AsyncStorage.getItem(key);
    return historyStr ? JSON.parse(historyStr) : [];
  } catch (error) {
    console.error('获取历史记录失败:', error);
    return [];
  }
};

/**
 * 添加分析记录到历史（本地缓存）
 */
export const addAnalysisToHistory = async (userId: string, analysis: any) => {
  try {
    const history = await getAnalysisHistory(userId);
    history.unshift(analysis); // 添加到开头
    
    // 只保留最近 50 条
    if (history.length > 50) {
      history.length = 50;
    }
    
    await saveAnalysisHistory(userId, history);
  } catch (error) {
    console.error('添加历史记录失败:', error);
  }
};

/**
 * 清除用户的历史记录
 */
export const clearAnalysisHistory = async (userId?: string) => {
  try {
    const currentUserId = userId || await getCurrentUserId();
    const key = STORAGE_KEYS.getHistoryKey(currentUserId);
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('清除历史记录失败:', error);
  }
};

/**
 * 清除所有数据（用于调试或重置应用）
 */
export const clearAllData = async () => {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('清除所有数据失败:', error);
  }
};

/**
 * 迁移旧的历史记录到新的按用户区分的存储格式
 * 调用时机：应用启动时检查一次
 */
export const migrateOldHistory = async (userId: string) => {
  try {
    const oldKey = '@wavecho:history';
    const oldHistoryStr = await AsyncStorage.getItem(oldKey);
    
    if (oldHistoryStr) {
      const oldHistory = JSON.parse(oldHistoryStr);
      if (oldHistory.length > 0) {
        // 将旧历史记录迁移到当前用户
        await saveAnalysisHistory(userId, oldHistory);
        // 删除旧的存储
        await AsyncStorage.removeItem(oldKey);
        console.log('Migrated old history to user:', userId);
      }
    }
  } catch (error) {
    console.error('迁移旧历史记录失败:', error);
  }
};
