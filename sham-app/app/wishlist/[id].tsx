import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePageTranslation } from '@/hooks/useTranslation';
import PageHeader from '@/components/PageHeader';
import FavoriteService, { Wishlist, WishlistItem } from '@/services/FavoriteService';
import { IconSymbol } from '@/components/ui/icon-symbol';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { Product } from '@/types/database';

export default function WishlistDetailPage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = usePageTranslation('favoritesPage');
  
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (id) {
      fetchWishlist();
    }
  }, [id]);

  const fetchWishlist = async () => {
    if (!id) return;

    try {
      setError(null);
      const data = await FavoriteService.getWishlist(id);
      setWishlist(data);
    } catch (err) {
      console.error('Error fetching wishlist:', err);
      setError(err instanceof Error ? err.message : t.errorLoadingWishlist);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchWishlist();
  };

  const handleRemoveItem = async (productId: string) => {
    if (!wishlist) return;

    Alert.alert(
      t.removeFromWishlist,
      'Are you sure you want to remove this item from your wishlist?',
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await FavoriteService.removeFromWishlist(wishlist.id, productId);
              await fetchWishlist();
            } catch (err) {
              console.error('Error removing item:', err);
              Alert.alert('Error', t.errorRemovingFromWishlist);
            }
          },
        },
      ]
    );
  };

  const getPrimaryImage = (product: Product) => {
    const images = product.images || [];
    const primaryImage = images.find(img => img.is_primary);
    return primaryImage?.image_url || images[0]?.image_url || 'https://via.placeholder.com/150';
  };

  const formatPrice = (price: number, currency: string = 'USD') => {
    const symbol = currency === 'USD' ? '$' : currency;
    return `${symbol}${price.toFixed(2)}`;
  };

  const renderProductCard = (item: WishlistItem) => {
    const product = item.product;
    if (!product) return null;

    const primaryImage = getPrimaryImage(product);
    const hasDiscount = false; // You can add discount logic here
    const discountPercent = 50; // Example
    const originalPrice = product.price * 1.3; // Example

    return (
      <View key={item.id} style={styles.productCard}>
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discountPercent}%</Text>
          </View>
        )}
        
        <TouchableOpacity
          style={styles.productImageContainer}
          onPress={() => router.push(`/product/${product.id}`)}
        >
          <Image source={{ uri: primaryImage }} style={styles.productImage} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => handleRemoveItem(product.id)}
        >
          <IconSymbol name="heart.fill" size={20} color="#EF4444" />
        </TouchableOpacity>
        
        {product.status === 'active' && (
          <View style={styles.freeShippingBadge}>
            <Text style={styles.freeShippingText}>{t.freeShipping}</Text>
          </View>
        )}
        
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {product.title}
          </Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>
              {formatPrice(product.price, product.currency)}
            </Text>
            {hasDiscount && (
              <Text style={styles.originalPrice}>
                {formatPrice(originalPrice, product.currency)}
              </Text>
            )}
          </View>
          
          <View style={styles.ratingRow}>
            <View style={styles.stars}>
              {[1, 2, 3, 4].map((star) => (
                <IconSymbol key={star} name="star.fill" size={12} color="#FCD34D" />
              ))}
              <IconSymbol name="star" size={12} color="#FCD34D" />
            </View>
            <Text style={styles.ratingText}>4.8 (1135)</Text>
          </View>
          
          {product.status === 'active' && (
            <View style={styles.stockInfo}>
              <IconSymbol name="info.circle" size={12} color="#6B7280" />
              <Text style={styles.stockText}>{t.lowestPrice}</Text>
            </View>
          )}
          
          {product.quantity_available && product.quantity_available <= 5 && (
            <Text style={styles.stockWarning}>
              {t.onlyLeft} {product.quantity_available} {t.leftInStock}
            </Text>
          )}
          
          {/* <TouchableOpacity style={styles.addToCartButton}>
            <MaterialCommunityIcons name="cart-outline" size={18} color="#61d5b6" />
            <Text style={styles.addToCartText}>{t.addToCart}</Text>
          </TouchableOpacity> */}
        </View>
      </View>
    );
  };

  const renderEmptyWishlist = () => (
    <View style={styles.emptyWishlistContainer}>
      <View style={styles.emptyCartIcon}>
        <MaterialCommunityIcons name="cart-outline" size={80} color="#D1D5DB" />
      </View>
      
      <Text style={styles.emptyWishlistTitle}>{t.noItemsInWishlist}</Text>
      <Text style={styles.emptyWishlistSubtitle}>{t.browseAndAdd}</Text>
      
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => router.push('/(tabs)')}
      >
        <Text style={styles.browseButtonText}>{t.browseProducts}</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />
        <PageHeader title={t.myWishlist} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#61d5b6" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !wishlist) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />
        <PageHeader title={t.myWishlist} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || t.errorLoadingWishlist}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchWishlist}>
            <Text style={styles.retryButtonText}>{t.tryAgain}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const items = wishlist.items || [];
  const itemCount = items.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      
      <PageHeader title={wishlist.name} />
      
      <View style={styles.container}>
        {/* Header Info */}
        <View style={styles.headerInfo}>
          <Text style={styles.listType}>
            {wishlist.is_public ? t.publicList : t.privateList}
          </Text>
          <Text style={styles.itemCount}>
            {itemCount} {itemCount === 1 ? t.item : t.items}
          </Text>
        </View>
        
        {/* Search and Filters */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <IconSymbol name="magnifyingglass" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder={t.searchForItem}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <IconSymbol name="xmark.circle.fill" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowFilters(!showFilters)}
            >
              <MaterialCommunityIcons name="filter-variant" size={18} color="#6B7280" />
              <Text style={styles.filterButtonText}>{t.filter}</Text>
              <IconSymbol name="chevron.down" size={14} color="#6B7280" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.filterButton}>
              <MaterialCommunityIcons name="sort" size={18} color="#6B7280" />
              <Text style={styles.filterButtonText}>{t.sort}</Text>
              <IconSymbol name="chevron.down" size={14} color="#6B7280" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.viewToggle}>
              <MaterialCommunityIcons name="view-grid" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Products Grid */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {items.length > 0 ? (
            <View style={styles.productsGrid}>
              {items.map(renderProductCard)}
            </View>
          ) : (
            renderEmptyWishlist()
          )}
          
          {/* Suggested Products Section */}
          {items.length > 0 && (
            <View style={styles.suggestedSection}>
              <View style={styles.suggestedHeader}>
                <View style={styles.suggestedTitleRow}>
                  <IconSymbol name="sparkles" size={20} color="#61d5b6" />
                  <Text style={styles.suggestedTitle}>{t.suggestedForYou}</Text>
                </View>
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>{t.seeAll}</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.suggestedProducts}>
                  {/* Add suggested products here */}
                </View>
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  listType: {
    fontSize: 14,
    color: '#6B7280',
  },
  itemCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  filterButtonText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  viewToggle: {
    marginLeft: 'auto',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  content: {
    flex: 1,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  productCard: {
    width: '48%',
    margin: '1%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 2,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  productImageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F3F4F6',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  freeShippingBadge: {
    position: 'absolute',
    top: 140,
    left: 0,
    backgroundColor: '#61d5b6',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  freeShippingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  productInfo: {
    padding: 12,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 6,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  originalPrice: {
    fontSize: 13,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  stockText: {
    fontSize: 11,
    color: '#6B7280',
  },
  stockWarning: {
    fontSize: 11,
    color: '#EF4444',
    marginBottom: 8,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#61d5b6',
  },
  addToCartText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#61d5b6',
  },
  emptyWishlistContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  emptyCartIcon: {
    marginBottom: 24,
  },
  emptyWishlistTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyWishlistSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#61d5b6',
    borderRadius: 8,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  suggestedSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 24,
  },
  suggestedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  suggestedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#61d5b6',
  },
  suggestedProducts: {
    flexDirection: 'row',
    gap: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#61d5b6',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export const options = {
  headerShown: false,
};

