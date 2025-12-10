/**
 * 表达助手加载页面
 * 显示生成表达的进度动画
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
import { generateExpressions } from '../api/expressionHelper';
import { showError } from '../utils/toast';

type NavigationProp = StackNavigationProp<RootStackParamList, 'ExpressionHelperLoading'>;
type RouteProps = RouteProp<RootStackParamList, 'ExpressionHelperLoading'>;

interface Props {
  navigation: NavigationProp;
  route: RouteProps;
}

const loadingSteps = [
  { icon: 'reader-outline', text: '理解你的表达意图...' },
  { icon: 'heart-outline', text: '分析情感基调...' },
  { icon: 'color-palette-outline', text: '生成温和表达...' },
  { icon: 'shield-outline', text: '生成坚定表达...' },
  { icon: 'bulb-outline', text: '优化措辞...' },
];

export const ExpressionHelperLoadingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { message, intent, userId } = route.params;

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
    }, 1800);

    return () => {
      pulseAnimation.stop();
      rotateAnimation.stop();
      clearInterval(stepInterval);
    };
  }, []);

  useEffect(() => {
    const doGenerate = async () => {
      try {
        const result = await generateExpressions({
          original_message: message,
          intent,
          user_id: userId,
        });

        navigation.replace('ExpressionHelperResult', {
          sessionId: result.session_id,
          result: result.expressions!,
          originalInput: {
            message,
            intent,
            userId,
          },
        });
      } catch (error: any) {
        console.error('表达生成失败:', error);
        showError({
          title: '生成失败',
          message: error.message || '生成过程中遇到错误，请重试',
        });
        navigation.goBack();
      }
    };

    doGenerate();
  }, [message, intent, userId]);

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
              colors={['#14B8A6', '#06B6D4', '#14B8A6']}
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
              colors={['#14B8A6', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Ionicons name="create-outline" size={40} color="#FFF" />
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Status Text */}
        <View style={styles.statusContainer}>
          <Text style={[styles.statusTitle, { color: theme.colors.textPrimary }]}>
            正在优化表达
          </Text>
          
          <View style={styles.stepIndicator}>
            <Ionicons
              name={currentStepData.icon as keyof typeof Ionicons.glyphMap}
              size={20}
              color="#14B8A6"
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
                      ? '#14B8A6'
                      : theme.colors.border,
                },
              ]}
            />
          ))}
        </View>

        {/* Hint */}
        <Text style={[styles.hintText, { color: theme.colors.textTertiary }]}>
          正在为你生成多种表达风格，请稍候...
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
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
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

