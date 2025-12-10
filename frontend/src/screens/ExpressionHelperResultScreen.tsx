/**
 * 表达助手结果页面
 * 展示三种表达风格：温和、坚定、理性
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../contexts/ThemeContext';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList, ExpressionResult } from '../types';
import { showSuccess } from '../utils/toast';

type NavigationProp = StackNavigationProp<RootStackParamList, 'ExpressionHelperResult'>;
type RouteProps = RouteProp<RootStackParamList, 'ExpressionHelperResult'>;

interface Props {
  navigation: NavigationProp;
  route: RouteProps;
}

interface ExpressionStyle {
  style: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradientColors: [string, string];
}

const styleConfigs: ExpressionStyle[] = [
  {
    style: '温和表达',
    subtitle: 'Soft Style',
    icon: 'heart-outline',
    gradientColors: ['#EC4899', '#F43F5E'],
  },
  {
    style: '坚定表达',
    subtitle: 'Firm Style',
    icon: 'shield-outline',
    gradientColors: ['#F59E0B', '#D97706'],
  },
  {
    style: '理性清晰表达',
    subtitle: 'Neutral Rational',
    icon: 'bulb-outline',
    gradientColors: ['#3B82F6', '#06B6D4'],
  },
];

export const ExpressionHelperResultScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { result } = route.params;
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (text: string, index: number) => {
    await Clipboard.setStringAsync(text);
    setCopiedIndex(index);
    showSuccess({ title: '已复制', message: '表达已复制到剪贴板' });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleNewExpression = () => {
    navigation.navigate('ExpressionHelperInput');
  };

  // 将 result 数组与 styleConfigs 配对
  const expressions = result.map((expr, index) => ({
    ...styleConfigs[index] || styleConfigs[0],
    text: expr.text,
  }));

  return (
    <ScreenContainer backgroundColor={theme.colors.background}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro Card */}
        <View style={[styles.introCard, { backgroundColor: 'rgba(20, 184, 166, 0.08)' }]}>
          <Text style={[styles.introText, { color: theme.colors.textPrimary }]}>
            我们为你生成了三种表达方式，选择你最适合的，或作为灵感继续调整。
          </Text>
        </View>

        {/* Expression Cards */}
        {expressions.map((expr, index) => (
          <View
            key={index}
            style={[styles.expressionCard, { backgroundColor: theme.colors.surface }]}
          >
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.styleInfo}>
                <LinearGradient
                  colors={expr.gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.styleIconBox}
                >
                  <Ionicons name={expr.icon} size={18} color="#FFF" />
                </LinearGradient>
                <View>
                  <Text style={[styles.styleTitle, { color: theme.colors.textPrimary }]}>
                    {expr.style}
                  </Text>
                  <Text style={[styles.styleSubtitle, { color: theme.colors.textTertiary }]}>
                    {expr.subtitle}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => handleCopy(expr.text, index)}
                style={[styles.copyButton, { backgroundColor: theme.colors.background }]}
              >
                <Ionicons
                  name={copiedIndex === index ? 'checkmark' : 'copy-outline'}
                  size={14}
                  color={copiedIndex === index ? '#10B981' : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.copyButtonText,
                    { color: copiedIndex === index ? '#10B981' : theme.colors.textSecondary },
                  ]}
                >
                  {copiedIndex === index ? '已复制' : '复制'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={[styles.expressionContent, { backgroundColor: theme.colors.background }]}>
              <Text style={[styles.expressionText, { color: theme.colors.textPrimary }]}>
                {expr.text}
              </Text>
            </View>
          </View>
        ))}

        {/* Tips Card */}
        <View style={[styles.tipsCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.tipsTitle, { color: theme.colors.textPrimary }]}>
            💡 使用建议
          </Text>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <View style={[styles.tipDot, { backgroundColor: '#14B8A6' }]} />
              <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                根据对方性格和你们的关系选择合适的风格
              </Text>
            </View>
            <View style={styles.tipItem}>
              <View style={[styles.tipDot, { backgroundColor: '#14B8A6' }]} />
              <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                可以结合多种风格，调整成你自己的表达
              </Text>
            </View>
            <View style={styles.tipItem}>
              <View style={[styles.tipDot, { backgroundColor: '#14B8A6' }]} />
              <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                选择你说起来最自然的方式，真诚最重要
              </Text>
            </View>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.newExpressionButton, { backgroundColor: theme.colors.surface }]}
          onPress={handleNewExpression}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={20} color="#14B8A6" />
          <Text style={[styles.newExpressionText, { color: '#14B8A6' }]}>
            优化新的表达
          </Text>
        </TouchableOpacity>

        {/* Disclaimer */}
        <Text style={[styles.disclaimer, { color: theme.colors.textTertiary }]}>
          💡 以上表达仅供参考，请根据实际情况适当调整。
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  introCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.1)',
  },
  introText: {
    fontSize: 14,
    lineHeight: 22,
  },
  expressionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  styleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  styleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  styleSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  copyButtonText: {
    fontSize: 12,
  },
  expressionContent: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  expressionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  tipsCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 7,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  newExpressionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
  },
  newExpressionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});

