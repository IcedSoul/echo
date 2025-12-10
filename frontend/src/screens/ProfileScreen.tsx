import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { INPUT_BASE_STYLE } from '../components/Input';
import { logout, updateUser, setToken } from '../store/slices/authSlice';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../types';
import { getUserStats, updateCurrentUser, getCurrentUser } from '../api/auth';
import { Ionicons } from '@expo/vector-icons';
import { showSuccess, showError } from '../utils/toast';

type ProfileScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Profile'
>;

interface Props {
  navigation: ProfileScreenNavigationProp;
}

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const token = useAppSelector((state) => state.auth.token);
  const [stats, setStats] = useState({
    total_analyses: 0,
    healthy_conversations: 0,
    needs_attention: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    if (token) {
      try {
        // 加载统计数据
        const statsData = await getUserStats(token);
        setStats(statsData);
        
        // 刷新用户信息
        const userData = await getCurrentUser(token);
        if (userData) {
          dispatch(updateUser({
            nickname: userData.nickname,
            email: userData.email,
            phone: userData.phone,
          }));
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    }
    setLoading(false);
  };

  const handleLogout = () => {
    Alert.alert('确认退出', '确定要退出登录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出',
        style: 'destructive',
        onPress: () => {
          // 使用 Redux dispatch 退出登录
          dispatch(logout());
          // 由于 Redux 状态变化，AppNavigator 会自动切换到 AuthStack
        },
      },
    ]);
  };

  const handleEditNickname = () => {
    setNewNickname(user?.nickname || '');
    setShowNicknameModal(true);
  };

  const handleSaveNickname = async () => {
    if (!newNickname.trim()) {
      showError({ title: '错误', message: '昵称不能为空' });
      return;
    }

    if (newNickname.length > 20) {
      showError({ title: '错误', message: '昵称不能超过20个字符' });
      return;
    }

    setSaving(true);
    try {
      if (token) {
        // 更新用户信息，获取新的 token
        const response = await updateCurrentUser(token, { nickname: newNickname.trim() });
        // 更新 Redux 中的 token 和用户信息
        dispatch(setToken(response.accessToken));
        dispatch(updateUser({ 
          nickname: response.nickname,
          email: response.email,
          phone: response.phone,
        }));
        showSuccess({ title: '成功', message: '昵称已更新' });
        setShowNicknameModal(false);
      }
    } catch (error: any) {
      showError({ title: '失败', message: error.message || '更新失败，请稍后重试' });
    } finally {
      setSaving(false);
    }
  };

  // 获取显示的账号信息
  const getAccountDisplay = () => {
    if (user?.phone) {
      // 隐藏手机号中间四位
      return user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    }
    if (user?.email) {
      return user.email;
    }
    return '未绑定';
  };

  const getAccountIcon = () => {
    if (user?.phone) return 'phone-portrait-outline';
    if (user?.email) return 'mail-outline';
    return 'person-outline';
  };

  const menuItems = [
    {
      icon: 'notifications-outline' as const,
      title: '通知设置',
      onPress: () => navigation.navigate('NotificationSettings'),
    },
    {
      icon: 'shield-outline' as const,
      title: '隐私与安全',
      onPress: () => navigation.navigate('PrivacyPolicy'),
    },
    {
      icon: 'help-circle-outline' as const,
      title: '帮助与反馈',
      onPress: () => navigation.navigate('HelpFeedback'),
    },
  ];

  return (
    <ScreenContainer backgroundColor={theme.colors.background}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.colors.surface }]}>
          {/* Avatar */}
          <LinearGradient
            colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Ionicons name="person" size={40} color={theme.colors.textWhite} />
          </LinearGradient>

          {/* Name with Edit Button */}
          <TouchableOpacity 
            style={styles.nicknameRow}
            onPress={handleEditNickname}
            activeOpacity={0.7}
          >
            <Text style={[styles.profileName, { color: theme.colors.textPrimary }]}>
              {user?.nickname || '点击设置昵称'}
            </Text>
            <Ionicons 
              name="pencil-outline" 
              size={16} 
              color={theme.colors.textTertiary} 
              style={styles.editIcon}
            />
          </TouchableOpacity>

          {/* Account Badge */}
          <View style={[styles.accountBadge, { backgroundColor: theme.colors.inputBackground }]}>
            <Ionicons 
              name={getAccountIcon() as any} 
              size={14} 
              color={theme.colors.textSecondary} 
            />
            <Text style={[styles.accountText, { color: theme.colors.textMuted }]}>
              {getAccountDisplay()}
            </Text>
          </View>
        </View>

        {/* Stats Card */}
        <View style={[styles.statsCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.statsHeader}>
            <Ionicons name="sparkles" size={16} color={theme.colors.primary} />
            <Text style={[styles.statsTitle, { color: theme.colors.textPrimary }]}>
              使用统计
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ paddingVertical: 20 }} />
          ) : (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                  {stats.total_analyses}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  分析次数
                </Text>
              </View>
              <View style={[styles.statItem, styles.statItemBorder, { borderColor: theme.colors.border }]}>
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                  {stats.healthy_conversations}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  健康对话
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                  {stats.needs_attention}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  需要关注
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Settings List */}
        <View style={[styles.menuCard, { backgroundColor: theme.colors.surface }]}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={item.onPress}
              activeOpacity={0.7}
              style={[
                styles.menuItem,
                index < menuItems.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.borderLight,
                },
              ]}
            >
              <View style={[styles.menuIcon, { backgroundColor: theme.colors.inputBackground }]}>
                <Ionicons name={item.icon} size={18} color={theme.colors.textMuted} />
              </View>
              <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>
                {item.title}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.7}
          style={[styles.logoutButton, { backgroundColor: theme.colors.surface }]}
        >
          <Ionicons name="log-out-outline" size={18} color={theme.colors.textSecondary} />
          <Text style={[styles.logoutText, { color: theme.colors.textSecondary }]}>
            退出登录
          </Text>
        </TouchableOpacity>

        {/* Version Info */}
        <Text style={[styles.versionText, { color: theme.colors.textTertiary }]}>
          Wavecho v1.0.0
        </Text>
      </ScrollView>

      {/* Nickname Edit Modal */}
      <Modal
        visible={showNicknameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNicknameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              修改昵称
            </Text>
            
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.colors.inputBackground,
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="请输入昵称"
              placeholderTextColor={theme.colors.textTertiary}
              value={newNickname}
              onChangeText={setNewNickname}
              maxLength={20}
              autoFocus
            />
            
            <Text style={[styles.modalHint, { color: theme.colors.textTertiary }]}>
              昵称最多20个字符
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton, { borderColor: theme.colors.border }]}
                onPress={() => setShowNicknameModal(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.textSecondary }]}>
                  取消
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton]}
                onPress={handleSaveNickname}
                activeOpacity={0.8}
                disabled={saving}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.modalSaveButton, saving && { opacity: 0.7 }]}
                >
                  <Text style={styles.modalSaveButtonText}>
                    {saving ? '保存中...' : '保存'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileCard: {
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nicknameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
  },
  editIcon: {
    marginLeft: 8,
  },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  accountText: {
    fontSize: 13,
  },
  statsCard: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statItemBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  menuCard: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
    fontSize: 15,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  logoutText: {
    fontSize: 15,
  },
  versionText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    ...INPUT_BASE_STYLE,
    fontSize: 15,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalHint: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalCancelButton: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  modalSaveButton: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  modalSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
