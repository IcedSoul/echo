/**
 * 表达助手加载页面
 * 显示生成表达的进度动画 - 统一使用波浪动画样式
 */

import React, { useEffect, useState } from 'react';
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

const loadingMessages = [
  '正在理解你的表达意图...',
  '正在分析情感基调...',
  '正在生成温和表达...',
  '正在生成坚定表达...',
  '正在优化措辞...',
];

export const ExpressionHelperLoadingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { message, intent, userId } = route.params;
  const [messageIndex, setMessageIndex] = useState(0);

  // Animation values
  const outerPulse = useState(new Animated.Value(1))[0];
  const middlePulse = useState(new Animated.Value(1))[0];
  const innerPulse = useState(new Animated.Value(1))[0];
  const dotOpacity1 = useState(new Animated.Value(0.3))[0];
  const dotOpacity2 = useState(new Animated.Value(0.3))[0];
  const dotOpacity3 = useState(new Animated.Value(0.3))[0];

  // Start generation when component mounts
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
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      }
    };

    doGenerate();
  }, [message, intent, userId]);

  useEffect(() => {
    // Wave pulse animations
    const createPulseAnimation = (animValue: Animated.Value, duration: number, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1.15,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 1,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const outerAnim = createPulseAnimation(outerPulse, 1000, 0);
    const middleAnim = createPulseAnimation(middlePulse, 800, 200);
    const innerAnim = createPulseAnimation(innerPulse, 600, 400);

    outerAnim.start();
    middleAnim.start();
    innerAnim.start();

    // Dot bounce animations
    const createDotAnimation = (dotAnim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dotAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dotAnim, {
            toValue: 0.3,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const dot1Anim = createDotAnimation(dotOpacity1, 0);
    const dot2Anim = createDotAnimation(dotOpacity2, 200);
    const dot3Anim = createDotAnimation(dotOpacity3, 400);

    dot1Anim.start();
    dot2Anim.start();
    dot3Anim.start();

    return () => {
      outerAnim.stop();
      middleAnim.stop();
      innerAnim.stop();
      dot1Anim.stop();
      dot2Anim.stop();
      dot3Anim.stop();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ScreenContainer backgroundColor={theme.colors.background} safeAreaTop>
      <View style={styles.content}>
        {/* Wave Animation Visual */}
        <View style={styles.waveContainer}>
          {/* Outer wave */}
          <Animated.View
            style={[
              styles.waveRing,
              styles.outerRing,
              {
                backgroundColor: 'rgba(20, 184, 166, 0.1)',
                transform: [{ scale: outerPulse }],
              },
            ]}
          />
          
          {/* Middle wave */}
          <Animated.View
            style={[
              styles.waveRing,
              styles.middleRing,
              {
                backgroundColor: 'rgba(20, 184, 166, 0.15)',
                transform: [{ scale: middlePulse }],
              },
            ]}
          />
          
          {/* Inner wave */}
          <Animated.View
            style={[
              styles.waveRing,
              styles.innerRing,
              {
                backgroundColor: 'rgba(20, 184, 166, 0.25)',
                transform: [{ scale: innerPulse }],
              },
            ]}
          />
          
          {/* Core */}
          <LinearGradient
            colors={['#14B8A6', '#06B6D4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.core}
          />
        </View>

        {/* Text */}
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            {loadingMessages[messageIndex]}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            AI 正在为你生成多种表达风格
          </Text>
        </View>

        {/* Progress Dots */}
        <View style={styles.dotsContainer}>
          <Animated.View
            style={[
              styles.dot,
              {
                backgroundColor: '#14B8A6',
                opacity: dotOpacity1,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                backgroundColor: '#14B8A6',
                opacity: dotOpacity2,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                backgroundColor: '#14B8A6',
                opacity: dotOpacity3,
              },
            ]}
          />
        </View>

        {/* Time hint */}
        <Text style={[styles.timeHint, { color: theme.colors.textTertiary }]}>
          生成通常需要5-15秒，请稍候...
        </Text>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  waveContainer: {
    width: 192,
    height: 192,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  waveRing: {
    position: 'absolute',
    borderRadius: 999,
  },
  outerRing: {
    width: 192,
    height: 192,
  },
  middleRing: {
    width: 144,
    height: 144,
  },
  innerRing: {
    width: 96,
    height: 96,
  },
  core: {
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  textContainer: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timeHint: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 32,
  },
});
