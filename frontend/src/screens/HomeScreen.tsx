/**
 * 主页 - 功能入口页面
 * 展示三大核心功能：冲突复盘、情况评理、表达助手
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
  Dimensions,
  Image,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../types';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

interface FeatureItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  description: string;
  gradientColors: [string, string];
  available: boolean;
  route: keyof RootStackParamList;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// 动画圆圈组件
const AnimatedCircle: React.FC<{
  size: number;
  initialX: number;
  initialY: number;
  duration: number;
  delay: number;
  opacity: number;
}> = ({ size, initialX, initialY, duration, delay, opacity }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 1000,
      delay,
      useNativeDriver: true,
    }).start();

    const floatAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: 20,
              duration: duration,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: -15,
              duration: duration,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 1.1,
              duration: duration,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: -10,
              duration: duration * 0.8,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 10,
              duration: duration * 0.8,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 0.9,
              duration: duration * 0.8,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: 0,
              duration: duration * 0.6,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 0,
              duration: duration * 0.6,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 0.8,
              duration: duration * 0.6,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    };

    const timer = setTimeout(floatAnimation, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: initialY,
          left: initialX,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `rgba(255,255,255,${opacity})`,
          transform: [{ translateX }, { translateY }, { scale }],
          opacity: opacityAnim,
        },
      ]}
    />
  );
};

// 功能卡片 - 仅右侧扇形在触屏时放大
const FeatureCard: React.FC<{
  feature: FeatureItem;
  onPress: () => void;
  theme: any;
}> = ({ feature, onPress, theme }) => {
  const decorScaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    // 仅扇形装饰放大
    Animated.spring(decorScaleAnim, {
      toValue: 1.3,
      useNativeDriver: true,
      speed: 40,
      bounciness: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(decorScaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 8,
    }).start();
  };

  const handlePress = () => {
    if (feature.available) {
      onPress();
    }
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={!feature.available}
      style={styles.featureCardWrapper}
    >
      <View
        style={[
          styles.featureCard,
          { backgroundColor: theme.colors.surface },
          !feature.available && styles.featureCardDisabled,
        ]}
      >
        {/* 扇形装饰 - 触屏时放大 */}
        <Animated.View 
          style={[
            styles.featureCardDecor,
            { 
              transform: [{ scale: decorScaleAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={[`${feature.gradientColors[0]}20`, `${feature.gradientColors[1]}10`]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.featureCardDecorGradient}
          />
        </Animated.View>

        <View style={styles.featureContent}>
          {/* Icon */}
          <LinearGradient
            colors={feature.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.featureIconBox}
          >
            <Ionicons name={feature.icon} size={22} color="#FFF" />
          </LinearGradient>

          {/* Text content */}
          <View style={styles.featureTextContainer}>
            <View style={styles.featureTitleRow}>
              <Text style={[styles.featureTitle, { color: theme.colors.textPrimary }]}>
                {feature.title}
              </Text>
              {!feature.available && (
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>敬请期待</Text>
                </View>
              )}
            </View>
            <Text style={[styles.featureSubtitle, { color: theme.colors.textTertiary }]}>
              {feature.subtitle}
            </Text>
            <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
              {feature.description}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();

  const features: FeatureItem[] = [
    {
      id: 'conflict-review',
      icon: 'chatbubbles-outline',
      title: '冲突复盘',
      subtitle: 'Conflict Review',
      description: '分析聊天记录，理解冲突根源',
      gradientColors: ['#06B6D4', '#3B82F6'],
      available: true,
      route: 'AnalyzeInput',
    },
    {
      id: 'situation-judge',
      icon: 'scale-outline',
      title: '情况评理',
      subtitle: 'Situation Judge',
      description: '客观分析事件，辨别责任归属',
      gradientColors: ['#3B82F6', '#6366F1'],
      available: true,
      route: 'SituationJudgeInput',
    },
    {
      id: 'expression-helper',
      icon: 'create-outline',
      title: '表达助手',
      subtitle: 'Better Expression',
      description: '优化表达方式，清晰温和沟通',
      gradientColors: ['#14B8A6', '#06B6D4'],
      available: true,
      route: 'ExpressionHelperInput',
    },
    {
      id: 'pattern-insight',
      icon: 'trending-up-outline',
      title: '模式洞察',
      subtitle: 'Pattern Insight',
      description: '识别沟通模式，改善关系质量',
      gradientColors: ['#A855F7', '#EC4899'],
      available: false,
      route: 'Home',
    },
  ];

  const handleFeaturePress = (feature: FeatureItem) => {
    if (feature.available) {
      navigation.navigate(feature.route as any);
    }
  };

  return (
    <ScreenContainer backgroundColor={theme.colors.background}>
      <View style={styles.container}>
        {/* Header with gradient */}
        <LinearGradient
          colors={['#06B6D4', '#3B82F6', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          {/* 动画装饰圆圈 */}
          <AnimatedCircle size={120} initialX={220} initialY={10} duration={4000} delay={0} opacity={0.1} />
          <AnimatedCircle size={150} initialX={-50} initialY={-30} duration={5000} delay={500} opacity={0.1} />
          <AnimatedCircle size={70} initialX={300} initialY={80} duration={3500} delay={1000} opacity={0.08} />
          <AnimatedCircle size={90} initialX={40} initialY={90} duration={4500} delay={300} opacity={0.06} />
          <AnimatedCircle size={50} initialX={160} initialY={-10} duration={3000} delay={800} opacity={0.12} />

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/icon-2.png')}
              style={styles.logoImage}
            />
          </View>

          {/* Title Section */}
          <Text style={styles.appTitle}>Wavecho</Text>
          <Text style={styles.appSubtitle}>你的关系智能助手</Text>

          {/* Quick stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="sparkles-outline" size={13} color="rgba(255,255,255,0.8)" />
              <Text style={styles.statText}>AI 驱动</Text>
            </View>
            <View style={styles.statDot} />
            <View style={styles.statItem}>
              <Ionicons name="lock-closed-outline" size={13} color="rgba(255,255,255,0.8)" />
              <Text style={styles.statText}>隐私保护</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Main Features */}
        <View style={styles.featuresSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
              核心功能
            </Text>
            <View style={styles.dotsRow}>
              <View style={[styles.dot, { backgroundColor: '#06B6D4' }]} />
              <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
              <View style={[styles.dot, { backgroundColor: '#6366F1' }]} />
            </View>
          </View>

          <View style={styles.featuresGrid}>
            {features.map((feature) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                onPress={() => handleFeaturePress(feature)}
                theme={theme}
              />
            ))}
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header
  headerGradient: {
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 12,
    zIndex: 10,
  },
  logoImage: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 2,
    zIndex: 10,
  },
  appSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 12,
    zIndex: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    zIndex: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  // Features Section
  featuresSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 90, // 为底部导航留空间
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  featuresGrid: {
    gap: 10,
  },
  featureCardWrapper: {
    marginBottom: 0,
  },
  featureCard: {
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  featureCardDisabled: {
    opacity: 0.6,
  },
  featureCardDecor: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 112,
    height: 112,
    borderBottomLeftRadius: 120,
    overflow: 'hidden',
  },
  featureCardDecorGradient: {
    flex: 1,
  },
  featureContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  comingSoonBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  comingSoonText: {
    fontSize: 9,
    color: '#A855F7',
    fontWeight: '500',
  },
  featureSubtitle: {
    fontSize: 12,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});
