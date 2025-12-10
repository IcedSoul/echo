/**
 * 情况评理加载页面
 * 显示分析进度动画
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../types';
import { analyzeSituation } from '../api/situationJudge';
import { showError } from '../utils/toast';

type NavigationProp = StackNavigationProp<RootStackParamList, 'SituationJudgeLoading'>;
type RouteProps = RouteProp<RootStackParamList, 'SituationJudgeLoading'>;

interface Props {
  navigation: NavigationProp;
  route: RouteProps;
}

const loadingSteps = [
  { icon: 'document-text-outline', text: '梳理事件经过...' },
  { icon: 'people-outline', text: '分析双方立场...' },
  { icon: 'git-compare-outline', text: '对比责任归属...' },
  { icon: 'alert-circle-outline', text: '识别逻辑漏洞...' },
  { icon: 'bulb-outline', text: '生成建议...' },
];

export const SituationJudgeLoadingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { situation, background, userId } = route.params;

  const [currentStep, setCurrentStep] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 脉冲动画
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // 旋转动画
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    pulseAnimation.start();
    rotateAnimation.start();

    // 步骤切换
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % loadingSteps.length);
    }, 2000);

    return () => {
      pulseAnimation.stop();
      rotateAnimation.stop();
      clearInterval(stepInterval);
    };
  }, []);

  useEffect(() => {
    const doAnalysis = async () => {
      try {
        const result = await analyzeSituation({
          situation_text: situation,
          background_description: background,
          user_id: userId,
        });

        navigation.replace('SituationJudgeResult', {
          sessionId: result.session_id,
          result: result.analysis_result!,
          originalInput: {
            situation,
            background,
            userId,
          },
        });
      } catch (error: any) {
        console.error('评理分析失败:', error);
        showError({
          title: '分析失败',
          message: error.message || '分析过程中遇到错误，请重试',
        });
        navigation.goBack();
      }
    };

    doAnalysis();
  }, [situation, background, userId]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const currentStepData = loadingSteps[currentStep];

  return (
    <ScreenContainer backgroundColor={theme.colors.background}>
      <View style={styles.container}>
        {/* Animation Area */}
        <View style={styles.animationContainer}>
          {/* Rotating ring */}
          <Animated.View
            style={[
              styles.rotatingRing,
              { transform: [{ rotate }] },
            ]}
          >
            <LinearGradient
              colors={['#3B82F6', '#06B6D4', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ringGradient}
            />
          </Animated.View>

          {/* Center icon */}
          <Animated.View
            style={[
              styles.centerIcon,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            <LinearGradient
              colors={['#3B82F6', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Ionicons name="scale-outline" size={40} color="#FFF" />
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Status Text */}
        <View style={styles.statusContainer}>
          <Text style={[styles.statusTitle, { color: theme.colors.textPrimary }]}>
            正在评理分析
          </Text>
          
          <View style={styles.stepIndicator}>
            <Ionicons
              name={currentStepData.icon as keyof typeof Ionicons.glyphMap}
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.stepText, { color: theme.colors.textSecondary }]}>
              {currentStepData.text}
            </Text>
          </View>
        </View>

        {/* Progress dots */}
        <View style={styles.progressDots}>
          {loadingSteps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === currentStep
                      ? theme.colors.primary
                      : theme.colors.border,
                },
              ]}
            />
          ))}
        </View>

        {/* Hint */}
        <Text style={[styles.hintText, { color: theme.colors.textTertiary }]}>
          正在从多个角度分析事件，请稍候...
        </Text>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  animationContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  rotatingRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    padding: 3,
  },
  ringGradient: {
    flex: 1,
    borderRadius: 80,
    opacity: 0.3,
  },
  centerIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
  },
  iconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 20,
  },
  stepText: {
    fontSize: 14,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  hintText: {
    fontSize: 13,
    textAlign: 'center',
  },
});

