/**
 * Wavecho 间距系统
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  small: 8,
  medium: 10,  // rounded-[10px] for cards
  large: 20,   // rounded-[20px] for logo
  xl: 40,      // rounded-[40px] for screen frame
  full: 9999,
};

export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;

