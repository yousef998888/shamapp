import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/utils/supabase';
import { useAuthContext } from '@/contexts/AuthContext';
import ChatService from '@/services/ChatService';
import type { UserProfile, Product } from '@/types/database';
import { usePageTranslation } from '@/hooks/useTranslation';

const { width: screenWidth } = Dimensions.get('window');
const productImageSize = (screenWidth - 60) / 2; // 2 products per row with padding

export default function SellerProfilePage() {
  const { sellerId } = useLocalSearchParams<{ sellerId: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthContext();
  const { t } = usePageTranslation('sellerProfilePage');
  const [refreshing, setRefreshing] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);

  // Fetch seller profile
  const { data: seller, isLoading: sellerLoading } = useQuery({
    queryKey: ['seller-profile', sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', sellerId)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!sellerId,
  });

  // Fetch seller's products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['seller-products', sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          images:product_images (
            id,
            image_url,
            is_primary
          )
        `)
        .eq('seller_id', sellerId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!sellerId,
  });

  const handleMessageSeller = async () => {
    if (!seller || !sellerId) {
      return;
    }

    if (!isAuthenticated || !user?.id) {
      Alert.alert(t.signInRequired || 'Sign in required', t.signInToMessage || 'Please sign in to message the seller.', [
        {
          text: t.cancel || 'Cancel',
          style: 'cancel',
        },
        {
          text: t.signIn || 'Sign in',
          style: 'default',
          onPress: () => router.push('/auth/login'),
        },
      ]);
      return;
    }

    if (sellerId === user?.id) {
      router.push('/inbox');
      return;
    }

    try {
      setMessageLoading(true);
      
      // For seller profile messaging, we'll create a conversation-only order
      // We'll use the first product as a reference, or create a generic conversation
      const firstProduct = products?.[0];
      
      const { order, created } = await ChatService.getOrCreateConversation({
        buyerId: user.id,
        sellerId: sellerId,
        productId: firstProduct?.id || 'general-conversation',
        productPrice: firstProduct?.price || 0,
        currency: firstProduct?.currency || 'GBP',
      });

      if (!order) {
        Alert.alert(t.unableToStartChat || 'Unable to start chat', t.tryAgainLater || 'Please try again later.');
        return;
      }

      if (created) {
        const friendlyName = seller.full_name || seller.username || (t.there || 'there');
        const defaultMessage = `${t.hi || 'Hi'} ${friendlyName}, ${t.likeToLearnMore || "I'd like to learn more about your products."}`;
        await ChatService.sendMessage(order.id, user.id, sellerId, defaultMessage);
      }

      router.push(`/inbox/${order.id}`);
    } catch (err) {
      console.error('handleMessageSeller error', err);
      Alert.alert(t.somethingWentWrong || 'Something went wrong', t.couldNotOpenChat || 'We could not open the chat. Please try again.');
    } finally {
      setMessageLoading(false);
    }
  };

  const handleProductPress = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderProduct = (product: Product) => {
    const primaryImage = product.images?.find((img: any) => img.is_primary)?.image_url ||
                        product.images?.[0]?.image_url;

    return (
      <TouchableOpacity
        key={product.id}
        style={styles.productCard}
        onPress={() => handleProductPress(product.id)}
      >
        <View style={styles.productImageContainer}>
          {primaryImage ? (
            <Image source={{ uri: primaryImage }} style={styles.productImage} />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <IconSymbol name="photo" size={32} color="#9CA3AF" />
            </View>
          )}
        </View>
        
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {product.title}
          </Text>
          <Text style={styles.productPrice}>
            ${product.price}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (sellerLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading seller profile...</Text>
        </View>
      </View>
    );
  }

  if (!seller) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Seller not found</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header with Background Image */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backgroundImageContainer}
          activeOpacity={1}
        >
          {seller.background_image_url ? (
            <Image 
              source={{ uri: seller.background_image_url }} 
              style={styles.backgroundImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.backgroundPlaceholder}>
              <IconSymbol name="photo" size={40} color="#9CA3AF" />
              <Text style={styles.backgroundPlaceholderText}>No background image</Text>
            </View>
          )}
          
          <View style={styles.profileHeader}>
            <Text style={styles.initials}>
              {seller.full_name ? getInitials(seller.full_name) : 'S'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <TouchableOpacity 
          style={styles.avatarContainer}
          activeOpacity={1}
        >
          <View style={styles.avatar}>
            {seller.avatar_url ? (
              <Image 
                source={{ uri: seller.avatar_url }} 
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <IconSymbol name="person" size={40} color="#3B82F6" />
            )}
          </View>
        </TouchableOpacity>

        {/* Seller Name */}
        <Text style={styles.sellerName}>
          {seller.full_name || seller.username || (t.unknownSeller || 'Unknown Seller')}
        </Text>

        {/* Message Button */}
        <TouchableOpacity 
          style={[styles.messageButton, messageLoading && styles.messageButtonDisabled]}
          onPress={handleMessageSeller}
          disabled={messageLoading}
        >
          {messageLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <IconSymbol name="message.fill" size={20} color="#fff" />
              <Text style={styles.messageButtonText}>{t.messageSeller || 'Message Seller'}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Seller Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{products?.length || 0}</Text>
            <Text style={styles.statLabel}>{t.products || 'Products'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{seller.total_sales || 0}</Text>
            <Text style={styles.statLabel}>{t.sold || 'Sold'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {seller.member_since ? new Date(seller.member_since).getFullYear() : new Date().getFullYear()}
            </Text>
            <Text style={styles.statLabel}>{t.memberSince || 'Member Since'}</Text>
          </View>
        </View>
      </View>

      {/* Products Section */}
      <View style={styles.productsSection}>
        <Text style={styles.sectionTitle}>
          {t.products || 'Products'} ({products?.length || 0})
        </Text>
        
        {productsLoading ? (
          <View style={styles.loadingProducts}>
            <Text style={styles.loadingText}>{t.loadingProducts || 'Loading products...'}</Text>
          </View>
        ) : products && products.length > 0 ? (
          <View style={styles.productsGrid}>
            {products.map(renderProduct)}
          </View>
        ) : (
          <View style={styles.emptyProducts}>
            <IconSymbol name="square.stack.3d.up" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>{t.noProductsAvailable || 'No products available'}</Text>
          </View>
        )}
      </View>

      {/* Bottom spacing */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backgroundImageContainer: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  backgroundPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundPlaceholderText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  profileHeader: {
    position: 'absolute',
    bottom: -60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  initials: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 30,
    marginTop: -90,
  },
  avatarContainer: {
    marginBottom: 15,
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3B82F6',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  sellerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 20,
    gap: 8,
  },
  messageButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 20,
  },
  productsSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  loadingProducts: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  productCard: {
    width: productImageSize,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productImageContainer: {
    width: '100%',
    height: productImageSize,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: 12,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  emptyProducts: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
  bottomSpacing: {
    height: 100,
  },
});
