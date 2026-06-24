import React from 'react';
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import CategoryService from '@/services/CategoryService';
import type { Category } from '@/types/database';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// Icon mapping - map category names to local assets
const ICON_MAP: Record<string, any> = {
  Electronics: require('@/assets/images/electronics.png'),
  Furniture: require('@/assets/images/furniture.png'),
  'Health & Beauty': require('@/assets/images/health.png'),
  Health: require('@/assets/images/health.png'),
  Beauty: require('@/assets/images/health.png'),
  'Home Fragrances': require('@/assets/images/perfume.png'),
  'Home & Garden': require('@/assets/images/home.png'),
  'Apparel & Accessories': require('@/assets/images/appreal.png'),
  mens: require('@/assets/images/mens.png'),
  womens: require('@/assets/images/women.png'),
};

// Hardcoded categories that don't exist in DB yet
const ADDITIONAL_CATEGORIES = [
  { id: 'mens', name: "Men's", slug: 'mens' },
  { id: 'womens', name: "Women's", slug: 'womens' },
];

const DEFAULT_ITEM_WIDTH = 80;
const DEFAULT_ITEM_HEIGHT = 96;
const DEFAULT_ICON_CONTAINER_SIZE = 64;
const DEFAULT_ICON_IMAGE_SIZE = 40;
const ICON_MARGIN_BOTTOM = 8;
const DEFAULT_ICON_TOP = 0;
const DEFAULT_ICON_LEFT = (DEFAULT_ITEM_WIDTH - DEFAULT_ICON_CONTAINER_SIZE) / 2;
const DEFAULT_LABEL_Y = DEFAULT_ICON_CONTAINER_SIZE + ICON_MARGIN_BOTTOM;

const COMPACT_ICON_CONTAINER_SIZE = 40;
const COMPACT_ICON_IMAGE_SIZE = 28;
const COMPACT_PADDING_HORIZONTAL = 8;
const COMPACT_PADDING_VERTICAL = 4;
const COMPACT_ICON_MARGIN_RIGHT = 10;
const COMPACT_ICON_LEFT = COMPACT_PADDING_HORIZONTAL;
const COMPACT_ICON_TOP = COMPACT_PADDING_VERTICAL;
const COMPACT_LABEL_LEFT =
  COMPACT_ICON_LEFT + COMPACT_ICON_CONTAINER_SIZE + COMPACT_ICON_MARGIN_RIGHT;
const LABEL_LINE_HEIGHT = 18;
const COMPACT_LABEL_Y =
  COMPACT_PADDING_VERTICAL +
  (COMPACT_ICON_CONTAINER_SIZE - LABEL_LINE_HEIGHT) / 2;
const COMPACT_ITEM_HEIGHT =
  COMPACT_PADDING_VERTICAL * 2 + COMPACT_ICON_CONTAINER_SIZE;
const CONTAINER_BORDER_RADIUS_START = 0;
const CONTAINER_BORDER_RADIUS_END = 999;

type HorizontalCategoriesProps = {
  onCategoryPress?: (categoryId: string) => void;
  variant?: 'default' | 'compact' | 'sticky';
  scrollY?: Animated.Value;
  transitionConfig?: {
    morphStart?: number;
    morphEnd?: number;
  };
};

const DEFAULT_TRANSITION_CONFIG = {
  morphStart: 540,
  morphEnd: 640,
};

export default function HorizontalCategories({
  onCategoryPress,
  variant = 'default',
  scrollY,
  transitionConfig,
}: HorizontalCategoriesProps) {
  const isCompactVariant = variant === 'compact';
  const isStickyVariant = variant === 'sticky';
  const { morphStart, morphEnd } = {
    ...DEFAULT_TRANSITION_CONFIG,
    ...transitionConfig,
  };

  // Fetch categories from database
  const { data: dbCategories = [] } = useQuery<Category[], Error>({
    queryKey: ['categories'],
    queryFn: CategoryService.fetchCategories,
  });

  // Get top level categories only
  const topLevelCategories = React.useMemo(() => {
    return dbCategories.filter((cat) => !cat.parent_id).slice(0, 10);
  }, [dbCategories]);

  // Combine DB categories with additional categories
  const allCategories = React.useMemo(() => {
    const dbMapped = topLevelCategories.map((cat) => ({
      ...cat,
      icon: ICON_MAP[cat.name] || null,
    }));

    const additionalMapped = ADDITIONAL_CATEGORIES.map((cat) => ({
      ...cat,
      icon: ICON_MAP[cat.slug],
    }));

    return [...dbMapped, ...additionalMapped];
  }, [topLevelCategories]);

  const fallbackProgress = React.useRef(
    new Animated.Value(isCompactVariant ? 1 : 0)
  ).current;

  React.useEffect(() => {
    if (!isStickyVariant) {
      fallbackProgress.setValue(isCompactVariant ? 1 : 0);
    }
  }, [fallbackProgress, isCompactVariant, isStickyVariant]);

  const transitionProgress = React.useMemo(() => {
    if (!isStickyVariant || !scrollY) return undefined;
    return scrollY.interpolate({
      inputRange: [morphStart, morphEnd],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
  }, [isStickyVariant, morphEnd, morphStart, scrollY]);

  const [isCompactActive, setIsCompactActive] = React.useState(isCompactVariant);
  const [labelWidths, setLabelWidths] = React.useState<Record<string, number>>({});
  const handleLabelLayout = React.useCallback(
    (categoryId: string, width: number) => {
      setLabelWidths((prev) => {
        if (prev[categoryId] === width) {
          return prev;
        }
        return {
          ...prev,
          [categoryId]: width,
        };
      });
    },
    []
  );

  React.useEffect(() => {
    if (!isStickyVariant || !scrollY) {
      setIsCompactActive(isCompactVariant);
      return;
    }

    const midPoint = morphStart + (morphEnd - morphStart) * 0.6;
    const listenerId = scrollY.addListener(({ value }) => {
      const shouldCompact = value >= midPoint;
      setIsCompactActive((prev) =>
        prev === shouldCompact ? prev : shouldCompact
      );
    });

    return () => {
      scrollY.removeListener(listenerId);
    };
  }, [isCompactVariant, isStickyVariant, morphEnd, morphStart, scrollY]);

  const renderStaticCategories = React.useCallback(
    (layoutVariant: 'default' | 'compact') => {
      const isCompactLayout = layoutVariant === 'compact';

      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            isCompactLayout && styles.scrollContentCompact,
          ]}
        >
          {allCategories.map((category) => {
            const iconSource = category.icon || ICON_MAP[category.name];

            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryItem,
                  isCompactLayout && styles.categoryItemCompact,
                ]}
                onPress={() => onCategoryPress?.(category.slug)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.iconContainer,
                    isCompactLayout && styles.iconContainerCompact,
                  ]}
                >
                  {iconSource ? (
                    <Image
                      source={iconSource}
                      style={[
                        styles.icon,
                        isCompactLayout && styles.iconCompact,
                      ]}
                      resizeMode="contain"
                    />
                  ) : (
                    <View
                      style={[
                        styles.iconPlaceholder,
                        isCompactLayout && styles.iconPlaceholderCompact,
                      ]}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.categoryName,
                    isCompactLayout && styles.categoryNameCompact,
                  ]}
                  numberOfLines={1}
                  onLayout={(event) => {
                    if (!isCompactLayout) {
                      handleLabelLayout(category.id, event.nativeEvent.layout.width);
                    }
                  }}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      );
    },
    [allCategories, onCategoryPress, handleLabelLayout]
  );

  const renderStickyCategories = React.useCallback(() => {
    const progress = transitionProgress ?? fallbackProgress;

    const iconContainerSize = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [DEFAULT_ICON_CONTAINER_SIZE, COMPACT_ICON_CONTAINER_SIZE],
    });
    const iconImageSize = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [DEFAULT_ICON_IMAGE_SIZE, COMPACT_ICON_IMAGE_SIZE],
    });
    const iconRadius = Animated.divide(iconContainerSize, 2);
    const iconTranslateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [DEFAULT_ICON_LEFT, COMPACT_ICON_LEFT],
    });
    const iconTranslateY = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [DEFAULT_ICON_TOP, COMPACT_ICON_TOP],
    });
    const iconBackgroundColor = progress.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(243,244,246,1)', 'rgba(238,242,255,1)'],
    });
    const labelTranslateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, COMPACT_LABEL_LEFT],
    });
    const labelTranslateY = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [DEFAULT_LABEL_Y, COMPACT_LABEL_Y],
    });
    const getTargetLabelWidth = (categoryId: string) =>
      Math.max(labelWidths[categoryId] ?? DEFAULT_ITEM_WIDTH, DEFAULT_ITEM_WIDTH);
    const getTargetContainerWidth = (categoryId: string) => {
      const labelWidth = getTargetLabelWidth(categoryId);
      return (
        COMPACT_PADDING_HORIZONTAL * 2 +
        COMPACT_ICON_CONTAINER_SIZE +
        COMPACT_ICON_MARGIN_RIGHT +
        labelWidth
      );
    };
    const containerPaddingHorizontal = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, COMPACT_PADDING_HORIZONTAL],
    });
    const containerRadius = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [CONTAINER_BORDER_RADIUS_START, CONTAINER_BORDER_RADIUS_END],
    });
    const containerPaddingVertical = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, COMPACT_PADDING_VERTICAL],
    });
    const containerHeight = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [DEFAULT_ITEM_HEIGHT, COMPACT_ITEM_HEIGHT],
    });
    const containerBackground = progress.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(255,255,255,0)', 'rgba(249,250,251,1)'],
    });
    const shadowOpacity = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.08],
    });
    const elevation = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 2],
    });
    const labelWidthFor = (categoryId: string) => {
      const target = getTargetLabelWidth(categoryId);
      const delta = target - DEFAULT_ITEM_WIDTH;
      return Animated.add(
        DEFAULT_ITEM_WIDTH,
        Animated.multiply(progress, delta)
      );
    };

    const containerWidthFor = (categoryId: string) => {
      const target = getTargetContainerWidth(categoryId);
      const delta = target - DEFAULT_ITEM_WIDTH;
      return Animated.add(
        DEFAULT_ITEM_WIDTH,
        Animated.multiply(progress, delta)
      );
    };

    return (
      <View style={[styles.container, styles.stickyWrapper]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stickyScrollContent}
        >
          {allCategories.map((category) => {
            const iconSource = category.icon || ICON_MAP[category.name];
            const labelWidth = labelWidthFor(category.id);
            const containerWidth = containerWidthFor(category.id);

            return (
              <AnimatedTouchableOpacity
                key={category.id}
                activeOpacity={0.7}
                onPress={() => onCategoryPress?.(category.slug)}
                style={[
                  styles.stickyItem,
                  {
                    width: containerWidth,
                    paddingHorizontal: containerPaddingHorizontal,
                    paddingVertical: containerPaddingVertical,
                    borderRadius: containerRadius,
                    height: containerHeight,
                    backgroundColor: containerBackground,
                    shadowOpacity,
                    elevation,
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.stickyIconContainer,
                    {
                      width: iconContainerSize,
                      height: iconContainerSize,
                      borderRadius: iconRadius,
                      transform: [
                        { translateX: iconTranslateX },
                        { translateY: iconTranslateY },
                      ],
                      backgroundColor: iconBackgroundColor,
                    },
                  ]}
                >
                  {iconSource ? (
                    <Animated.Image
                      source={iconSource}
                      resizeMode="contain"
                      style={{
                        width: iconImageSize,
                        height: iconImageSize,
                      }}
                    />
                  ) : (
                    <Animated.View
                      style={[
                        styles.stickyIconPlaceholder,
                        {
                          width: iconContainerSize,
                          height: iconContainerSize,
                          borderRadius: iconRadius,
                        },
                      ]}
                    />
                  )}
                </Animated.View>

                <Animated.Text
                  numberOfLines={1}
                  style={[
                    styles.stickyLabel,
                    {
                      width: labelWidth,
                      transform: [
                        { translateX: labelTranslateX },
                        { translateY: labelTranslateY },
                      ],
                      textAlign: isCompactActive ? 'left' : 'center',
                    },
                  ]}
                >
                  {category.name}
                </Animated.Text>
              </AnimatedTouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }, [
    allCategories,
    fallbackProgress,
    isCompactActive,
    labelWidths,
    onCategoryPress,
    transitionProgress,
  ]);

  if (isStickyVariant) {
    return renderStickyCategories();
  }

  return (
    <View
      style={[
        styles.container,
        isCompactVariant && styles.containerCompact,
      ]}
    >
      {renderStaticCategories(isCompactVariant ? 'compact' : 'default')}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  containerCompact: {
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 24,
  },
  scrollContentCompact: {
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryItem: {
    alignItems: 'center',
    width: 80,
  },
  categoryItemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 'auto',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: '#F9FAFB',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainerCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 0,
    marginRight: 10,
    backgroundColor: '#EEF2FF',
  },
  icon: {
    width: 40,
    height: 40,
  },
  iconCompact: {
    width: 28,
    height: 28,
  },
  iconPlaceholder: {
    width: 40,
    height: 40,
    backgroundColor: '#E5E7EB',
    borderRadius: 20,
  },
  iconPlaceholderCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  categoryNameCompact: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'left',
  },
  stickyWrapper: {
    paddingVertical: 10,
  },
  stickyScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 16,
  },
  stickyItem: {
    position: 'relative',
    minWidth: DEFAULT_ITEM_WIDTH,
    height: DEFAULT_ITEM_HEIGHT,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    overflow: 'visible',
    shadowColor: '#111827',
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  stickyIconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  stickyIconPlaceholder: {
    backgroundColor: '#E5E7EB',
  },
  stickyLabel: {
    position: 'absolute',
    left: 0,
    top: 0,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: LABEL_LINE_HEIGHT,
    color: '#1F2937',
  },
});
