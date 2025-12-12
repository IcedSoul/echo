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
  Image,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { INPUT_BASE_STYLE } from '../components/Input';
import { logout, updateUser, setToken } from '../store/slices/authSlice';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../types';
import { getUserStats, updateCurrentUser, getCurrentUser, UserUsageStats } from '../api/auth';
import { Ionicons } from '@expo/vector-icons';
import { showSuccess, showError } from '../utils/toast';
import { API_BASE_URL } from '../config/api';

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
  const [stats, setStats] = useState<UserUsageStats>({
    conflict_analysis_used: 0,
    conflict_analysis_limit: 10,
    conflict_analysis_remaining: 10,
    situation_judge_used: 0,
    situation_judge_limit: 10,
    situation_judge_remaining: 10,
    expression_helper_used: 0,
    expression_helper_limit: 10,
    expression_helper_remaining: 10,
    ai_chat_used: 0,
    ai_chat_limit: 20,
    ai_chat_remaining: 20,
    user_level: 'free',
  });
  const [loading, setLoading] = useState(true);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
            avatar: userData.avatar,
          }));
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    }
    setLoading(false);
  };

  const handleChangeAvatar = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        showError({ title: '权限提示', message: '需要访问相册权限才能更换头像' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        setUploadingAvatar(true);

        // 压缩和调整图片
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 400 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        // 使用 FormData 上传图片
        const formData = new FormData();
        formData.append('avatar', {
          uri: manipResult.uri,
          type: 'image/jpeg',
          name: 'avatar.jpg',
        } as any);

        // 上传头像
        if (token) {
          const response = await fetch(`${API_BASE_URL}/auth/avatar`, {
            method: 'POST',
            body: formData,
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData?.error?.message || '上传头像失败');
          }

          const data = await response.json();

          // 更新 Redux 中的 token 和用户信息
          dispatch(setToken(data.access_token));
          dispatch(updateUser({
            nickname: data.nickname,
            email: data.email,
            phone: data.phone,
            avatar: data.avatar,
          }));

          showSuccess({ title: '成功', message: '头像已更新' });
        }
      }
    } catch (error: any) {
      console.error('Failed to change avatar:', error);
      showError({ title: '失败', message: error.message || '更换头像失败，请稍后重试' });
    } finally {
      setUploadingAvatar(false);
    }
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
          avatar: response.avatar,
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
          <TouchableOpacity
            onPress={handleChangeAvatar}
            activeOpacity={0.8}
            disabled={uploadingAvatar}
          >
            {user?.avatar ? (
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: user.avatar }}
                  style={styles.avatarImage}
                />
                {uploadingAvatar && (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator color="#FFF" />
                  </View>
                )}
                <View style={[styles.editBadge, { backgroundColor: theme.colors.primary }]}>
                  <Ionicons name="camera" size={14} color="#FFF" />
                </View>
              </View>
            ) : (
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatar}
                >
                  {uploadingAvatar ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Ionicons name="person" size={40} color={theme.colors.textWhite} />
                  )}
                </LinearGradient>
                <View style={[styles.editBadge, { backgroundColor: theme.colors.primary }]}>
                  <Ionicons name="camera" size={14} color="#FFF" />
                </View>
              </View>
            )}
          </TouchableOpacity>

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
            <View style={styles.statsContainer}>
              {/* 冲突复盘 */}
              <View style={styles.usageItem}>
                <View style={styles.usageHeader}>
                  <Ionicons name="people-outline" size={18} color={theme.colors.textSecondary} />
                  <Text style={[styles.usageLabel, { color: theme.colors.textPrimary }]}>
                    冲突复盘
                  </Text>
                </View>
                <View style={styles.usageInfo}>
                  <Text style={[styles.usageText, { color: theme.colors.textSecondary }]}>
                    {stats.conflict_analysis_used}/{stats.conflict_analysis_limit}
                  </Text>
                  <Text style={[styles.usageRemaining, { color: theme.colors.textTertiary }]}>
                    剩余 {stats.conflict_analysis_remaining} 次
                  </Text>
                </View>
              </View>

              {/* 情况评理 */}
              <View style={styles.usageItem}>
                <View style={styles.usageHeader}>
                  <Ionicons name="scale-outline" size={18} color={theme.colors.textSecondary} />
                  <Text style={[styles.usageLabel, { color: theme.colors.textPrimary }]}>
                    情况评理
                  </Text>
                </View>
                <View style={styles.usageInfo}>
                  <Text style={[styles.usageText, { color: theme.colors.textSecondary }]}>
                    {stats.situation_judge_used}/{stats.situation_judge_limit}
                </Text>
                  <Text style={[styles.usageRemaining, { color: theme.colors.textTertiary }]}>
                    剩余 {stats.situation_judge_remaining} 次
                </Text>
                </View>
              </View>

              {/* 表达助手 */}
              <View style={styles.usageItem}>
                <View style={styles.usageHeader}>
                  <Ionicons name="chatbubble-outline" size={18} color={theme.colors.textSecondary} />
                  <Text style={[styles.usageLabel, { color: theme.colors.textPrimary }]}>
                    表达助手
                  </Text>
                </View>
                <View style={styles.usageInfo}>
                  <Text style={[styles.usageText, { color: theme.colors.textSecondary }]}>
                    {stats.expression_helper_used}/{stats.expression_helper_limit}
                </Text>
                  <Text style={[styles.usageRemaining, { color: theme.colors.textTertiary }]}>
                    剩余 {stats.expression_helper_remaining} 次
                </Text>
                </View>
              </View>

              {/* AI对话 */}
              <View style={styles.usageItem}>
                <View style={styles.usageHeader}>
                  <Ionicons name="sparkles-outline" size={18} color={theme.colors.textSecondary} />
                  <Text style={[styles.usageLabel, { color: theme.colors.textPrimary }]}>
                    AI对话
                  </Text>
                </View>
                <View style={styles.usageInfo}>
                  <Text style={[styles.usageText, { color: theme.colors.textSecondary }]}>
                    {stats.ai_chat_used}/{stats.ai_chat_limit}
                </Text>
                  <Text style={[styles.usageRemaining, { color: theme.colors.textTertiary }]}>
                    剩余 {stats.ai_chat_remaining} 次
                </Text>
                </View>
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
  avatarContainer: {
    width: 80,
    height: 80,
    marginBottom: 12,
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
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
  statsContainer: {
    gap: 12,
  },
  usageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  usageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  usageLabel: {
    fontSize: 14,
  },
  usageInfo: {
    alignItems: 'flex-end',
  },
  usageText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  usageRemaining: {
    fontSize: 11,
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
