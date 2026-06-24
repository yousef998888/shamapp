import React, { useMemo, useCallback } from 'react';
import type { ComponentProps } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import CategoryService from '@/services/CategoryService';
import type { Category } from '@/types/database';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const ICON_MAP: Record<string, IconName> = {
  Smartphone: 'cellphone',
  DeviceMobile: 'cellphone',
  Home: 'home-variant',
  House: 'home-variant',
  Car: 'car',
  Basket: 'basket',
  ShoppingCartSimple: 'cart-outline',
  Barbell: 'dumbbell',
  Dress: 'tshirt-crew',
  Shirt: 'tshirt-crew',
  Beauty: 'lipstick',
  Sofa: 'sofa',
  Flashlight: 'flashlight',
  Trophy: 'trophy',
  Book: 'book-open-variant',
  Briefcase: 'briefcase',
  Package: 'cube-outline',
  Baby: 'baby-face-outline',
  Bicycle: 'bike',
  Device: 'laptop',
  Camera: 'camera',
  CarProfile: 'car-sports',
  Truck: 'truck-outline',
  Watch: 'watch',
  GameController: 'gamepad-variant',
  Furniture: 'lamp',
  Electronics: 'television',
};

type CategoryGridProps = {
  onCategoryPress?: (category: Category) => void;
  categories?: Category[] | null;
  isLoading?: boolean;
  limit?: number;
  fetchTopLevelOnly?: boolean;
  emptyMessage?: string;
};

const CATEGORY_ARTWORK: Record<string, string> = {
  'personal-care':
    'https://images.unsplash.com/photo-1612810806695-30ba7055e50d?auto=format&fit=crop&w=256&q=80',
  'home-and-kitchen':
    'https://images.unsplash.com/photo-1586201375754-1421a8e8d19b?auto=format&fit=crop&w=256&q=80',
  'home-kitchen':
    'https://images.unsplash.com/photo-1586201375754-1421a8e8d19b?auto=format&fit=crop&w=256&q=80',
  automotive:
    'https://images.unsplash.com/photo-1549923746-c502d488b3ea?auto=format&fit=crop&w=256&q=80',
  'clothing-and-fashion':
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=256&q=80',
  'electronics-and-gadget':
    'https://images.unsplash.com/photo-1512499617640-c2f999098c01?auto=format&fit=crop&w=256&q=80',
  'electronics-and-gadgets':
    'https://images.unsplash.com/photo-1512499617640-c2f999098c01?auto=format&fit=crop&w=256&q=80',
  electronics:
    'https://images.unsplash.com/photo-1512499617640-c2f999098c01?auto=format&fit=crop&w=256&q=80',
  'electronics-gadget':
    'https://images.unsplash.com/photo-1512499617640-c2f999098c01?auto=format&fit=crop&w=256&q=80',
  'gaming-entertainment':
    'https://images.unsplash.com/photo-1580121441575-41bcb5bbe319?auto=format&fit=crop&w=256&q=80',
  sports:
    'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=256&q=80',
  'baby-and-kids':
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=256&q=80',
  'baby-kids':
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=256&q=80',
  books:
    'https://images.unsplash.com/photo-1524578271613-d550eacf6090?auto=format&fit=crop&w=256&q=80',
  health:
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=256&q=80',
  accessories:
    'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=256&q=80',
  other:
    'https://images.unsplash.com/photo-1512446816042-444d641267d4?auto=format&fit=crop&w=256&q=80',
};

const normalizeKey = (value?: string | null) => {
  if (!value) {
    return null;
  }
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export function CategoryGrid({
  onCategoryPress,
  categories: providedCategories = null,
  isLoading: providedLoading,
  limit = 12,
  fetchTopLevelOnly = true,
  emptyMessage = 'No categories available yet.',
}: CategoryGridProps) {
  const shouldFetch = !providedCategories;

  const {
    data: categories,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Category[], Error>({
    queryKey: ['categories'],
    queryFn: CategoryService.fetchCategories,
    enabled: shouldFetch,
  });

  const effectiveCategories = providedCategories ?? categories;
  const effectiveLoading = providedLoading ?? (shouldFetch && isLoading);

  const sortedCategories = useMemo(() => {
    if (!effectiveCategories) {
      return [];
    }

    const filtered = fetchTopLevelOnly
      ? effectiveCategories.filter((category) => !category.parent_id)
      : effectiveCategories;

      console.log('filtered', filtered);
    return filtered.slice(0, limit);
  }, [effectiveCategories, fetchTopLevelOnly, limit]);

  const getArtworkForCategory = useCallback((category: Category) => {
    const possibleKeys = [
      category.icon?.startsWith('http') ? category.icon : null,
      category.icon,
      category.slug,
      category.name,
    ]
      .map(normalizeKey)
      .filter(Boolean) as string[];

    for (const key of possibleKeys) {
      if (key && CATEGORY_ARTWORK[key]) {
        return { uri: CATEGORY_ARTWORK[key] };
      }
    }

    if (category.icon && category.icon.startsWith('http')) {
      return { uri: category.icon };
    }

    return null;
  }, []);

  const renderCategory = useCallback(
    ({ item }: { item: Category }) => {
      const iconName = (ICON_MAP[item.icon ?? ''] ?? ICON_MAP.Package) as IconName;
      const artworkSource = getArtworkForCategory(item);
      const handlePress = () => {
        if (onCategoryPress) {
          onCategoryPress(item);
        }
      };

      return (
        <TouchableOpacity
          key={item.id}
          activeOpacity={0.9}
          style={styles.cardTouchable}
          onPress={handlePress}
        >
          <View style={styles.card}>
            <View style={styles.artworkWrapper}>
              {artworkSource ? (
                <Image
                  source={artworkSource}
                  style={styles.categoryImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.iconFallback}>
                  <MaterialCommunityIcons name={iconName} size={28} color="#4B5563" />
                </View>
              )}
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.name}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [getArtworkForCategory, onCategoryPress],
  );

  if (effectiveLoading) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator size="small" color="#61d5b6" />
        <Text style={styles.stateText}>Loading categories...</Text>
      </View>
    );
  }

  if (shouldFetch && isError) {
    return (
      <View style={styles.stateContainer}>
        <Text style={[styles.stateText, styles.errorText]}>
          {error?.message || 'Unable to load categories'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!sortedCategories.length) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={sortedCategories}
      renderItem={renderCategory}
      keyExtractor={(item) => item.id}
      numColumns={3}
      scrollEnabled={false}
      columnWrapperStyle={styles.columnWrapper}
      contentContainerStyle={styles.grid}
    />
  );
}

const styles = StyleSheet.create({
  grid: {
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
  },
  cardTouchable: {
    flex: 1,
    flexBasis: '33.333%',
    maxWidth: '33.333%',
    marginHorizontal: 6,
    marginBottom: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  artworkWrapper: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    overflow: 'hidden',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  iconFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
  },
  cardTitle: {
    textAlign: 'center',
    color: '#344054',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  stateText: {
    marginTop: 8,
    fontSize: 14,
    color: '#475467',
  },
  errorText: {
    color: '#B42318',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FEE4E2',
  },
  retryText: {
    color: '#B42318',
    fontWeight: '600',
    fontSize: 14,
  },
});
