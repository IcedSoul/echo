/**
 * 通用输入框组件
 */

import React from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

/**
 * 全局统一的单行输入框基础样式
 * 通过 height = lineHeight 实现文本垂直居中
 */
export const INPUT_BASE_STYLE: TextStyle = {
  height: 48,
  lineHeight: 48,
  fontSize: 14,
  padding: 0,
  paddingTop: 5,
  textAlignVertical: 'center',
};

/**
 * 小尺寸输入框基础样式（如搜索框）
 */
export const INPUT_SMALL_STYLE: TextStyle = {
  height: 40,
  lineHeight: 40,
  fontSize: 14,
  padding: 0,
  paddingTop: 5,
  textAlignVertical: 'center',
};

/**
 * 聊天输入框样式（多行，底部对齐）
 */
export const INPUT_CHAT_STYLE: TextStyle = {
  fontSize: 15,
  lineHeight: 22,
  minHeight: 40,
  maxHeight: 100,
  padding: 0,
  paddingTop: 5,
  textAlignVertical: 'center',
};

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  style,
  icon,
  ...props
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>
          {label}
        </Text>
      )}
      <View style={styles.inputWrapper}>
        {icon && (
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={18} color={theme.colors.textTertiary} />
          </View>
        )}
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.inputBackground,
              color: theme.colors.textPrimary,
              paddingLeft: icon ? 48 : 16,
              borderColor: error ? theme.colors.danger : 'transparent',
              borderWidth: error ? 1 : 0,
            },
            style,
          ]}
          placeholderTextColor={theme.colors.textTertiary}
          {...props}
        />
      </View>
      {error && (
        <Text style={[styles.error, { color: theme.colors.danger }]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
  },
  iconContainer: {
    position: 'absolute',
    left: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  input: {
    ...INPUT_BASE_STYLE,
    borderRadius: 10,
    paddingRight: 16,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});
