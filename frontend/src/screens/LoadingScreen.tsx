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
import { analyzeConflict } from '../api/analyze';
import { addAnalysisToHistory } from '../utils/storage';
import { showError } from '../utils/toast';

type LoadingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Loading'>;
type LoadingScreenRouteProp = RouteProp<RootStackParamList, 'Loading'>;

interface Props {
  navigation: LoadingScreenNavigationProp;
  route: LoadingScreenRouteProp;
}

const loadingMessages = [
  '正在分析对话内容...',
  '正在识别情绪和需求...',
  '正在生成温和建议...',
  '马上就好...',
];

export const LoadingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { conversationText, contextDescription, userId } = route.params;
  const [messageIndex, setMessageIndex] = useState(0);
  
  // Animation values
  const outerPulse = useState(new Animated.Value(1))[0];
  const middlePulse = useState(new Animated.Value(1))[0];
  const innerPulse = useState(new Animated.Value(1))[0];
  const dotOpacity1 = useState(new Animated.Value(0.3))[0];
  const dotOpacity2 = useState(new Animated.Value(0.3))[0];
  const dotOpacity3 = useState(new Animated.Value(0.3))[0];

  // Start analysis when component mounts
  useEffect(() => {
    const performAnalysis = async () => {
      try {
        const data = await analyzeConflict({
          conversation_text: conversationText,
          context_description: contextDescription,
          user_id: userId,
        });

        if (data.analysis_result) {
          // Save to history
          await addAnalysisToHistory({
            sessionId: data.session_id,
            riskLevel: data.risk_level,
            result: data.analysis_result,
            createdAt: data.created_at,
          });

          // Navigate to Result screen
          navigation.replace('Result', {
            sessionId: data.session_id,
            riskLevel: data.risk_level,
            result: data.analysis_result,
          });
        }
      } catch (error: any) {
        showError({
          title: '分析失败',
          message: error.message || '请稍后重试',
        });
        // 延迟返回，让用户看到 Toast
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      }
    };

    performAnalysis();
  }, []);

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
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ScreenContainer backgroundColor={theme.colors.background}>
      <View style={styles.content}>
        {/* Wave Animation Visual */}
        <View style={styles.waveContainer}>
          {/* Outer wave */}
          <Animated.View
            style={[
              styles.waveRing,
              styles.outerRing,
              {
                backgroundColor: theme.colors.primaryAlpha10,
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
                backgroundColor: theme.colors.primaryAlpha20,
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
                backgroundColor: theme.colors.primaryAlpha30,
                transform: [{ scale: innerPulse }],
              },
            ]}
          />
          
          {/* Core */}
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.gradientEnd]}
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
            AI 正在理解对话中的情绪与需求
          </Text>
        </View>

        {/* Progress Dots */}
        <View style={styles.dotsContainer}>
          <Animated.View
            style={[
              styles.dot,
              {
                backgroundColor: theme.colors.primary,
                opacity: dotOpacity1,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                backgroundColor: theme.colors.primary,
                opacity: dotOpacity2,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                backgroundColor: theme.colors.primary,
                opacity: dotOpacity3,
              },
            ]}
          />
        </View>

        {/* Time hint */}
        <Text style={[styles.timeHint, { color: theme.colors.textTertiary }]}>
          分析通常需要10-30秒，请稍候...
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
    shadowColor: '#06B6D4',
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
