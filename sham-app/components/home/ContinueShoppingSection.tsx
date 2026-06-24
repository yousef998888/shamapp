import React, { useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { ProductWithRelations } from '@/services/ProductService';
import { router } from 'expo-router';
import UserBehaviorService from '@/services/UserBehaviorService';

const { width: screenWidth } = Dimensions.get('window');
const ITEM_WIDTH = 120;
const ITEM_MARGIN = 12;

interface ContinueShoppingSectionProps {
  onProductPress?: (product: ProductWithRelations) => void;
}

export interface ContinueShoppingSectionRef {
  refresh: () => void;
}

const ContinueShoppingSection = forwardRef<ContinueShoppingSectionRef, ContinueShoppingSectionProps>(({ onProductPress }, ref) => {
  const { user, isAuthenticated } = useAuthContext();
  const [recentProducts, setRecentProducts] = useState<ProductWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load recent viewed products when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && user?.id) {
        loadRecentProducts();
      }
    }, [isAuthenticated, user?.id])
  );

  const loadRecentProducts = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Get recent viewed products from user_interactions
      const { data: interactions, error: interactionsError } = await supabase
        .from('user_interactions')
        .select(`
          product_id,
          created_at
        `)
        .eq('user_id', user.id)
        .eq('interaction_type', 'view')
        .not('product_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (interactionsError) {
        throw interactionsError;
      }

      // Get product details for the viewed products
      const productIds = interactions?.map(i => i.product_id).filter(Boolean) || [];
      
      if (productIds.length === 0) {
        setRecentProducts([]);
        return;
      }

      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          title,
          price,
          currency,
          category_id,
          view_count,
          created_at,
          category:categories(id, name, slug),
          images:product_images(id, image_url, sort_order),
          seller:user_profiles(full_name, username, avatar_url)
        `)
        .in('id', productIds)
        .eq('status', 'active');

      if (productsError) {
        throw productsError;
      }

      // Maintain the order from interactions
      const orderedProducts = productIds
        .map(id => products?.find(p => p.id === id))
        .filter(Boolean) as any[];

      // Deduplicate while maintaining order
      const uniqueProducts = orderedProducts.filter((product, index, self) => 
        index === self.findIndex(p => p.id === product.id)
      );

      setRecentProducts(uniqueProducts);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recent products');
    } finally {
      setLoading(false);
    }
  };

  // Expose refresh method via ref
  useImperativeHandle(ref, () => ({
    refresh: loadRecentProducts,
  }));

  const handleProductPress = (product: ProductWithRelations) => {
    // Track product interaction
    UserBehaviorService.trackProductView(product.id, {
      categoryId: product.category_id,
      price: product.price,
    });

    if (onProductPress) {
      onProductPress(product);
    } else {
      router.push(`/product/${product.id}`);
    }
  };

  const renderProductItem = (product: ProductWithRelations, index: number) => {
    const imageUrl = product.images?.[0]?.image_url;
    const rating = 4.2; // Mock rating for now
    const reviewCount = Math.floor(Math.random() * 1000) + 100; // Mock review count
    
    return (
      <TouchableOpacity
        key={product.id}
        style={[
          styles.productItem,
          index === 0 && { marginLeft: 20 }
        ]}
        onPress={() => handleProductPress(product)}
      >
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.productImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>📦</Text>
            </View>
          )}
          {/* <View style={styles.discountTag}>
            <Text style={styles.discountText}>-50%</Text>
          </View> */}
          <TouchableOpacity style={styles.favoriteButton}>
            <Ionicons name="heart-outline" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {product.title}
          </Text>
          {/* <View style={styles.ratingContainer}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= Math.floor(rating) ? "star" : star === Math.ceil(rating) && rating % 1 !== 0 ? "star-half" : "star-outline"}
                  size={12}
                  color="#FCD34D"
                />
              ))}
            </View>
            <Text style={styles.ratingText}>{rating} ({reviewCount})</Text>
          </View> */}
          <View style={styles.priceContainer}>
            <Text style={styles.currentPrice}>
              {product.currency} {product.price?.toFixed(2) || '0.00'}
            </Text>       
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Don't render if no recent products
  if (!isAuthenticated || recentProducts.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Continue Shopping</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#6366F1" />
          <Text style={styles.loadingText}>Loading recent items...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Continue Shopping</Text>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load recent items</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="bookmark-outline" size={20} color="#374151" style={styles.bookmarkIcon} />
          <Text style={styles.sectionTitle}>Continue shopping</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/search')}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={ITEM_WIDTH + ITEM_MARGIN * 2}
        snapToAlignment="start"
      >
        {recentProducts.map((product, index) => renderProductItem(product, index))}
      </ScrollView>
    </View>
  );
});

export default ContinueShoppingSection;

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    // paddingHorizontal: 16,
    // backgroundColor: '#F9FAFB',
    // paddingVertical: 16,
    // borderRadius: 12,
  },
  header: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookmarkIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  seeAllText: {
    fontSize: 14,
    color: '#61d5b6',
    fontWeight: '600',
  },
  scrollContent: {
    paddingRight: 16,
    paddingVertical: 8
  },
  productItem: {
    width: 140,
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
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
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
  },
  discountTag: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  favoriteButton: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 4,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
    lineHeight: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 4,
  },
  ratingText: {
    fontSize: 10,
    color: '#6B7280',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginRight: 6,
  },
  originalPrice: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
  },
});
