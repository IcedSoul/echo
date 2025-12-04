import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { showSuccess, showError } from '../utils/toast';

type HelpFeedbackScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'HelpFeedback'
>;

interface Props {
  navigation: HelpFeedbackScreenNavigationProp;
}

interface FAQ {
  question: string;
  answer: string;
  expanded: boolean;
}

export const HelpFeedbackScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const [feedback, setFeedback] = useState('');
  const [faqs, setFaqs] = useState<FAQ[]>([
    {
      question: 'Wavecho 如何分析我的对话？',
      answer:
        'Wavecho 使用先进的 AI 技术分析您提供的对话内容，识别其中的情绪变化、沟通模式和潜在冲突点，然后为您提供客观的分析报告和实用的沟通建议。',
      expanded: false,
    },
    {
      question: '我的对话数据安全吗？',
      answer:
        '是的，您的数据安全是我们的首要任务。所有对话内容都经过加密传输和存储，我们不会将您的数据用于任何商业目的或与第三方共享。您可以随时删除您的历史记录。',
      expanded: false,
    },
    {
      question: '分析结果中的风险等级是什么意思？',
      answer:
        '风险等级反映了对话中潜在冲突的严重程度。绿色（低风险）表示对话健康，黄色（中风险）表示有些需要注意的地方，红色（高风险）表示对话中存在明显的冲突信号，建议关注和改善。',
      expanded: false,
    },
    {
      question: '如何获得更准确的分析结果？',
      answer:
        '为了获得更准确的分析，建议您：1) 提供完整的对话内容，包括上下文；2) 在情境描述中说明对话背景和双方关系；3) 确保对话内容清晰可读，标注好发言人。',
      expanded: false,
    },
    {
      question: '我可以分析多少次对话？',
      answer:
        '目前注册用户可以无限制地使用分析功能。未登录用户可以体验一次免费分析。我们未来可能会根据服务情况调整使用限制。',
      expanded: false,
    },
  ]);

  const toggleFAQ = (index: number) => {
    setFaqs(prev =>
      prev.map((faq, i) =>
        i === index ? { ...faq, expanded: !faq.expanded } : faq
      )
    );
  };

  const handleSubmitFeedback = () => {
    if (!feedback.trim()) {
      showError({ title: '提示', message: '请输入您的反馈内容' });
      return;
    }
    // 这里可以调用 API 提交反馈
    showSuccess({ title: '感谢反馈', message: '我们已收到您的反馈，会认真阅读并持续改进' });
    setFeedback('');
  };

  const handleContactEmail = () => {
    Linking.openURL('mailto:support@wavecho.app?subject=Wavecho反馈');
  };

  const contactMethods = [
    {
      icon: 'mail' as const,
      title: '邮件联系',
      subtitle: 'support@wavecho.app',
      onPress: handleContactEmail,
    },
    {
      icon: 'logo-github' as const,
      title: 'GitHub',
      subtitle: '查看项目源码和提交 Issue',
      onPress: () => Linking.openURL('https://github.com/wavecho'),
    },
  ];

  return (
    <ScreenContainer backgroundColor={theme.colors.background}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 常见问题 */}
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-circle" size={18} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              常见问题
            </Text>
          </View>

          {faqs.map((faq, index) => (
            <View key={index}>
              <TouchableOpacity
                onPress={() => toggleFAQ(index)}
                activeOpacity={0.7}
                style={[
                  styles.faqItem,
                  {
                    borderBottomWidth: index < faqs.length - 1 || faq.expanded ? 1 : 0,
                    borderBottomColor: theme.colors.borderLight,
                  },
                ]}
              >
                <Text style={[styles.faqQuestion, { color: theme.colors.textPrimary }]}>
                  {faq.question}
                </Text>
                <Ionicons
                  name={faq.expanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={theme.colors.textTertiary}
                />
              </TouchableOpacity>
              {faq.expanded && (
                <View style={[styles.faqAnswer, { backgroundColor: theme.colors.inputBackground }]}>
                  <Text style={[styles.faqAnswerText, { color: theme.colors.textSecondary }]}>
                    {faq.answer}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* 意见反馈 */}
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbubble-ellipses" size={18} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              意见反馈
            </Text>
          </View>

          <View style={styles.feedbackContent}>
            <Text style={[styles.feedbackHint, { color: theme.colors.textSecondary }]}>
              您的反馈对我们非常重要，帮助我们持续改进产品
            </Text>
            <TextInput
              style={[
                styles.feedbackInput,
                {
                  backgroundColor: theme.colors.inputBackground,
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="请输入您的建议、问题或想法..."
              placeholderTextColor={theme.colors.textTertiary}
              value={feedback}
              onChangeText={setFeedback}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity
              onPress={handleSubmitFeedback}
              activeOpacity={0.8}
              style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
            >
              <Ionicons name="send" size={16} color={theme.colors.textWhite} />
              <Text style={[styles.submitButtonText, { color: theme.colors.textWhite }]}>
                提交反馈
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 联系我们 */}
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="call" size={18} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              联系我们
            </Text>
          </View>

          {contactMethods.map((method, index) => (
            <TouchableOpacity
              key={index}
              onPress={method.onPress}
              activeOpacity={0.7}
              style={[
                styles.contactItem,
                index < contactMethods.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.borderLight,
                },
              ]}
            >
              <View style={[styles.contactIcon, { backgroundColor: theme.colors.inputBackground }]}>
                <Ionicons name={method.icon} size={18} color={theme.colors.textMuted} />
              </View>
              <View style={styles.contactContent}>
                <Text style={[styles.contactTitle, { color: theme.colors.textPrimary }]}>
                  {method.title}
                </Text>
                <Text style={[styles.contactSubtitle, { color: theme.colors.textSecondary }]}>
                  {method.subtitle}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* 关于应用 */}
        <View style={[styles.aboutCard, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.aboutIcon, { backgroundColor: theme.colors.primaryAlpha10 }]}>
            <Ionicons name="pulse" size={24} color={theme.colors.primary} />
          </View>
          <Text style={[styles.aboutTitle, { color: theme.colors.textPrimary }]}>
            Wavecho
          </Text>
          <Text style={[styles.aboutVersion, { color: theme.colors.textSecondary }]}>
            版本 1.0.0
          </Text>
          <Text style={[styles.aboutDescription, { color: theme.colors.textTertiary }]}>
            用心倾听每一次对话，让沟通更有温度
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
  },
  sectionCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  faqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  faqAnswer: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  faqAnswerText: {
    fontSize: 13,
    lineHeight: 20,
  },
  feedbackContent: {
    padding: 16,
  },
  feedbackHint: {
    fontSize: 13,
    marginBottom: 12,
  },
  feedbackInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 10,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  contactSubtitle: {
    fontSize: 13,
  },
  aboutCard: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  aboutIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  aboutVersion: {
    fontSize: 13,
    marginBottom: 8,
  },
  aboutDescription: {
    fontSize: 13,
    textAlign: 'center',
  },
});

