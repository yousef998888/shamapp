import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
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
import { useAuthContext } from '@/contexts/AuthContext';
import RecommendationService, { RecommendationResult } from '@/services/RecommendationService';
import UserBehaviorService from '@/services/UserBehaviorService';
import { ProductWithRelations } from '@/services/ProductService';
import { router } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = 320;
const CARD_MARGIN = 16;

interface RecommendationCarouselProps {
  type: 'personalized' | 'highlights' | 'trending';
  title: string;
  onProductPress?: (product: ProductWithRelations) => void;
}

export interface RecommendationCarouselRef {
  refresh: () => void;
}

interface ProductCardProps {
  product: ProductWithRelations;
  onPress: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => {
  const primaryImage = product.images?.find(img => img.is_primary) || product.images?.[0];
  
  return (
    <TouchableOpacity style={styles.productCard} onPress={onPress}>
      <View style={styles.productImageContainer}>
        {primaryImage ? (
          <Image 
            source={{ uri: primaryImage.image_url }} 
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage} />
        )}
        
        {/* Discount badge - could be calculated based on price history */}
        {/* <View style={styles.discountBadge}>
          <Text style={styles.discountText}>
            {Math.floor(Math.random() * 30) + 10}% off
          </Text>
        </View> */}
      </View>
    </TouchableOpacity>
  );
};

export const RecommendationCarousel = forwardRef<RecommendationCarouselRef, RecommendationCarouselProps>(({
  type,
  title,
  onProductPress,
}, ref) => {
  const { user, isAuthenticated } = useAuthContext();
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecommendations();
  }, [type, user?.id, isAuthenticated]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🔍 [RecommendationCarousel] Loading ${type} recommendations...`);
      console.log(`👤 [RecommendationCarousel] User authenticated: ${isAuthenticated}, User ID: ${user?.id}`);

      // Initialize user behavior tracking if authenticated
      if (isAuthenticated && user?.id) {
        UserBehaviorService.initializeSession(user.id);
        console.log(`📊 [RecommendationCarousel] User behavior tracking initialized`);
      }

      const context = {
        userId: user?.id,
        limit: 4, // 2 products per row, 2 rows = 4 total
      };

      console.log(`⚙️ [RecommendationCarousel] Context:`, context);

      const result = await RecommendationService.getCarouselRecommendations(type, context);
      
      console.log(`✅ [RecommendationCarousel] Result received:`, {
        strategy: result.strategy,
        confidence: result.confidence,
        productCount: result.products?.length || 0,
        products: result.products?.map(p => ({ id: p.id, title: p.title })) || []
      });

      setRecommendations(result);
    } catch (err) {
      console.error(`❌ [RecommendationCarousel] Error loading ${type} recommendations:`, err);
      setError(`Failed to load recommendations: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Expose refresh method via ref
  useImperativeHandle(ref, () => ({
    refresh: loadRecommendations,
  }));

  const handleProductPress = (product: ProductWithRelations) => {
    // Track the product view
    UserBehaviorService.trackProductView(product.id, {
      categoryId: product.category_id,
      price: product.price,
    });

    // Navigate to product page
    if (onProductPress) {
      onProductPress(product);
    } else {
      router.push(`/product/${product.id}`);
    }
  };

  const renderProductGrid = (products: ProductWithRelations[]) => {
    const rows = [];
    for (let i = 0; i < products.length; i += 2) {
      const rowProducts = products.slice(i, i + 2);
      rows.push(
        <View key={i} style={styles.productRow}>
          {rowProducts.map((product, index) => (
            <View key={product.id} style={styles.productItem}>
              <ProductCard
                product={product}
                onPress={() => handleProductPress(product)}
              />
            </View>
          ))}
          {/* Fill empty slots if needed */}
          {rowProducts.length < 2 && 
            Array.from({ length: 2 - rowProducts.length }).map((_, index) => (
              <View key={`empty-${index}`} style={styles.productItem} />
            ))
          }
        </View>
      );
    }
    return rows;
  };

  if (loading) {
    return (
      <View style={styles.carouselCard}>
        <Text style={styles.cardTitle}>{title}</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#6366F1" />
          <Text style={styles.loadingText}>Loading recommendations...</Text>
        </View>
      </View>
    );
  }

  if (error || !recommendations?.products.length) {
    return (
      <View style={styles.carouselCard}>
        <Text style={styles.cardTitle}>{title}</Text>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error || 'No recommendations available'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadRecommendations}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.carouselCard}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.productGrid}>
        {renderProductGrid(recommendations.products)}
      </View>
      
      {/* Debug info in development */}
      {/* {__DEV__ && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>
            Strategy: {recommendations.strategy} | 
            Confidence: {Math.round(recommendations.confidence * 100)}% | 
            Products: {recommendations.products.length}
          </Text>
        </View>
      )} */}
    </View>
  );
});

const styles = StyleSheet.create({
  carouselCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginRight: CARD_MARGIN,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  productGrid: {
    gap: 16,
  },
  productRow: {
    flexDirection: 'row',
    gap: 16,
  },
  productItem: {
    flex: 1,
    aspectRatio: 0.8, // Taller than square, matching original design
  },
  productCard: {
    flex: 1,
    backgroundColor: '#F3F4F6', // Matching original background
    borderRadius: 12,
    position: 'relative',
  },
  productImageContainer: {
    flex: 1,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
  },
  discountBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: '#EF4444',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  debugInfo: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  debugText: {
    fontSize: 10,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
});

export default RecommendationCarousel;
