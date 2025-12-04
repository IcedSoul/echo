/**
 * 自定义 Toast 配置
 * 与应用主题适配的现代化弹窗样式
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseToastProps } from 'react-native-toast-message';
import { colors } from '../../theme/colors';

const { width } = Dimensions.get('window');

interface CustomToastProps extends BaseToastProps {
  text1?: string;
  text2?: string;
  onPress?: () => void;
  hide?: () => void;
}

// 成功 Toast
const SuccessToast: React.FC<CustomToastProps> = ({ text1, text2, hide }) => (
  <TouchableOpacity
    activeOpacity={0.9}
    onPress={hide}
    style={[styles.container, styles.successContainer]}
  >
    <View style={[styles.iconWrapper, styles.successIcon]}>
      <Ionicons name="checkmark-circle" size={24} color={colors.success} />
    </View>
    <View style={styles.textContainer}>
      {text1 && <Text style={styles.title}>{text1}</Text>}
      {text2 && <Text style={styles.message}>{text2}</Text>}
    </View>
    <TouchableOpacity onPress={hide} style={styles.closeButton}>
      <Ionicons name="close" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  </TouchableOpacity>
);

// 错误 Toast
const ErrorToast: React.FC<CustomToastProps> = ({ text1, text2, hide }) => (
  <TouchableOpacity
    activeOpacity={0.9}
    onPress={hide}
    style={[styles.container, styles.errorContainer]}
  >
    <View style={[styles.iconWrapper, styles.errorIcon]}>
      <Ionicons name="alert-circle" size={24} color={colors.danger} />
    </View>
    <View style={styles.textContainer}>
      {text1 && <Text style={styles.title}>{text1}</Text>}
      {text2 && <Text style={styles.message}>{text2}</Text>}
    </View>
    <TouchableOpacity onPress={hide} style={styles.closeButton}>
      <Ionicons name="close" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  </TouchableOpacity>
);

// 信息 Toast
const InfoToast: React.FC<CustomToastProps> = ({ text1, text2, hide }) => (
  <TouchableOpacity
    activeOpacity={0.9}
    onPress={hide}
    style={[styles.container, styles.infoContainer]}
  >
    <View style={[styles.iconWrapper, styles.infoIcon]}>
      <Ionicons name="information-circle" size={24} color={colors.primary} />
    </View>
    <View style={styles.textContainer}>
      {text1 && <Text style={styles.title}>{text1}</Text>}
      {text2 && <Text style={styles.message}>{text2}</Text>}
    </View>
    <TouchableOpacity onPress={hide} style={styles.closeButton}>
      <Ionicons name="close" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  </TouchableOpacity>
);

// 警告 Toast
const WarningToast: React.FC<CustomToastProps> = ({ text1, text2, hide }) => (
  <TouchableOpacity
    activeOpacity={0.9}
    onPress={hide}
    style={[styles.container, styles.warningContainer]}
  >
    <View style={[styles.iconWrapper, styles.warningIcon]}>
      <Ionicons name="warning" size={24} color={colors.warning} />
    </View>
    <View style={styles.textContainer}>
      {text1 && <Text style={styles.title}>{text1}</Text>}
      {text2 && <Text style={styles.message}>{text2}</Text>}
    </View>
    <TouchableOpacity onPress={hide} style={styles.closeButton}>
      <Ionicons name="close" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  </TouchableOpacity>
);

// Toast 配置
export const toastConfig = {
  success: (props: CustomToastProps) => <SuccessToast {...props} />,
  error: (props: CustomToastProps) => <ErrorToast {...props} />,
  info: (props: CustomToastProps) => <InfoToast {...props} />,
  warning: (props: CustomToastProps) => <WarningToast {...props} />,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: width - 32,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
  },
  successContainer: {
    borderColor: 'rgba(16, 185, 129, 0.2)',
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    borderColor: 'rgba(239, 68, 68, 0.2)',
    backgroundColor: '#FFFFFF',
  },
  infoContainer: {
    borderColor: 'rgba(6, 182, 212, 0.2)',
    backgroundColor: '#FFFFFF',
  },
  warningContainer: {
    borderColor: 'rgba(251, 146, 60, 0.2)',
    backgroundColor: '#FFFFFF',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  successIcon: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  errorIcon: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  infoIcon: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  warningIcon: {
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});

