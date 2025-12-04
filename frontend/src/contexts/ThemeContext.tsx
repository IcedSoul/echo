/**
 * 主题上下文
 * 提供全局主题配置（当前仅支持 Light Mode，预留 Dark Mode 结构）
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { theme, Theme } from '../theme';

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // MVP 阶段：仅支持 Light Mode
  const isDark = false;

  const value = {
    theme,
    isDark,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  
  return context;
};

