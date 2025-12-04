/**
 * Wavecho 主题导出
 */

import { colors } from './colors';
import { typography } from './typography';
import { spacing, borderRadius } from './spacing';

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
};

export type Theme = typeof theme;

export * from './colors';
export * from './typography';
export * from './spacing';

