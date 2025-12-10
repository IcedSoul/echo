/**
 * 情况评理输入页面
 * 用户描述事情经过，AI 从客观角度进行结构化分析
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector } from '../store/hooks';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../types';
import { showWarning } from '../utils/toast';
import { getCurrentUserId } from '../utils/storage';

type NavigationProp = StackNavigationProp<RootStackParamList, 'SituationJudgeInput'>;

interface Props {
  navigation: NavigationProp;
}

export const SituationJudgeInputScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const user = useAppSelector((state) => state.auth.user);

  const [situation, setSituation] = useState('');
  const [background, setBackground] = useState('');

  const situationLength = situation.length;
  const isValid = situationLength >= 20 && situationLength <= 5000;

  const handleSubmit = async () => {
    if (!isValid) {
      showWarning({ title: '提示', message: '请输入至少 20 字的事情经过' });
      return;
    }

    const userId = user?.userId || await getCurrentUserId();

    navigation.navigate('SituationJudgeLoading', {
      situation,
      background: background || undefined,
      userId,
    });
  };

  return (
    <ScreenContainer backgroundColor={theme.colors.background}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Description Card */}
          <View style={[styles.descriptionCard, { backgroundColor: 'rgba(59, 130, 246, 0.08)' }]}>
            <Text style={[styles.descriptionText, { color: theme.colors.textPrimary }]}>
              描述你遇到的事情，我们将从客观角度帮你分析责任归属和逻辑漏洞。
            </Text>
          </View>

          {/* Main Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>
              事情经过 <Text style={{ color: theme.colors.danger }}>*</Text>
            </Text>
            <View style={[styles.textAreaContainer, { backgroundColor: theme.colors.surface }]}>
              <TextInput
                style={[styles.textArea, { color: theme.colors.textPrimary }]}
                multiline
                numberOfLines={10}
                placeholder="详细描述发生了什么，包括时间、地点、人物、事件的起因经过结果..."
                placeholderTextColor={theme.colors.textTertiary}
                value={situation}
                onChangeText={setSituation}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.textInfo}>
              <Text
                style={[
                  styles.charCount,
                  { color: isValid ? theme.colors.textSecondary : theme.colors.danger },
                ]}
              >
                {situationLength}/5000 字（至少20字）
              </Text>
            </View>
          </View>

          {/* Background Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>
              补充背景（可选）
            </Text>
            <View style={[styles.backgroundContainer, { backgroundColor: theme.colors.surface }]}>
              <TextInput
                style={[styles.backgroundInput, { color: theme.colors.textPrimary }]}
                multiline
                numberOfLines={3}
                placeholder="补充一些背景信息，比如你们的关系、之前发生过什么..."
                placeholderTextColor={theme.colors.textTertiary}
                value={background}
                onChangeText={setBackground}
                maxLength={300}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Tips */}
          <View style={[styles.tipsCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.tipsTitle, { color: theme.colors.textPrimary }]}>
              💡 描述建议
            </Text>
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <View style={[styles.tipDot, { backgroundColor: theme.colors.primary }]} />
                <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                  尽量客观描述事实，而不只是你的感受
                </Text>
              </View>
              <View style={styles.tipItem}>
                <View style={[styles.tipDot, { backgroundColor: theme.colors.primary }]} />
                <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                  包含对方说了什么、做了什么
                </Text>
              </View>
              <View style={styles.tipItem}>
                <View style={[styles.tipDot, { backgroundColor: theme.colors.primary }]} />
                <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                  说明事情发生的背景和时间顺序
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Action */}
        <View style={[styles.bottomAction, { backgroundColor: theme.colors.background }]}>
          <View style={styles.privacyRow}>
            <Ionicons name="shield-checkmark-outline" size={14} color={theme.colors.textTertiary} />
            <Text style={[styles.privacyText, { color: theme.colors.textTertiary }]}>
              不会存储原始内容
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={!isValid}
            style={styles.gradientButtonWrapper}
          >
            <LinearGradient
              colors={
                isValid
                  ? ['#3B82F6', '#06B6D4']
                  : [theme.colors.border, theme.colors.border]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Ionicons
                name="analytics-outline"
                size={18}
                color={isValid ? '#FFFFFF' : theme.colors.textTertiary}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.gradientButtonText,
                  { color: isValid ? '#FFFFFF' : theme.colors.textTertiary },
                ]}
              >
                开始评理分析
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  descriptionCard: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  inputSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textAreaContainer: {
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  textArea: {
    fontSize: 14,
    lineHeight: 22,
    minHeight: 200,
  },
  textInfo: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  charCount: {
    fontSize: 12,
  },
  backgroundContainer: {
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  backgroundInput: {
    fontSize: 14,
    lineHeight: 22,
    minHeight: 72,
  },
  tipsCard: {
    borderRadius: 10,
    padding: 16,
    marginTop: 8,
  },
  tipsTitle: {
    fontSize: 14,
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
  bottomAction: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  privacyText: {
    fontSize: 12,
  },
  gradientButtonWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  gradientButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  gradientButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

