/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

/**
 * Standardized UI component dimensions and styles
 * Use these constants to ensure consistency across the app
 */
export const UI = {
  // Input styles
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  
  // Button styles
  button: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  
  // Common dimensions
  dimensions: {
    inputHeight: 48,
    buttonHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    smallBorderRadius: 8,
    largeBorderRadius: 16,
  },
  
  // Common colors
  colors: {
    border: '#E5E7EB',
    borderFocus: '#61d5b6',
    primary: '#61d5b6',
    secondary: '#4338CA',
    error: '#EF4444',
    disabled: '#9CA3AF',
    background: '#FFFFFF',
    backgroundLight: '#F9FAFB',
  },
};
