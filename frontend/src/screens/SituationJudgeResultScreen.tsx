/**
 * 情况评理结果页面
 * 展示事件分析、双方视角、责任分析、逻辑审查、建议回复
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../contexts/ThemeContext';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList, SituationJudgeResult } from '../types';
import { showSuccess } from '../utils/toast';

type NavigationProp = StackNavigationProp<RootStackParamList, 'SituationJudgeResult'>;
type RouteProps = RouteProp<RootStackParamList, 'SituationJudgeResult'>;

interface Props {
  navigation: NavigationProp;
  route: RouteProps;
}

export const SituationJudgeResultScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { result } = route.params;
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (text: string, index: number) => {
    await Clipboard.setStringAsync(text);
    setCopiedIndex(index);
    showSuccess({ title: '已复制', message: '建议已复制到剪贴板' });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleNewAnalysis = () => {
    navigation.navigate('SituationJudgeInput');
  };

  return (
    <ScreenContainer backgroundColor={theme.colors.background}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text-outline" size={18} color="#3B82F6" />
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
              事件概要
            </Text>
          </View>
          <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>
            {result.summary}
          </Text>
        </View>

        {/* Perspectives Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="people-outline" size={18} color="#06B6D4" />
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
              双方视角
            </Text>
          </View>

          <View style={[styles.perspectiveBox, { backgroundColor: 'rgba(59, 130, 246, 0.08)' }]}>
            <Text style={[styles.perspectiveLabel, { color: '#3B82F6' }]}>你的视角</Text>
            <Text style={[styles.perspectiveText, { color: theme.colors.textPrimary }]}>
              {result.perspectives.yours}
            </Text>
          </View>

          <View style={[styles.perspectiveBox, { backgroundColor: 'rgba(6, 182, 212, 0.08)' }]}>
            <Text style={[styles.perspectiveLabel, { color: '#06B6D4' }]}>对方的视角</Text>
            <Text style={[styles.perspectiveText, { color: theme.colors.textPrimary }]}>
              {result.perspectives.theirs}
            </Text>
          </View>
        </View>

        {/* Responsibility Analysis */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="pie-chart-outline" size={18} color="#14B8A6" />
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
              责任分析
            </Text>
          </View>
          <Text style={[styles.cardSubtitle, { color: theme.colors.textTertiary }]}>
            可能的责任倾向分布
          </Text>

          <View style={styles.responsibilityBars}>
            <View style={styles.responsibilityItem}>
              <View style={styles.responsibilityLabelRow}>
                <Text style={[styles.responsibilityLabel, { color: theme.colors.textPrimary }]}>
                  你的部分
                </Text>
                <Text style={[styles.responsibilityValue, { color: '#3B82F6' }]}>
                  {result.responsibility.yours}%
                </Text>
              </View>
              <View style={[styles.barBackground, { backgroundColor: theme.colors.border }]}>
                <LinearGradient
                  colors={['#60A5FA', '#3B82F6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.barFill, { width: `${result.responsibility.yours}%` }]}
                />
              </View>
            </View>

            <View style={styles.responsibilityItem}>
              <View style={styles.responsibilityLabelRow}>
                <Text style={[styles.responsibilityLabel, { color: theme.colors.textPrimary }]}>
                  对方的部分
                </Text>
                <Text style={[styles.responsibilityValue, { color: '#06B6D4' }]}>
                  {result.responsibility.theirs}%
                </Text>
              </View>
              <View style={[styles.barBackground, { backgroundColor: theme.colors.border }]}>
                <LinearGradient
                  colors={['#22D3EE', '#06B6D4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.barFill, { width: `${result.responsibility.theirs}%` }]}
                />
              </View>
            </View>

            <View style={styles.responsibilityItem}>
              <View style={styles.responsibilityLabelRow}>
                <Text style={[styles.responsibilityLabel, { color: theme.colors.textPrimary }]}>
                  共同因素
                </Text>
                <Text style={[styles.responsibilityValue, { color: '#14B8A6' }]}>
                  {result.responsibility.shared}%
                </Text>
              </View>
              <View style={[styles.barBackground, { backgroundColor: theme.colors.border }]}>
                <LinearGradient
                  colors={['#2DD4BF', '#14B8A6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.barFill, { width: `${result.responsibility.shared}%` }]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Logic Issues */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="alert-circle-outline" size={18} color="#F97316" />
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
              逻辑审查
            </Text>
          </View>
          <Text style={[styles.cardSubtitle, { color: theme.colors.textTertiary }]}>
            叙述中可能存在的认知偏差
          </Text>

          <View style={styles.issuesList}>
            {result.logic_issues.map((issue, index) => (
              <View
                key={index}
                style={[styles.issueItem, { backgroundColor: 'rgba(249, 115, 22, 0.08)' }]}
              >
                <Text style={[styles.issueType, { color: '#F97316' }]}>{issue.type}</Text>
                <Text style={[styles.issueDescription, { color: theme.colors.textSecondary }]}>
                  {issue.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Suggestions */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="bulb-outline" size={18} color="#10B981" />
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
              建议回复
            </Text>
          </View>

          <View style={styles.suggestionsList}>
            {result.suggestions.map((suggestion, index) => (
              <View
                key={index}
                style={[styles.suggestionItem, { backgroundColor: theme.colors.background }]}
              >
                <View style={styles.suggestionHeader}>
                  <Text style={[styles.suggestionStyle, { color: theme.colors.primary }]}>
                    {suggestion.style}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleCopy(suggestion.text, index)}
                    style={[styles.copyButton, { backgroundColor: theme.colors.surface }]}
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
                <Text style={[styles.suggestionText, { color: theme.colors.textPrimary }]}>
                  {suggestion.text}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.newAnalysisButton, { backgroundColor: theme.colors.surface }]}
          onPress={handleNewAnalysis}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.newAnalysisText, { color: theme.colors.primary }]}>
            开始新的评理分析
          </Text>
        </TouchableOpacity>

        {/* Disclaimer */}
        <Text style={[styles.disclaimer, { color: theme.colors.textTertiary }]}>
          💡 以上分析基于你提供的信息，仅供参考。复杂问题建议多角度思考。
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
  card: {
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
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 12,
    marginBottom: 12,
    marginTop: -4,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
  },
  perspectiveBox: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  perspectiveLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  perspectiveText: {
    fontSize: 13,
    lineHeight: 20,
  },
  responsibilityBars: {
    gap: 12,
  },
  responsibilityItem: {
    gap: 6,
  },
  responsibilityLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  responsibilityLabel: {
    fontSize: 13,
  },
  responsibilityValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  barBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  issuesList: {
    gap: 8,
  },
  issueItem: {
    borderRadius: 8,
    padding: 12,
  },
  issueType: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  issueDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  suggestionsList: {
    gap: 10,
  },
  suggestionItem: {
    borderRadius: 8,
    padding: 12,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  suggestionStyle: {
    fontSize: 12,
    fontWeight: '500',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  copyButtonText: {
    fontSize: 12,
  },
  suggestionText: {
    fontSize: 13,
    lineHeight: 20,
  },
  newAnalysisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  newAnalysisText: {
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

