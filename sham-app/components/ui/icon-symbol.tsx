// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Partial<Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // House/Home icons
  'house': 'home',
  'house.fill': 'home',

  // Search icons
  'magnifyingglass': 'search',
  'magnifyingglass.fill': 'search',

  // Chat/Bubble icons
  'bubble.left': 'chat-bubble-outline',
  'bubble.left.fill': 'chat-bubble',
  'message.fill': 'message',

  // Person/Profile icons
  'person': 'person-outline',
  'person.fill': 'person',

  // Camera/Photo icons
  'camera': 'camera-alt',
  'camera.fill': 'camera-alt',
  'photo': 'image',
  'photo.fill': 'image',

  // Navigation/Arrow icons
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  'chevron.down': 'keyboard-arrow-down',
  'chevron.up': 'keyboard-arrow-up',
  'arrow.left': 'arrow-back',
  'arrow.right': 'arrow-forward',
  'arrow.up': 'arrow-upward',

  // Action icons
  'plus': 'add',
  'minus': 'remove',
  'xmark': 'close',
  'xmark.circle.fill': 'highlight-off',
  'checkmark': 'check',
  'checkmark.circle': 'check-circle-outline',
  'checkmark.circle.fill': 'check-circle',
  'pencil': 'edit',

  // Shopping/Bag icons
  'bag.fill': 'shopping-bag',
  'square.stack.3d.up': 'view-module',
  'square.stack.3d.up.fill': 'view-module',

  // Heart/Favorite icons
  'heart.fill': 'favorite',

  // Location icons
  'location': 'location-on',
  'location.fill': 'location-on',
  'mappin.circle.fill': 'place',

  // Star/Rating icons
  'star.fill': 'star',

  // Shield/Security icons
  'shield.fill': 'security',

  // Globe/Language icons
  'globe': 'language',

  // Sign out icons
  'rectangle.portrait.and.arrow.right': 'logout',

  // Eye/Visibility icons
  'eye': 'visibility',
  'eye.fill': 'visibility',

  // Ellipsis/Menu icons
  'ellipsis': 'more-horiz',

  // Tag icons
  'tag': 'local-offer',

  // Money/Currency icons
  'dollarsign.circle': 'attach-money',

  // Number icons
  'number': 'pin',

  // Shipping icons
  'shippingbox': 'local-shipping',

  // Square/Grid icons
  'square.and.arrow.up': 'share',
  'square.grid.3x3.fill': 'apps',

  // Ruler/Measurement icons
  'ruler': 'straighten',
  'scalemass': 'fitness-center',

  // Info icons
  'info.circle': 'info',

  // Other icons
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const iconName = MAPPING[name];

  // Fallback if icon mapping is missing
  if (!iconName) {
    console.warn(`IconSymbol: No mapping found for icon "${name}". Using 'help-outline' as fallback.`);
    return <MaterialIcons color={color} size={size} name="help-outline" style={style} />;
  }

  return <MaterialIcons color={color} size={size} name={iconName} style={style} />;
}
