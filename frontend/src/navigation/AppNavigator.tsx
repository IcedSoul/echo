/**
 * 应用导航配置
 * 使用 Stack Navigator，根据登录状态显示不同的页面流
 */

import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector } from '../store/hooks';
import { RootStackParamList } from '../types';
import { BottomTabBar } from '../components/BottomTabBar';

// 导入页面
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { AnalyzeInputScreen } from '../screens/AnalyzeInputScreen';
import { LoadingScreen } from '../screens/LoadingScreen';
import { ResultScreen } from '../screens/ResultScreen';
import { SituationJudgeInputScreen } from '../screens/SituationJudgeInputScreen';
import { SituationJudgeLoadingScreen } from '../screens/SituationJudgeLoadingScreen';
import { SituationJudgeResultScreen } from '../screens/SituationJudgeResultScreen';
import { ExpressionHelperInputScreen } from '../screens/ExpressionHelperInputScreen';
import { ExpressionHelperLoadingScreen } from '../screens/ExpressionHelperLoadingScreen';
import { ExpressionHelperResultScreen } from '../screens/ExpressionHelperResultScreen';
import { AIChatScreen } from '../screens/AIChatScreen';
import { ChatHistoryScreen } from '../screens/ChatHistoryScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { NotificationSettingsScreen } from '../screens/NotificationSettingsScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';
import { HelpFeedbackScreen } from '../screens/HelpFeedbackScreen';

const Stack = createStackNavigator<RootStackParamList>();

// 未登录用户的导航栈（仅包含欢迎和登录页面）
const AuthStack: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerStatusBarHeight: insets.top,
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
    </Stack.Navigator>
  );
};

// 带底部导航的屏幕包装器
const ScreenWithBottomTab: React.FC<{
  children: React.ReactNode;
  routeName: string;
  showTab?: boolean;
}> = ({ children, routeName, showTab = true }) => {
  return (
    <View style={{ flex: 1 }}>
      {children}
      {showTab && <BottomTabBar currentRoute={routeName} />}
    </View>
  );
};

// 已登录用户的导航栈
const MainStack: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerStatusBarHeight: insets.top,
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
      {/* 主页 */}
      <Stack.Screen
        name="Home"
        options={{
          headerShown: false,
        }}
      >
        {(props) => (
          <ScreenWithBottomTab routeName="Home">
            <HomeScreen {...props} />
          </ScreenWithBottomTab>
        )}
      </Stack.Screen>

      {/* 冲突复盘输入页 */}
      <Stack.Screen
        name="AnalyzeInput"
        component={AnalyzeInputScreen}
        options={({ navigation }) => ({
          title: '冲突复盘',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('History', { type: 'conflict' })}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="time-outline" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          ),
        })}
      />

      {/* 冲突复盘分析中页面 */}
      <Stack.Screen
        name="Loading"
        component={LoadingScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />

      {/* 冲突复盘结果页 */}
      <Stack.Screen
        name="Result"
        component={ResultScreen}
        options={{
          title: '分析结果',
        }}
      />

      {/* 情况评理输入页 */}
      <Stack.Screen
        name="SituationJudgeInput"
        component={SituationJudgeInputScreen}
        options={({ navigation }) => ({
          title: '情况评理',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('History', { type: 'situation' })}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="time-outline" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          ),
        })}
      />

      {/* 情况评理分析中页面 */}
      <Stack.Screen
        name="SituationJudgeLoading"
        component={SituationJudgeLoadingScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />

      {/* 情况评理结果页 */}
      <Stack.Screen
        name="SituationJudgeResult"
        component={SituationJudgeResultScreen}
        options={{
          title: '评理结果',
        }}
      />

      {/* 表达助手输入页 */}
      <Stack.Screen
        name="ExpressionHelperInput"
        component={ExpressionHelperInputScreen}
        options={({ navigation }) => ({
          title: '表达助手',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('History', { type: 'expression' })}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="time-outline" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          ),
        })}
      />

      {/* 表达助手生成中页面 */}
      <Stack.Screen
        name="ExpressionHelperLoading"
        component={ExpressionHelperLoadingScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />

      {/* 表达助手结果页 */}
      <Stack.Screen
        name="ExpressionHelperResult"
        component={ExpressionHelperResultScreen}
        options={{
          title: '表达方式',
        }}
      />

      {/* AI 聊天页 */}
      <Stack.Screen
        name="AIChat"
        component={AIChatScreen}
        options={{
          headerShown: false,
        }}
      />

      {/* 聊天历史页 */}
      <Stack.Screen
        name="ChatHistory"
        component={ChatHistoryScreen}
        options={{
          title: '聊天记录',
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

      {/* 个人资料页 - 不需要底部导航栏 */}
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: '个人中心',
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
