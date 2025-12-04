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
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

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
    height: 48,
    borderRadius: 10,
    paddingRight: 16,
    paddingVertical: 0,
    fontSize: 14,
    textAlignVertical: 'center',
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});
