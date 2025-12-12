/**
 * AuthGuard - 统一登录保护组件
 * 用于包裹需要登录保护的组件，未登录时自动跳转到欢迎页面
 * 
 * 工作原理：
 * 1. AppNavigator 根据 isAuthenticated 切换 MainStack 和 AuthStack
 * 2. AuthGuard 在每个受保护的屏幕中提供额外的保护层
 * 3. 当 isAuthenticated 变为 false 时，导航容器自动切换到 AuthStack（欢迎页面）
 * 4. AuthGuard 在此过程中显示加载状态，确保用户体验流畅
 */

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAppSelector } from '../store/hooks';
import { useTheme } from '../contexts/ThemeContext';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * 登录保护组件
 * - 检查用户是否已登录
 * - 检查状态是否已从持久化存储恢复
 * - 未登录时显示加载状态（导航容器会自动切换到欢迎页面）
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ children, fallback }) => {
  const { theme } = useTheme();
  const { isAuthenticated, isHydrated } = useAppSelector((state) => state.auth);

  // 如果还未完成 hydration，显示加载状态
  if (!isHydrated) {
    return fallback || (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // 如果未登录，显示加载状态（等待导航容器自动切换到 AuthStack）
  if (!isAuthenticated) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // 已登录，渲染子组件
  return <>{children}</>;
};

/**
 * useAuthGuard - 登录保护 Hook
 * 用于在组件内部检查登录状态
 */
export const useAuthGuard = () => {
  const { isAuthenticated, isHydrated, token, user } = useAppSelector((state) => state.auth);

  return {
    isAuthenticated,
    isHydrated,
    isReady: isHydrated && isAuthenticated,
    token,
    user,
  };
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

