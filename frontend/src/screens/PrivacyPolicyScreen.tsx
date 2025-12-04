import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';

type PrivacyPolicyScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'PrivacyPolicy'
>;

interface Props {
  navigation: PrivacyPolicyScreenNavigationProp;
}

interface PrivacySection {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  content: string;
}

export const PrivacyPolicyScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();

  const privacySections: PrivacySection[] = [
    {
      icon: 'document-text',
      title: '数据收集',
      content:
        'Wavecho 仅收集您主动提供的对话内容用于分析。我们不会在未经您同意的情况下收集任何其他个人信息。您的邮箱地址仅用于账户登录和重要通知。',
    },
    {
      icon: 'cloud-upload',
      title: '数据存储',
      content:
        '您的对话分析记录将被安全存储在我们的服务器上，采用业界标准的加密技术保护。您可以随时在历史记录中查看或删除这些数据。',
    },
    {
      icon: 'eye-off',
      title: '数据使用',
      content:
        '我们承诺不会将您的对话内容用于任何商业目的或与第三方共享。分析数据仅用于为您提供个性化的沟通建议和改进我们的服务质量。',
    },
    {
      icon: 'lock-closed',
      title: '数据安全',
      content:
        '我们采用 SSL/TLS 加密传输、数据加密存储等多重安全措施保护您的隐私。服务器部署在安全可靠的云平台上，定期进行安全审计。',
    },
    {
      icon: 'trash',
      title: '数据删除',
      content:
        '您有权随时删除您的账户和所有相关数据。一旦您提出删除请求，我们将在 30 天内永久删除您的所有数据，且不可恢复。',
    },
  ];

  const securityTips = [
    '定期更换密码，使用强密码组合',
    '不要在公共网络上进行敏感操作',
    '及时退出登录，特别是在共享设备上',
    '如发现账户异常，请立即联系我们',
  ];

  return (
    <ScreenContainer backgroundColor={theme.colors.background}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 头部介绍 */}
        <View style={[styles.headerCard, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.headerIcon, { backgroundColor: theme.colors.primaryAlpha10 }]}>
            <Ionicons name="shield-checkmark" size={32} color={theme.colors.primary} />
          </View>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            保护您的隐私是我们的首要任务
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Wavecho 致力于为您提供安全、私密的对话分析服务
          </Text>
        </View>

        {/* 隐私政策详情 */}
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-lock" size={18} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              隐私政策
            </Text>
          </View>

          {privacySections.map((section, index) => (
            <View
              key={index}
              style={[
                styles.privacyItem,
                index < privacySections.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.borderLight,
                },
              ]}
            >
              <View style={[styles.privacyIcon, { backgroundColor: theme.colors.inputBackground }]}>
                <Ionicons name={section.icon} size={18} color={theme.colors.textMuted} />
              </View>
              <View style={styles.privacyContent}>
                <Text style={[styles.privacyTitle, { color: theme.colors.textPrimary }]}>
                  {section.title}
                </Text>
                <Text style={[styles.privacyText, { color: theme.colors.textSecondary }]}>
                  {section.content}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* 安全建议 */}
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="key" size={18} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              安全建议
            </Text>
          </View>

          {securityTips.map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <View style={[styles.tipBullet, { backgroundColor: theme.colors.primary }]} />
              <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                {tip}
              </Text>
            </View>
          ))}
        </View>

        {/* 更新日期 */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.textTertiary }]}>
            最后更新：2025年1月1日
          </Text>
          <Text style={[styles.footerText, { color: theme.colors.textTertiary }]}>
            如有疑问，请通过帮助与反馈联系我们
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
  headerCard: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
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
  privacyItem: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  privacyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 6,
  },
  privacyText: {
    fontSize: 13,
    lineHeight: 20,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    marginTop: 8,
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
  },
});

