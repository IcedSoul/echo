import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';

type NotificationSettingsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'NotificationSettings'
>;

interface Props {
  navigation: NotificationSettingsScreenNavigationProp;
}

interface NotificationSetting {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  enabled: boolean;
}

export const NotificationSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: 'push',
      icon: 'notifications',
      title: '推送通知',
      description: '接收应用的推送消息提醒',
      enabled: true,
    },
    {
      id: 'analysis_complete',
      icon: 'checkmark-circle',
      title: '分析完成通知',
      description: '当对话分析完成时收到提醒',
      enabled: true,
    },
    {
      id: 'weekly_summary',
      icon: 'calendar',
      title: '每周总结',
      description: '每周接收您的对话健康报告',
      enabled: false,
    },
    {
      id: 'new_features',
      icon: 'sparkles',
      title: '新功能提醒',
      description: '了解 Wavecho 的最新功能更新',
      enabled: true,
    },
    {
      id: 'tips',
      icon: 'bulb',
      title: '沟通技巧提示',
      description: '不定期收到实用的沟通建议',
      enabled: false,
    },
  ]);

  const toggleSetting = (id: string) => {
    setSettings(prev =>
      prev.map(setting =>
        setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
      )
    );
  };

  return (
    <ScreenContainer backgroundColor={theme.colors.background}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 说明卡片 */}
        <View style={[styles.infoCard, { backgroundColor: theme.colors.primaryAlpha10 }]}>
          <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
          <Text style={[styles.infoText, { color: theme.colors.textMuted }]}>
            管理您希望接收的通知类型，确保不会错过重要信息
          </Text>
        </View>

        {/* 通知设置列表 */}
        <View style={[styles.settingsCard, { backgroundColor: theme.colors.surface }]}>
          {settings.map((setting, index) => (
            <View
              key={setting.id}
              style={[
                styles.settingItem,
                index < settings.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.borderLight,
                },
              ]}
            >
              <View style={[styles.settingIcon, { backgroundColor: theme.colors.inputBackground }]}>
                <Ionicons name={setting.icon} size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: theme.colors.textPrimary }]}>
                  {setting.title}
                </Text>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                  {setting.description}
                </Text>
              </View>
              <Switch
                value={setting.enabled}
                onValueChange={() => toggleSetting(setting.id)}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.primaryAlpha30,
                }}
                thumbColor={setting.enabled ? theme.colors.primary : theme.colors.textTertiary}
              />
            </View>
          ))}
        </View>

        {/* 底部提示 */}
        <View style={styles.footerInfo}>
          <Ionicons name="shield-checkmark" size={16} color={theme.colors.textTertiary} />
          <Text style={[styles.footerText, { color: theme.colors.textTertiary }]}>
            您可以随时更改这些设置。我们承诺不会滥用通知功能。
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  settingsCard: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 4,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});

