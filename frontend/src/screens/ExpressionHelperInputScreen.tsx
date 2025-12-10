/**
 * 表达助手输入页面
 * 用户输入想说的话，选择目标意图，AI 帮助优化表达
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
import { RootStackParamList, ExpressionIntent } from '../types';
import { showWarning } from '../utils/toast';
import { getCurrentUserId } from '../utils/storage';

type NavigationProp = StackNavigationProp<RootStackParamList, 'ExpressionHelperInput'>;

interface Props {
  navigation: NavigationProp;
}

interface IntentOption {
  value: ExpressionIntent;
  label: string;
  icon: string;
  gradientColors: [string, string];
}

const intentOptions: IntentOption[] = [
  {
    value: 'reconcile',
    label: '和解',
    icon: '🤝',
    gradientColors: ['#10B981', '#059669'],
  },
  {
    value: 'boundary',
    label: '设界限',
    icon: '🛡️',
    gradientColors: ['#F59E0B', '#D97706'],
  },
  {
    value: 'understand',
    label: '求理解',
    icon: '💙',
    gradientColors: ['#3B82F6', '#06B6D4'],
  },
  {
    value: 'stance',
    label: '表态',
    icon: '💬',
    gradientColors: ['#A855F7', '#EC4899'],
  },
];

export const ExpressionHelperInputScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const user = useAppSelector((state) => state.auth.user);

  const [message, setMessage] = useState('');
  const [intent, setIntent] = useState<ExpressionIntent>('understand');
  const [showIntentDropdown, setShowIntentDropdown] = useState(false);

  const messageLength = message.length;
  const isValid = messageLength >= 5 && messageLength <= 2000;
  const selectedIntent = intentOptions.find((i) => i.value === intent) || intentOptions[2];

  const handleSubmit = async () => {
    if (!isValid) {
      showWarning({ title: '提示', message: '请输入至少 5 字的内容' });
      return;
    }

    const userId = user?.userId || await getCurrentUserId();

    navigation.navigate('ExpressionHelperLoading', {
      message,
      intent,
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
          <View style={[styles.descriptionCard, { backgroundColor: 'rgba(20, 184, 166, 0.08)' }]}>
            <Text style={[styles.descriptionText, { color: theme.colors.textPrimary }]}>
              输入你想说的话，我们会帮你优化表达方式，让你的意思更清晰、更温和且更有效。
            </Text>
          </View>

          {/* Main Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>
              你想说什么 <Text style={{ color: theme.colors.danger }}>*</Text>
            </Text>
            <View style={[styles.textAreaContainer, { backgroundColor: theme.colors.surface }]}>
              <TextInput
                style={[styles.textArea, { color: theme.colors.textPrimary }]}
                multiline
                numberOfLines={8}
                placeholder="直接输入你想表达的内容，可以是原始的、情绪化的，不用担心措辞..."
                placeholderTextColor={theme.colors.textTertiary}
                value={message}
                onChangeText={setMessage}
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
                {messageLength}/2000 字（至少5字）
              </Text>
            </View>
          </View>

          {/* Intent Selection */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>目标意图</Text>
            <TouchableOpacity
              style={[styles.intentSelector, { backgroundColor: theme.colors.surface }]}
              onPress={() => setShowIntentDropdown(!showIntentDropdown)}
              activeOpacity={0.7}
            >
              <View style={styles.intentSelectorContent}>
                <LinearGradient
                  colors={selectedIntent.gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.intentIconBox}
                >
                  <Text style={styles.intentIcon}>{selectedIntent.icon}</Text>
                </LinearGradient>
                <Text style={[styles.intentLabel, { color: theme.colors.textPrimary }]}>
                  {selectedIntent.label}
                </Text>
              </View>
              <Ionicons
                name={showIntentDropdown ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={theme.colors.textTertiary}
              />
            </TouchableOpacity>

            {/* Dropdown */}
            {showIntentDropdown && (
              <View style={[styles.dropdown, { backgroundColor: theme.colors.surface }]}>
                {intentOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.dropdownItem,
                      { borderBottomColor: theme.colors.border },
                    ]}
                    onPress={() => {
                      setIntent(option.value);
                      setShowIntentDropdown(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={option.gradientColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.intentIconBox}
                    >
                      <Text style={styles.intentIcon}>{option.icon}</Text>
                    </LinearGradient>
                    <Text style={[styles.dropdownItemText, { color: theme.colors.textPrimary }]}>
                      {option.label}
                    </Text>
                    {option.value === intent && (
                      <Ionicons name="checkmark" size={18} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Intent Descriptions */}
          <View style={[styles.intentDescCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.intentDescTitle, { color: theme.colors.textPrimary }]}>
              💡 意图说明
            </Text>
            <View style={styles.intentDescList}>
              <View style={styles.intentDescItem}>
                <Text style={styles.intentDescEmoji}>🤝</Text>
                <Text style={[styles.intentDescText, { color: theme.colors.textSecondary }]}>
                  <Text style={{ fontWeight: '500' }}>和解</Text> - 修复关系，表达歉意或接受对方
                </Text>
              </View>
              <View style={styles.intentDescItem}>
                <Text style={styles.intentDescEmoji}>🛡️</Text>
                <Text style={[styles.intentDescText, { color: theme.colors.textSecondary }]}>
                  <Text style={{ fontWeight: '500' }}>设界限</Text> - 明确底线，拒绝不合理要求
                </Text>
              </View>
              <View style={styles.intentDescItem}>
                <Text style={styles.intentDescEmoji}>💙</Text>
                <Text style={[styles.intentDescText, { color: theme.colors.textSecondary }]}>
                  <Text style={{ fontWeight: '500' }}>求理解</Text> - 表达感受，希望被理解
                </Text>
              </View>
              <View style={styles.intentDescItem}>
                <Text style={styles.intentDescEmoji}>💬</Text>
                <Text style={[styles.intentDescText, { color: theme.colors.textSecondary }]}>
                  <Text style={{ fontWeight: '500' }}>表态</Text> - 清晰表明立场和观点
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Action */}
        <View style={[styles.bottomAction, { backgroundColor: theme.colors.background }]}>
          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={!isValid}
            style={styles.gradientButtonWrapper}
          >
            <LinearGradient
              colors={
                isValid
                  ? ['#14B8A6', '#06B6D4']
                  : [theme.colors.border, theme.colors.border]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Ionicons
                name="sparkles-outline"
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
                生成表达方式
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
    borderColor: 'rgba(20, 184, 166, 0.1)',
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
    minHeight: 160,
  },
  textInfo: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  charCount: {
    fontSize: 12,
  },
  intentSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  intentSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  intentIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intentIcon: {
    fontSize: 16,
  },
  intentLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  dropdown: {
    marginTop: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 14,
  },
  intentDescCard: {
    borderRadius: 10,
    padding: 16,
    marginTop: 8,
  },
  intentDescTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  intentDescList: {
    gap: 8,
  },
  intentDescItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  intentDescEmoji: {
    fontSize: 14,
  },
  intentDescText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  bottomAction: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  gradientButtonWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#14B8A6',
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

