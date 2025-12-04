/**
 * Toast 工具函数
 * 封装 react-native-toast-message 的常用方法
 */

import Toast from 'react-native-toast-message';

interface ToastOptions {
  title: string;
  message?: string;
  duration?: number;
  onPress?: () => void;
}

/**
 * 显示成功提示
 */
export const showSuccess = ({ title, message, duration = 3000, onPress }: ToastOptions) => {
  Toast.show({
    type: 'success',
    text1: title,
    text2: message,
    visibilityTime: duration,
    onPress,
  });
};

/**
 * 显示错误提示
 */
export const showError = ({ title, message, duration = 4000, onPress }: ToastOptions) => {
  Toast.show({
    type: 'error',
    text1: title,
    text2: message,
    visibilityTime: duration,
    onPress,
  });
};

/**
 * 显示信息提示
 */
export const showInfo = ({ title, message, duration = 3000, onPress }: ToastOptions) => {
  Toast.show({
    type: 'info',
    text1: title,
    text2: message,
    visibilityTime: duration,
    onPress,
  });
};

/**
 * 显示警告提示
 */
export const showWarning = ({ title, message, duration = 3500, onPress }: ToastOptions) => {
  Toast.show({
    type: 'warning',
    text1: title,
    text2: message,
    visibilityTime: duration,
    onPress,
  });
};

/**
 * 隐藏当前 Toast
 */
export const hideToast = () => {
  Toast.hide();
};

