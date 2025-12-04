/**
 * Wavecho 配色方案
 * 基于 Figma 设计 - 明亮蓝青色主题
 */

export const colors = {
  // 主色调 - Brand Colors (Cyan-Blue Gradient Theme)
  primary: '#06B6D4', // cyan-500
  primaryDark: '#0891B2', // cyan-600
  primaryLight: '#22D3EE', // cyan-400
  
  // 辅助色 - Secondary (Emerald for "对方")
  secondary: '#10B981', // emerald-500
  secondaryDark: '#059669', // emerald-600
  secondaryLight: '#34D399', // emerald-400

  // 渐变色端点
  gradientStart: '#22D3EE', // cyan-400
  gradientEnd: '#3B82F6', // blue-500

  // 风险提示颜色
  warning: '#FB923C', // orange-400
  warningLight: '#FDBA74', // orange-300
  
  // 背景色
  background: '#F8FAFC', // slate-50
  surface: '#FFFFFF', // white
  surfaceHover: '#F1F5F9', // slate-100
  
  // 输入框
  inputBackground: '#F1F5F9', // slate-100
  inputBackgroundFocus: '#E2E8F0', // slate-200
  
  // 文字颜色
  textPrimary: '#1E293B', // slate-800
  textSecondary: '#64748B', // slate-500
  textTertiary: '#94A3B8', // slate-400
  textMuted: '#475569', // slate-600
  textWhite: '#FFFFFF',
  
  // 边框
  border: '#E2E8F0', // slate-200
  borderLight: '#F1F5F9', // slate-100
  
  // 状态色
  success: '#10B981', // emerald-500
  danger: '#EF4444', // red-500
  info: '#3B82F6', // blue-500
  
  // 风险级别颜色
  riskSafe: '#10B981', // emerald-500 - 健康
  riskSafeBg: '#D1FAE5', // emerald-100
  riskLow: '#10B981', // emerald-500 - 低风险（绿色）
  riskLowBg: '#D1FAE5', // emerald-100
  riskMedium: '#FB923C', // orange-400 - 中风险（橙色）
  riskMediumBg: '#FFEDD5', // orange-100
  riskHigh: '#EF4444', // red-500 - 高风险（红色）
  riskHighBg: '#FEE2E2', // red-100
  
  // 透明度
  primaryAlpha10: 'rgba(6, 182, 212, 0.1)',
  primaryAlpha20: 'rgba(6, 182, 212, 0.2)',
  primaryAlpha30: 'rgba(6, 182, 212, 0.3)',
  secondaryAlpha10: 'rgba(16, 185, 129, 0.1)',
  secondaryAlpha20: 'rgba(16, 185, 129, 0.2)',
  
  // 阴影颜色
  shadowPrimary: 'rgba(6, 182, 212, 0.3)',
  shadowDefault: 'rgba(0, 0, 0, 0.1)',
};

export type Colors = typeof colors;
