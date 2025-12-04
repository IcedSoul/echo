/**
 * 应用导航配置
 * 使用 Stack Navigator，根据登录状态显示不同的页面流
 */

import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector } from '../store/hooks';
import { RootStackParamList } from '../types';

// 导入页面
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { AnalyzeInputScreen } from '../screens/AnalyzeInputScreen';
import { LoadingScreen } from '../screens/LoadingScreen';
import { ResultScreen } from '../screens/ResultScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { NotificationSettingsScreen } from '../screens/NotificationSettingsScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';
import { HelpFeedbackScreen } from '../screens/HelpFeedbackScreen';

const Stack = createStackNavigator<RootStackParamList>();

// 未登录用户的导航栈
const AuthStack: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: {
          ...theme.typography.bodyMedium,
          fontWeight: '600',
          color: theme.colors.textPrimary,
        },
        headerBackTitle: '返回',
        cardStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      {/* 欢迎页 */}
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{
          headerShown: false,
        }}
      />

      {/* 登录页 */}
      <Stack.Screen
        name="Auth"
        component={AuthScreen}
        options={{
          title: '登录',
          headerShown: false,
        }}
      />

      {/* 匿名试用 - 也允许未登录用户访问 */}
      <Stack.Screen
        name="AnalyzeInput"
        component={AnalyzeInputScreen}
        options={({ navigation }) => ({
          title: '',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Welcome')}
              style={{ marginLeft: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Ionicons name="person-circle-outline" size={28} color={theme.colors.textTertiary} />
              <Text style={{ color: theme.colors.textSecondary, fontSize: 15 }}>
                未登录
              </Text>
            </TouchableOpacity>
          ),
          headerRight: () => null,
        })}
      />

      {/* 分析中页面 */}
      <Stack.Screen
        name="Loading"
        component={LoadingScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />

      {/* 结果页 */}
      <Stack.Screen
        name="Result"
        component={ResultScreen}
        options={{
          title: '分析结果',
        }}
      />
    </Stack.Navigator>
  );
};

// 已登录用户的导航栈
const MainStack: React.FC = () => {
  const { theme } = useTheme();
  const user = useAppSelector((state) => state.auth.user);

  return (
    <Stack.Navigator
      initialRouteName="AnalyzeInput"
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: {
          ...theme.typography.bodyMedium,
          fontWeight: '600',
          color: theme.colors.textPrimary,
        },
        headerBackTitle: '返回',
        cardStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      {/* 冲突复盘输入页 - 主页 */}
      <Stack.Screen
        name="AnalyzeInput"
        component={AnalyzeInputScreen}
        options={({ navigation }) => ({
          title: '',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={{ marginLeft: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: '500' }}>
                {user?.nickname || '用户'}
              </Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('History')}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="time-outline" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          ),
        })}
      />

      {/* 分析中页面 */}
      <Stack.Screen
        name="Loading"
        component={LoadingScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />

      {/* 结果页 */}
      <Stack.Screen
        name="Result"
        component={ResultScreen}
        options={{
          title: '分析结果',
        }}
      />

      {/* 历史记录页 */}
      <Stack.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: '历史记录',
        }}
      />

      {/* 个人资料页 */}
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: '个人资料',
        }}
      />

      {/* 通知设置页 */}
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{
          title: '通知设置',
        }}
      />

      {/* 隐私与安全页 */}
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{
          title: '隐私与安全',
        }}
      />

      {/* 帮助与反馈页 */}
      <Stack.Screen
        name="HelpFeedback"
        component={HelpFeedbackScreen}
        options={{
          title: '帮助与反馈',
        }}
      />
    </Stack.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;
