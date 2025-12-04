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
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector } from '../store/hooks';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { showWarning } from '../utils/toast';
import { getCurrentUserId } from '../utils/storage';

type AnalyzeInputScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AnalyzeInput'
>;

interface Props {
  navigation: AnalyzeInputScreenNavigationProp;
}

export const AnalyzeInputScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const user = useAppSelector((state) => state.auth.user);

  const [conversationText, setConversationText] = useState('');
  const [contextDescription, setContextDescription] = useState('');
  const [showExample, setShowExample] = useState(false);

  const textLength = conversationText.length;
  const isTextValid = textLength >= 10 && textLength <= 5000;

  const handleSubmit = async () => {
    if (!isTextValid) {
      showWarning({ title: '提示', message: '请输入10-5000字的对话内容' });
      return;
    }

    // 获取当前用户 ID（登录用户或匿名用户的持久化 ID）
    const userId = user?.userId || await getCurrentUserId();

    // Navigate to Loading screen with analysis parameters
    navigation.navigate('Loading', {
      conversationText: conversationText,
      contextDescription: contextDescription || undefined,
      userId: userId,
    });
  };

  const exampleText = `我：你今天怎么又加班到这么晚？饭都凉了。
对方：公司有个紧急项目，我也没办法啊。
我：你总是把工作放在第一位，家里的事你什么时候上过心？
对方：我工作还不是为了这个家？你怎么就不能理解我呢？
我：我理解你？那谁来理解我？我一个人带孩子、做家务，你知道有多累吗？
对方：行行行，都是我的错，我不该工作，我不该赚钱。
我：你这是什么态度？我跟你好好说话，你能不能别阴阳怪气的？
对方：我累了一天了，不想吵，你非要吵是吧？
我：算了，跟你说不清楚。`;

  return (
    <ScreenContainer backgroundColor={theme.colors.background}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main Input Card */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>
              对话记录
            </Text>
            <View style={[styles.textAreaContainer, { backgroundColor: theme.colors.surface }]}>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    color: theme.colors.textPrimary,
                  },
                ]}
                multiline
                numberOfLines={8}
                placeholder="粘贴你们的聊天记录，我会帮你分析对话中的情绪、需求和沟通模式..."
                placeholderTextColor={theme.colors.textTertiary}
                value={conversationText}
                onChangeText={setConversationText}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.textInfo}>
              <Text
                style={[
                  styles.charCount,
                  {
                    color: isTextValid
                      ? theme.colors.textSecondary
                      : theme.colors.danger,
                  },
                ]}
              >
                {textLength}/5000 字（至少10字）
              </Text>
            </View>
          </View>

          {/* Optional Context Card */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>
              背景说明（可选）
            </Text>
            <View style={[styles.contextContainer, { backgroundColor: theme.colors.surface }]}>
              <TextInput
                style={[
                  styles.contextInput,
                  {
                    color: theme.colors.textPrimary,
                  },
                ]}
                multiline
                numberOfLines={2}
                placeholder="补充一些背景信息，能让分析更准确..."
                placeholderTextColor={theme.colors.textTertiary}
                value={contextDescription}
                onChangeText={setContextDescription}
                maxLength={200}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Example Section */}
          <View style={styles.exampleSection}>
            <TouchableOpacity
              onPress={() => setShowExample(!showExample)}
              activeOpacity={0.7}
              style={[styles.exampleToggle, { backgroundColor: theme.colors.surface }]}
            >
              <Text style={[styles.exampleToggleText, { color: theme.colors.textSecondary }]}>
                {showExample ? '隐藏示例' : '查看示例'}
              </Text>
              <Ionicons
                name={showExample ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
            {showExample && (
              <View style={[styles.exampleContent, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.exampleLabel, { color: theme.colors.textSecondary }]}>
                  示例对话：
                </Text>
                <Text style={[styles.exampleText, { color: theme.colors.textPrimary }]}>
                  {exampleText}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setConversationText(exampleText);
                    setContextDescription('伴侣经常加班，今晚又很晚才回家，我一直在等他吃饭。');
                    setShowExample(false);
                  }}
                  activeOpacity={0.8}
                  style={[styles.useExampleButton, { backgroundColor: theme.colors.primaryAlpha10 }]}
                >
                  <Text style={[styles.useExampleText, { color: theme.colors.primary }]}>
                    使用此示例
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom Action */}
        <View style={[styles.bottomAction, { backgroundColor: theme.colors.background }]}>
          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={!isTextValid}
            style={styles.gradientButtonWrapper}
          >
            <LinearGradient
              colors={
                isTextValid
                  ? [theme.colors.primary, theme.colors.gradientEnd]
                  : [theme.colors.border, theme.colors.border]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Ionicons
                name="sparkles"
                size={18}
                color={isTextValid ? '#FFFFFF' : theme.colors.textTertiary}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.gradientButtonText,
                  { color: isTextValid ? '#FFFFFF' : theme.colors.textTertiary },
                ]}
              >
                开始分析
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Disclaimer */}
          <Text style={[styles.disclaimer, { color: theme.colors.textTertiary }]}>
            💡 Wavecho 是基于AI的沟通辅助工具，不能替代专业心理咨询。
          </Text>
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
    paddingTop: 20,
    paddingBottom: 8,
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
    minHeight: 280,
  },
  textInfo: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  charCount: {
    fontSize: 12,
  },
  contextContainer: {
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  contextInput: {
    fontSize: 14,
    lineHeight: 22,
    minHeight: 56,
  },
  exampleSection: {
    marginBottom: 16,
  },
  exampleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  exampleToggleText: {
    fontSize: 14,
  },
  exampleContent: {
    marginTop: 8,
    borderRadius: 10,
    padding: 16,
  },
  exampleLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  useExampleButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  useExampleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomAction: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  gradientButtonWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#06B6D4',
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
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
});
