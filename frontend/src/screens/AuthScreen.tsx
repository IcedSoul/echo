import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAppDispatch } from '../store/hooks';
import { INPUT_BASE_STYLE } from '../components/Input';
import { loginSuccess } from '../store/slices/authSlice';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../types';
import { sendVerificationCode, verifyCodeAndLogin, isValidAccount, getAccountType } from '../api/auth';
import { Ionicons } from '@expo/vector-icons';
import { showSuccess, showError } from '../utils/toast';

type AuthScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Auth'>;

interface Props {
  navigation: AuthScreenNavigationProp;
}

export const AuthScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const dispatch = useAppDispatch();

  const [account, setAccount] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'account' | 'code'>('account');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [accountType, setAccountType] = useState<'phone' | 'email'>('phone');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleSendCode = async () => {
    if (!account || !isValidAccount(account)) {
      showError({ title: '错误', message: '请输入有效的手机号或邮箱地址' });
      return;
    }

    setLoading(true);
    try {
      const response = await sendVerificationCode(account);
      setAccountType(response.account_type);
      setStep('code');
      setCountdown(60);

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      const message = response.account_type === 'phone' 
        ? '验证码已发送到你的手机' 
        : '验证码已发送到你的邮箱';
      showSuccess({ title: '成功', message });
    } catch (error: any) {
      showError({ title: '失败', message: error.message || '请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      showError({ title: '错误', message: '请输入6位验证码' });
      return;
    }

    setLoading(true);
    try {
      const response = await verifyCodeAndLogin(account, code);

      // 从登录响应中获取完整的用户信息
      const userData = {
        userId: response.user_id,
        email: response.email,
        phone: response.phone,
        nickname: response.nickname,
        avatar: response.avatar,
        isAnonymous: false,
        createdAt: new Date().toISOString(),
      };

      // 使用 Redux dispatch 登录
      dispatch(loginSuccess({ user: userData, token: response.access_token }));

      showSuccess({
        title: response.is_new_user ? '欢迎' : '欢迎回来',
        message: response.is_new_user ? '注册成功！' : '登录成功！',
      });

      // 登录成功后，由于 Redux 状态变化，AppNavigator 会自动切换到 MainStack
      // 不需要手动导航
    } catch (error: any) {
      showError({ title: '验证失败', message: error.message || '验证码无效或已过期' });
    } finally {
      setLoading(false);
    }
  };

  // 根据输入内容动态判断类型并设置键盘类型
  const detectAccountType = (value: string): 'phone' | 'email' | 'unknown' => {
    if (/^1[3-9]\d{0,9}$/.test(value)) return 'phone';
    if (value.includes('@')) return 'email';
    return 'unknown';
  };

  const getKeyboardType = () => {
    const type = detectAccountType(account);
    if (type === 'phone') return 'phone-pad';
    if (type === 'email') return 'email-address';
    return 'default';
  };

  const getInputIcon = () => {
    const type = detectAccountType(account);
    if (type === 'phone') return 'phone-portrait-outline';
    if (type === 'email') return 'mail-outline';
    return 'person-outline';
  };

  return (
    <ScreenContainer backgroundColor={theme.colors.surface} safeAreaTop>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo & Title - Same position as WelcomeScreen */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/icon-2.png')}
              style={styles.logoImage}
            />
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              Wavecho
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              用回声，理解每段对话的真实含义
            </Text>
          </View>

          {/* Input Fields */}
          <View style={styles.inputContainer}>
            {step === 'account' ? (
              <>
                {/* Account Input */}
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name={getInputIcon() as any}
                    size={18}
                    color={theme.colors.textTertiary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.inputBackground,
                        color: theme.colors.textPrimary,
                      },
                    ]}
                    placeholder="手机号或邮箱"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={account}
                    onChangeText={setAccount}
                    keyboardType={getKeyboardType()}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Hint text */}
                <Text style={[styles.hintText, { color: theme.colors.textTertiary }]}>
                  支持手机号码或邮箱地址登录
                </Text>

                {/* Send Code Button */}
                <TouchableOpacity
                  onPress={handleSendCode}
                  activeOpacity={0.8}
                  disabled={loading}
                  style={styles.gradientButtonWrapper}
                >
                  <LinearGradient
                    colors={[theme.colors.primary, theme.colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.gradientButton, loading && styles.buttonDisabled]}
                  >
                    <Text style={styles.gradientButtonText}>
                      {loading ? '发送中...' : '获取验证码'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Back to Welcome */}
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.8}
                  style={styles.textButton}
                >
                  <Text style={[styles.textButtonText, { color: theme.colors.primary }]}>
                    返回
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Show account */}
                <Text style={[styles.accountHint, { color: theme.colors.textSecondary }]}>
                  验证码已发送至 {account}
                </Text>

                {/* Code Input */}
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="key-outline"
                    size={18}
                    color={theme.colors.textTertiary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.inputBackground,
                        color: theme.colors.textPrimary,
                      },
                    ]}
                    placeholder="输入6位验证码"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>

                {/* Verify Button */}
                <TouchableOpacity
                  onPress={handleVerifyCode}
                  activeOpacity={0.8}
                  disabled={loading}
                  style={styles.gradientButtonWrapper}
                >
                  <LinearGradient
                    colors={[theme.colors.primary, theme.colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.gradientButton, loading && styles.buttonDisabled]}
                  >
                    <Text style={styles.gradientButtonText}>
                      {loading ? '验证中...' : '登录'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Resend & Change Account */}
                <View style={styles.linkRow}>
                  <TouchableOpacity
                    onPress={handleSendCode}
                    disabled={countdown > 0 || loading}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.linkText,
                        {
                          color: countdown > 0 ? theme.colors.textTertiary : theme.colors.primary,
                        },
                      ]}
                    >
                      {countdown > 0 ? `重新发送 (${countdown}s)` : '重新发送'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setStep('account')} activeOpacity={0.8}>
                    <Text style={[styles.linkText, { color: theme.colors.primary }]}>
                      更换账号
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Disclaimer */}
          <View style={styles.disclaimerContainer}>
            <Text style={[styles.disclaimer, { color: theme.colors.textTertiary }]}>
              登录即表示你同意我们的
            </Text>
            <TouchableOpacity onPress={() => setShowTermsModal(true)} activeOpacity={0.7}>
              <Text style={[styles.disclaimerLink, { color: theme.colors.primary }]}>
                服务条款
              </Text>
            </TouchableOpacity>
            <Text style={[styles.disclaimer, { color: theme.colors.textTertiary }]}>和</Text>
            <TouchableOpacity onPress={() => setShowPrivacyModal(true)} activeOpacity={0.7}>
              <Text style={[styles.disclaimerLink, { color: theme.colors.primary }]}>
                隐私政策
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* 服务条款 Modal */}
      <Modal
        visible={showTermsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                服务条款
              </Text>
              <TouchableOpacity onPress={() => setShowTermsModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalSectionTitle, { color: theme.colors.textPrimary }]}>
                1. 服务说明
              </Text>
              <Text style={[styles.modalText, { color: theme.colors.textSecondary }]}>
                Wavecho 是一款智能对话分析应用，旨在帮助用户理解对话中的情绪和需求，提供沟通建议。本服务仅供参考，不构成专业心理咨询或法律建议。
              </Text>

              <Text style={[styles.modalSectionTitle, { color: theme.colors.textPrimary }]}>
                2. 用户责任
              </Text>
              <Text style={[styles.modalText, { color: theme.colors.textSecondary }]}>
                用户应确保提交的对话内容真实、合法，不包含违法、侵权或有害信息。用户对其提交的内容负全部责任。
              </Text>

              <Text style={[styles.modalSectionTitle, { color: theme.colors.textPrimary }]}>
                3. 知识产权
              </Text>
              <Text style={[styles.modalText, { color: theme.colors.textSecondary }]}>
                Wavecho 及其所有相关内容的知识产权归我们所有。未经授权，禁止复制、修改或分发本应用的任何部分。
              </Text>

              <Text style={[styles.modalSectionTitle, { color: theme.colors.textPrimary }]}>
                4. 免责声明
              </Text>
              <Text style={[styles.modalText, { color: theme.colors.textSecondary }]}>
                分析结果由 AI 生成，仅供参考。我们不对分析结果的准确性或适用性做任何保证。用户应根据实际情况自行判断和决策。
              </Text>

              <Text style={[styles.modalSectionTitle, { color: theme.colors.textPrimary }]}>
                5. 服务变更
              </Text>
              <Text style={[styles.modalText, { color: theme.colors.textSecondary }]}>
                我们保留随时修改、暂停或终止服务的权利，届时会通过应用内通知或其他方式告知用户。
              </Text>

              <Text style={[styles.modalFooterText, { color: theme.colors.textTertiary }]}>
                最后更新：2025年1月1日
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 隐私政策 Modal */}
      <Modal
        visible={showPrivacyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                隐私政策
              </Text>
              <TouchableOpacity onPress={() => setShowPrivacyModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalSectionTitle, { color: theme.colors.textPrimary }]}>
                1. 信息收集
              </Text>
              <Text style={[styles.modalText, { color: theme.colors.textSecondary }]}>
                我们仅收集您主动提供的信息，包括：手机号或邮箱（用于账户登录）、您提交分析的对话内容、您设置的昵称等个人资料。
              </Text>

              <Text style={[styles.modalSectionTitle, { color: theme.colors.textPrimary }]}>
                2. 信息使用
              </Text>
              <Text style={[styles.modalText, { color: theme.colors.textSecondary }]}>
                收集的信息仅用于：提供对话分析服务、改进服务质量、发送重要通知。我们不会将您的信息用于广告推送或出售给第三方。
              </Text>

              <Text style={[styles.modalSectionTitle, { color: theme.colors.textPrimary }]}>
                3. 信息存储
              </Text>
              <Text style={[styles.modalText, { color: theme.colors.textSecondary }]}>
                您的数据存储在安全的云服务器上，采用行业标准的加密技术保护。您的对话内容在传输和存储过程中均经过加密处理。
              </Text>

              <Text style={[styles.modalSectionTitle, { color: theme.colors.textPrimary }]}>
                4. 信息共享
              </Text>
              <Text style={[styles.modalText, { color: theme.colors.textSecondary }]}>
                除非法律要求或经您明确同意，我们不会与任何第三方共享您的个人信息或对话内容。
              </Text>

              <Text style={[styles.modalSectionTitle, { color: theme.colors.textPrimary }]}>
                5. 您的权利
              </Text>
              <Text style={[styles.modalText, { color: theme.colors.textSecondary }]}>
                您有权访问、更正或删除您的个人信息。您可以随时在应用内删除历史记录，或联系我们删除账户及所有相关数据。
              </Text>

              <Text style={[styles.modalFooterText, { color: theme.colors.textTertiary }]}>
                最后更新：2025年1月1日
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    paddingVertical: 48,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  inputContainer: {
    gap: 12,
    marginBottom: 24,
  },
  accountHint: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  hintText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: -4,
  },
  inputWrapper: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 15,
    zIndex: 1,
  },
  input: {
    ...INPUT_BASE_STYLE,
    paddingLeft: 48,
    paddingRight: 16,
    borderRadius: 10,
  },
  gradientButtonWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  gradientButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  gradientButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  textButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  textButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  linkText: {
    fontSize: 14,
  },
  disclaimerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 24,
  },
  disclaimer: {
    fontSize: 12,
  },
  disclaimerLink: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalScrollView: {
    padding: 20,
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 22,
  },
  modalFooterText: {
    fontSize: 12,
    marginTop: 24,
    textAlign: 'center',
  },
});
