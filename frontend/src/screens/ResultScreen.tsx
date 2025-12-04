import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList, RiskLevel, AdviceItem } from '../types';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { showSuccess } from '../utils/toast';

type ResultScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Result'
>;
type ResultScreenRouteProp = RouteProp<RootStackParamList, 'Result'>;

interface Props {
  navigation: ResultScreenNavigationProp;
  route: ResultScreenRouteProp;
}

export const ResultScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { sessionId, riskLevel, result } = route.params;
  const [selectedAdvice, setSelectedAdvice] = useState<AdviceItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    showSuccess({ title: '已复制', message: '文本已复制到剪贴板' });
  };

  const handleAdvicePress = async (advice: AdviceItem) => {
    setSelectedAdvice(advice);
    setModalVisible(true);
    await Clipboard.setStringAsync(advice.message);
    showSuccess({ title: '已复制', message: '建议已复制到剪贴板' });
  };

  const getRiskConfig = (level: RiskLevel) => {
    switch (level) {
      case 'LOW':
        return {
          bg: theme.colors.riskLowBg,
          text: theme.colors.riskLow,
          bannerBg: theme.colors.riskLow,
          label: '低风险 - 沟通良好',
          icon: 'checkmark-circle' as const,
        };
      case 'MEDIUM':
        return {
          bg: theme.colors.riskMediumBg,
          text: theme.colors.riskMedium,
          bannerBg: theme.colors.riskMedium,
          label: '中等风险 - 请冷静后再回复',
          icon: 'alert' as const,
        };
      case 'HIGH':
      case 'CRITICAL':
        return {
          bg: theme.colors.riskHighBg,
          text: theme.colors.riskHigh,
          bannerBg: theme.colors.riskHigh,
          label: '高风险 - 建议休息后再回复',
          icon: 'alert-circle' as const,
        };
      default:
        return {
          bg: theme.colors.riskSafeBg,
          text: theme.colors.riskSafe,
          bannerBg: theme.colors.riskSafe,
          label: '健康 - 良好沟通',
          icon: 'checkmark-circle' as const,
        };
    }
  };

  const riskConfig = getRiskConfig(riskLevel);

  const renderRiskBanner = () => (
    <View style={[styles.riskBanner, { backgroundColor: riskConfig.bannerBg }]}>
      <Ionicons name={riskConfig.icon} size={16} color={theme.colors.textWhite} />
      <Text style={styles.riskBannerText}>{riskConfig.label}</Text>
    </View>
  );

  const renderSummaryCard = () => (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardHeader}>
        <Ionicons name="chatbubble-outline" size={16} color={theme.colors.primary} />
        <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>总结</Text>
      </View>
      <Text style={[styles.summaryText, { color: theme.colors.textMuted }]}>
        {result.summary}
      </Text>
    </View>
  );

  const renderAnalysisCard = () => (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.cardTitle, { color: theme.colors.textPrimary, marginBottom: 12 }]}>
        情绪与需求分析
      </Text>
      <View style={styles.analysisRow}>
        {/* My Side */}
        <View style={[styles.analysisBox, { backgroundColor: theme.colors.background }]}>
          <View style={styles.analysisHeader}>
            <View style={[styles.avatarSmall, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="person" size={12} color={theme.colors.textWhite} />
            </View>
            <Text style={[styles.analysisLabel, { color: theme.colors.textPrimary }]}>我</Text>
          </View>
          <View style={styles.analysisContent}>
            <Text style={[styles.analysisSubLabel, { color: theme.colors.textTertiary }]}>情绪</Text>
            <Text style={[styles.analysisValue, { color: theme.colors.textPrimary }]} numberOfLines={2}>
              {[result.emotion_analysis.my_emotions.primary, ...result.emotion_analysis.my_emotions.secondary].slice(0, 2).join('、')}
            </Text>
            <Text style={[styles.analysisSubLabel, { color: theme.colors.textTertiary, marginTop: 8 }]}>需求</Text>
            <Text style={[styles.analysisValue, { color: theme.colors.textPrimary }]} numberOfLines={2}>
              {result.needs_analysis.my_needs.slice(0, 2).join('、')}
            </Text>
          </View>
        </View>

        {/* Other Side */}
        <View style={[styles.analysisBox, { backgroundColor: theme.colors.background }]}>
          <View style={styles.analysisHeader}>
            <View style={[styles.avatarSmall, { backgroundColor: theme.colors.secondary }]}>
              <Ionicons name="person" size={12} color={theme.colors.textWhite} />
            </View>
            <Text style={[styles.analysisLabel, { color: theme.colors.textPrimary }]}>对方</Text>
          </View>
          <View style={styles.analysisContent}>
            <Text style={[styles.analysisSubLabel, { color: theme.colors.textTertiary }]}>情绪</Text>
            <Text style={[styles.analysisValue, { color: theme.colors.textPrimary }]} numberOfLines={2}>
              {[result.emotion_analysis.their_emotions.primary, ...result.emotion_analysis.their_emotions.secondary].slice(0, 2).join('、')}
            </Text>
            <Text style={[styles.analysisSubLabel, { color: theme.colors.textTertiary, marginTop: 8 }]}>需求</Text>
            <Text style={[styles.analysisValue, { color: theme.colors.textPrimary }]} numberOfLines={2}>
              {result.needs_analysis.their_needs.slice(0, 2).join('、')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderSuggestions = () => (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.cardTitle, { color: theme.colors.textPrimary, marginBottom: 12 }]}>
        回复建议
      </Text>
      <View style={styles.suggestionsRow}>
        {result.advice.map((advice, index) => {
          const isGentle = index === 0;
          const color = isGentle ? theme.colors.primary : theme.colors.secondary;

          return (
            <TouchableOpacity
              key={index}
              style={[styles.suggestionCard, { backgroundColor: theme.colors.background }]}
              onPress={() => handleAdvicePress(advice)}
              activeOpacity={0.7}
            >
              <Text style={[styles.suggestionTitle, { color: color }]}>
                {advice.title}
              </Text>
              <Text style={[styles.suggestionText, { color: theme.colors.textPrimary }]} numberOfLines={3}>
                {advice.message}
              </Text>
              <View style={[styles.copyHint, { backgroundColor: isGentle ? theme.colors.primaryAlpha10 : theme.colors.secondaryAlpha10 }]}>
                <Ionicons name="copy-outline" size={12} color={color} />
                <Text style={[styles.copyHintText, { color: color }]}>点击查看完整内容</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderTimeline = () => (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.cardTitle, { color: theme.colors.textPrimary, marginBottom: 16 }]}>
        对话时间线
      </Text>
      <View style={styles.chatContainer}>
        {result.timeline.map((item, index) => {
          const isMe = item.speaker === 'Me' || item.speaker === '我';
          
          return (
            <View 
              key={index} 
              style={[
                styles.chatBubbleWrapper,
                isMe ? styles.chatBubbleWrapperRight : styles.chatBubbleWrapperLeft,
              ]}
            >
              {/* 头像 */}
              {!isMe && (
                <View style={[styles.chatAvatar, { backgroundColor: theme.colors.secondary }]}>
                  <Ionicons name="person" size={14} color={theme.colors.textWhite} />
                </View>
              )}
              
              {/* 气泡 */}
              <View style={styles.chatBubbleContent}>
                <View
                  style={[
                    styles.chatBubble,
                    isMe 
                      ? [styles.chatBubbleRight, { backgroundColor: theme.colors.primaryAlpha10 }]
                      : [styles.chatBubbleLeft, { backgroundColor: theme.colors.inputBackground }],
                  ]}
                >
                  <Text style={[styles.chatBubbleText, { color: theme.colors.textPrimary }]}>
                    {item.description}
                  </Text>
                </View>
                {/* 情绪标签 */}
                <Text 
                  style={[
                    styles.chatEmotion, 
                    { color: theme.colors.textTertiary },
                    isMe ? styles.chatEmotionRight : styles.chatEmotionLeft,
                  ]}
                >
                  {item.emotion}
                </Text>
              </View>

              {/* 头像 */}
              {isMe && (
                <View style={[styles.chatAvatar, { backgroundColor: theme.colors.primary }]}>
                  <Ionicons name="person" size={14} color={theme.colors.textWhite} />
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderAdviceModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <Pressable 
        style={styles.modalOverlay} 
        onPress={() => setModalVisible(false)}
      >
        <Pressable 
          style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          {selectedAdvice && (
            <>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                  {selectedAdvice.title}
                </Text>
                <TouchableOpacity 
                  onPress={() => setModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <Text style={[styles.modalMessageText, { color: theme.colors.textPrimary }]}>
                  {selectedAdvice.message}
                </Text>
                
                {selectedAdvice.explanation && (
                  <View style={[styles.modalExplanation, { backgroundColor: theme.colors.inputBackground }]}>
                    <View style={styles.modalExplanationHeader}>
                      <Ionicons name="bulb-outline" size={16} color={theme.colors.primary} />
                      <Text style={[styles.modalExplanationTitle, { color: theme.colors.textMuted }]}>
                        为什么这样说
                      </Text>
                    </View>
                    <Text style={[styles.modalExplanationText, { color: theme.colors.textSecondary }]}>
                      {selectedAdvice.explanation}
                    </Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                <View style={[styles.copiedBadge, { backgroundColor: theme.colors.riskSafeBg }]}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                  <Text style={[styles.copiedBadgeText, { color: theme.colors.success }]}>
                    已复制到剪贴板
                  </Text>
                </View>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );

  return (
    <ScreenContainer backgroundColor={theme.colors.background}>
      {renderRiskBanner()}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderSummaryCard()}
        {renderAnalysisCard()}
        {renderSuggestions()}
        {renderTimeline()}
        <View style={styles.bottomSpacing} />
      </ScrollView>
      {renderAdviceModal()}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  riskBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  riskBannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    borderRadius: 10,
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
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
  },
  analysisRow: {
    flexDirection: 'row',
    gap: 12,
  },
  analysisBox: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  avatarSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  analysisContent: {},
  analysisSubLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  analysisValue: {
    fontSize: 13,
    lineHeight: 18,
  },
  suggestionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  suggestionCard: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  copyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 6,
  },
  copyHintText: {
    fontSize: 12,
  },
  // 聊天气泡样式
  chatContainer: {
    gap: 16,
  },
  chatBubbleWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  chatBubbleWrapperLeft: {
    justifyContent: 'flex-start',
    paddingRight: 40,
  },
  chatBubbleWrapperRight: {
    justifyContent: 'flex-end',
    paddingLeft: 40,
  },
  chatAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chatBubbleContent: {
    flex: 1,
    maxWidth: '85%',
  },
  chatBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chatBubbleLeft: {
    borderRadius: 16,
    borderTopLeftRadius: 4,
  },
  chatBubbleRight: {
    borderRadius: 16,
    borderTopRightRadius: 4,
  },
  chatBubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  chatEmotion: {
    fontSize: 11,
    marginTop: 4,
  },
  chatEmotionLeft: {
    textAlign: 'left',
    marginLeft: 4,
  },
  chatEmotionRight: {
    textAlign: 'right',
    marginRight: 4,
  },
  // 弹窗样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  modalMessageText: {
    fontSize: 15,
    lineHeight: 24,
  },
  modalExplanation: {
    marginTop: 20,
    padding: 14,
    borderRadius: 10,
  },
  modalExplanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modalExplanationTitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalExplanationText: {
    fontSize: 13,
    lineHeight: 20,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
  },
  copiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  copiedBadgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 16,
  },
});
