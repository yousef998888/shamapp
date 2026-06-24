/**
 * RTL (Right-to-Left) Utilities
 * Helper functions for RTL-aware styling and layout
 */

import { I18nManager } from 'react-native';

/**
 * Check if the app is currently in RTL mode
 */
export const isRTL = (): boolean => {
  return I18nManager.isRTL;
};

/**
 * Get flexDirection based on RTL mode
 * @param reverse - If true, reverses the direction
 */
export const flexDirection = (reverse: boolean = false): 'row' | 'row-reverse' => {
  const rtl = I18nManager.isRTL;
  if (reverse) {
    return rtl ? 'row' : 'row-reverse';
  }
  return rtl ? 'row-reverse' : 'row';
};

/**
 * Get text alignment based on RTL mode
 */
export const textAlign = (): 'left' | 'right' => {
  return I18nManager.isRTL ? 'right' : 'left';
};

/**
 * Get opposite text alignment based on RTL mode
 */
export const textAlignOpposite = (): 'left' | 'right' => {
  return I18nManager.isRTL ? 'left' : 'right';
};

/**
 * Get margin/padding for left side (RTL-aware)
 * In RTL, left becomes right
 */
export const marginStart = (value: number) => {
  return { [I18nManager.isRTL ? 'marginRight' : 'marginLeft']: value };
};

/**
 * Get margin/padding for right side (RTL-aware)
 * In RTL, right becomes left
 */
export const marginEnd = (value: number) => {
  return { [I18nManager.isRTL ? 'marginLeft' : 'marginRight']: value };
};

/**
 * Get padding for left side (RTL-aware)
 */
export const paddingStart = (value: number) => {
  return { [I18nManager.isRTL ? 'paddingRight' : 'paddingLeft']: value };
};

/**
 * Get padding for right side (RTL-aware)
 */
export const paddingEnd = (value: number) => {
  return { [I18nManager.isRTL ? 'paddingLeft' : 'paddingRight']: value };
};

/**
 * Get position for left side (RTL-aware)
 */
export const positionStart = (value: number) => {
  return { [I18nManager.isRTL ? 'right' : 'left']: value };
};

/**
 * Get position for right side (RTL-aware)
 */
export const positionEnd = (value: number) => {
  return { [I18nManager.isRTL ? 'left' : 'right']: value };
};

/**
 * Transform value for RTL (e.g., for animations)
 * Multiplies by -1 in RTL mode
 */
export const transformRTL = (value: number): number => {
  return I18nManager.isRTL ? -value : value;
};

/**
 * Get border radius for corners (RTL-aware)
 */
export const borderRadiusStart = (top: number, bottom: number) => {
  if (I18nManager.isRTL) {
    return {
      borderTopRightRadius: top,
      borderBottomRightRadius: bottom,
    };
  }
  return {
    borderTopLeftRadius: top,
    borderBottomLeftRadius: bottom,
  };
};

export const borderRadiusEnd = (top: number, bottom: number) => {
  if (I18nManager.isRTL) {
    return {
      borderTopLeftRadius: top,
      borderBottomLeftRadius: bottom,
    };
  }
  return {
    borderTopRightRadius: top,
    borderBottomRightRadius: bottom,
  };
};

/**
 * Example usage in components:
 * 
 * import { flexDirection, textAlign, marginStart } from '@/utils/rtl';
 * 
 * <View style={{ flexDirection: flexDirection() }}>
 *   <Text style={{ textAlign: textAlign() }}>Hello</Text>
 *   <View style={marginStart(10)}>
 *     {/* This will have marginLeft: 10 in LTR, marginRight: 10 in RTL *\/}
 *   </View>
 * </View>
 */

