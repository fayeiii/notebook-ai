/**
 * Apple 风格主题配置
 * 简约、清爽的 iOS 设计语言
 */

export const Colors = {
  // 主色调 - iOS 蓝
  primary: '#007AFF',
  primaryLight: '#4DA2FF',

  // 系统色
  systemRed: '#FF3B30',
  systemOrange: '#FF9500',
  systemYellow: '#FFCC00',
  systemGreen: '#34C759',
  systemTeal: '#5AC8FA',
  systemIndigo: '#5856D6',
  systemPurple: '#AF52DE',
  systemPink: '#FF2D55',

  // 灰度
  white: '#FFFFFF',
  background: '#F2F2F7',
  secondaryBackground: '#FFFFFF',
  tertiaryBackground: '#F2F2F7',
  groupedBackground: '#F2F2F7',
  secondaryGroupedBackground: '#FFFFFF',

  // 文字
  label: '#000000',
  secondaryLabel: '#3C3C43',
  tertiaryLabel: '#3C3C4399',
  quaternaryLabel: '#3C3C432E',
  placeholderText: '#3C3C434D',

  // 分割线
  separator: '#3C3C4349',
  opaqueSeparator: '#C6C6C8',

  // 填充色
  systemFill: '#78788033',
  secondarySystemFill: '#78788029',
  tertiarySystemFill: '#7676801F',

  // 文件夹预设颜色
  folderColors: [
    '#007AFF', // 蓝
    '#FF9500', // 橙
    '#34C759', // 绿
    '#FF3B30', // 红
    '#AF52DE', // 紫
    '#5AC8FA', // 青
    '#FF2D55', // 粉
    '#FFCC00', // 黄
  ],
};

export const Typography = {
  // Apple SF 系列字体
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  sizes: {
    largeTitle: 34,
    title1: 28,
    title2: 22,
    title3: 20,
    headline: 17,
    body: 17,
    callout: 16,
    subhead: 15,
    footnote: 13,
    caption1: 12,
    caption2: 11,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 999,
};

export const Shadow = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
};
