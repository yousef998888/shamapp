import React, { useState, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { ProductWithRelations } from '@/services/ProductService';
import { router } from 'expo-router';
import UserBehaviorService from '@/services/UserBehaviorService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRODUCT_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 columns with margins

interface InfiniteProductsFeedProps {
  userId?: string;
}

export interface InfiniteProductsFeedRef {
  loadMore: () => void;
}

const InfiniteProductsFeed = forwardRef<InfiniteProductsFeedRef, InfiniteProductsFeedProps>(
  ({ userId }, ref) => {
  const { isAuthenticated } = useAuthContext();
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 10;

  const loadProducts = useCallback(async (pageNum: number, append = false) => {
    try {
      if (pageNum === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          images:product_images(*)
        `)
        .order('created_at', { ascending: false })
        .range(pageNum * ITEMS_PER_PAGE, (pageNum + 1) * ITEMS_PER_PAGE - 1);

      // Add personalized filtering if user is authenticated
      if (isAuthenticated && userId) {
        // Try to get user's recent view/interaction history for personalization
        try {
          const { data: interactions } = await supabase
            .from('user_interactions')
            .select('product_id, category_id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);

          // If user has interactions, prioritize products from viewed categories
          if (interactions && interactions.length > 0) {
            const categoryIds = [...new Set(interactions
              .map(i => i.category_id)
              .filter(Boolean)
            )];

            if (categoryIds.length > 0) {
              query = query.in('category_id', categoryIds);
            }
          }
        } catch (err) {
          console.log('Could not fetch user interactions:', err);
        }
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      if (data) {
        if (append) {
          setProducts(prev => [...prev, ...data]);
        } else {
          setProducts(data);
        }

        // Check if there's more data
        setHasMore(data.length === ITEMS_PER_PAGE);
      }
    } catch (err) {
      console.error('Error loading products:', err);
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [isAuthenticated, userId]);

  useEffect(() => {
    loadProducts(0);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadProducts(nextPage, true);
    }
  }, [loadProducts, loadingMore, hasMore, page]);

  useImperativeHandle(ref, () => ({
    loadMore: handleLoadMore,
  }));

  const renderProduct = (item: ProductWithRelations, index: number) => {
    const imageUrl = item.images?.[0]?.image_url;
    const isFirstInRow = index % 2 === 0;

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.productCard,
          isFirstInRow && { marginLeft: 20 },
        ]}
        onPress={() => {
          UserBehaviorService.trackProductView(item.id, {
            categoryId: item.category_id,
            price: item.price,
          });
          router.push(`/product/${item.id}`);
        }}
        activeOpacity={0.9}
      >
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.productImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>📦</Text>
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.productPrice}>
            {item.currency} {item.price?.toFixed(2) || '0.00'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && products.length === 0) {
    return (
      <View style={styles.initialLoader}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading your personalized products...</Text>
      </View>
    );
  }

  if (error && products.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // Group products into rows of 2
  const rows = [];
  for (let i = 0; i < products.length; i += 2) {
    rows.push(products.slice(i, i + 2));
  }

  return (
    <View style={styles.container}>
      {/* Render products in grid */}
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((product, colIndex) =>
            renderProduct(product, rowIndex * 2 + colIndex)
          )}
        </View>
      ))}

      {/* Loading more indicator */}
      {loadingMore && (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color="#6366F1" />
        </View>
      )}
    </View>
  );
});

export default InfiniteProductsFeed;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 0,
  },
  productCard: {
    width: PRODUCT_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: 150,
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  placeholderText: {
    fontSize: 40,
  },
  productInfo: {
    padding: 12,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  initialLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
  },
});

