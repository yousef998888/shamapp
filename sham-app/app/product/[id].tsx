import React, { useCallback, useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import type { Product, ProductVariant, ProductOptionGroup, ProductOptionValue } from '@/types/database';
import { SearchBar } from '@/components/search/SearchBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthContext } from '@/contexts/AuthContext';
import ChatService from '@/services/ChatService';
import { useTranslation } from '@/hooks/useTranslation';
import VerificationModal from '@/components/modals/VerificationModal';
import { useUserVerification } from '@/hooks/useUserVerification';
import { useProduct } from '@/hooks/useProduct';
import { usePageTranslation } from '@/hooks/useTranslation';
import FavoriteService from '@/services/FavoriteService';
import SelectWishlistModal from '@/components/modals/SelectWishlistModal';
import { UI } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatCurrency = (value?: number, currency?: string) => {
  if (value == null) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
};

export default function ProductDetailsScreen() {
  const { id, query } = useLocalSearchParams<{ id: string; query?: string }>();
  const insets = useSafeAreaInsets();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [inWishlists, setInWishlists] = useState<string[]>([]);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [wishlistModalVisible, setWishlistModalVisible] = useState(false);
  const searchQuery = query || '';
  const { isAuthenticated, user, profile, refreshProfile } = useAuthContext();
  const { language } = useTranslation();
  const verification = useUserVerification();
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);
  
  // Variant selection state
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const { t } = usePageTranslation('productDetailPage');
  
  // Helper to get localized content
  const getLocalizedTitle = (title?: string, arTitle?: string) => {
    if (language === 'ar' && arTitle) return arTitle;
    return title || '';
  };

  const getDeliveryOptionLabel = (option?: Product['delivery_option']) => {
    switch (option) {
      case 'both':
        return t.deliveryCollectionAvailable || 'Delivery & Collection available';
      case 'postage':
        return t.deliveryAvailable || 'Delivery available';
      case 'collection':
        return t.collectionOnly || 'Collection only';
      default:
        return null;
    }
  };

  const { data: product, isLoading, error, refetch: refetchProduct } = useProduct(id);

  const images = product?.images?.map((img: any) => img.image_url) || [];
  const hasImages = images.length > 0;
  const [messageLoading, setMessageLoading] = useState(false);
  const deliveryOptionLabel = getDeliveryOptionLabel(product?.delivery_option);

  // Refetch product data when screen comes into focus to refresh stock
  useFocusEffect(
    useCallback(() => {
      if (id) {
        refetchProduct();
      }
    }, [id, refetchProduct])
  );

  // Find matching variant based on selected options
  useEffect(() => {
    if (!product?.has_variants || !product.variants || !product.option_groups) {
      setSelectedVariant(null);
      return;
    }

    const optionGroups = product.option_groups || [];
    const variants = product.variants || [];

    // Check if all options are selected
    const allSelected = optionGroups.every(group => {
      const valueId = selectedOptions[group.id];
      return valueId && group.values?.some(v => v.id === valueId);
    });

    if (!allSelected) {
      setSelectedVariant(null);
      return;
    }

    // Find variant that matches all selected option values
    const matchingVariant = variants.find(variant => {
      if (!variant.option_values || variant.option_values.length === 0) return false;
      
      const variantValueIds = new Set(
        variant.option_values.map(vv => vv.option_value?.id).filter(Boolean)
      );
      
      const selectedValueIds = new Set(Object.values(selectedOptions));
      
      if (variantValueIds.size !== selectedValueIds.size) return false;
      
      for (const selectedId of selectedValueIds) {
        if (!variantValueIds.has(selectedId)) return false;
      }
      
      return true;
    });

    setSelectedVariant(matchingVariant || null);
  }, [selectedOptions, product?.has_variants, product?.variants, product?.option_groups]);

  // Check if product is in any wishlists
  useEffect(() => {
    const checkWishlistStatus = async () => {
      if (!user?.id || !id) return;
      
      try {
        const wishlistIds = await FavoriteService.getWishlistsContainingProduct(user.id, id);
        setInWishlists(wishlistIds);
      } catch (error) {
        console.error('Error checking wishlist status:', error);
      }
    };

    checkWishlistStatus();
  }, [user?.id, id]);

  // Handle favorite button press
  const handleToggleFavorite = async () => {
    if (!user?.id) {
      Alert.alert(
        t.signInRequired || 'Sign In Required',
        t.signInToAddFavorites || 'Please sign in to add items to your favorites',
        [
          { text: t.cancel || 'Cancel', style: 'cancel' },
          { 
            text: t.signIn || 'Sign In', 
            onPress: () => router.push('/auth/login')
          }
        ]
      );
      return;
    }

    if (!id) return;

    // If product is already in wishlists, remove it from all
    if (inWishlists.length > 0) {
      Alert.alert(
        t.removeFromWishlist || 'Remove from Wishlist',
        'Remove this item from all wishlists?',
        [
          { text: t.cancel || 'Cancel', style: 'cancel' },
          { 
            text: 'Remove', 
            style: 'destructive',
            onPress: async () => {
              setIsFavoriteLoading(true);
              try {
                await FavoriteService.removeFromAllWishlists(user.id, id);
                setInWishlists([]);
                Alert.alert(t.success || 'Success', t.removedFromFavorites || 'Removed from wishlists');
              } catch (error) {
                console.error('Error removing from wishlists:', error);
                Alert.alert(
                  t.error || 'Error',
                  t.failedToUpdateFavorites || 'Failed to remove from wishlists. Please try again.'
                );
              } finally {
                setIsFavoriteLoading(false);
              }
            }
          }
        ]
      );
    } else {
      // Show wishlist selection modal
      setWishlistModalVisible(true);
    }
  };

  const handleWishlistSuccess = async () => {
    if (!user?.id || !id) return;
    
    // Refresh wishlist status
    try {
      const wishlistIds = await FavoriteService.getWishlistsContainingProduct(user.id, id);
      setInWishlists(wishlistIds);
    } catch (error) {
      console.error('Error refreshing wishlist status:', error);
    }
  };

  // Helper to get current stock
  const getCurrentStock = (): number | null => {
    if (!product) return null;
    
    if (product.has_variants) {
      if (!selectedVariant) return null;
      return selectedVariant.quantity_available ?? 0;
    } else {
      return product.quantity_available ?? null;
    }
  };

  // Check if product is sold/out of stock
  const isProductSold = useMemo(() => {
    if (!product) return false;
    
    // Check status first
    if (product.status === 'sold') return true;
    
    // Check quantity
    if (product.has_variants) {
      // If variant is selected, check that variant's stock
      if (selectedVariant) {
        return (selectedVariant.quantity_available ?? 0) <= 0;
      }
      
      // If no variant selected, check if ALL variants are sold
      if (product.variants && product.variants.length > 0) {
        const allVariantsSold = product.variants.every(
          variant => !variant.is_active || (variant.quantity_available ?? 0) <= 0
        );
        return allVariantsSold;
      }
      
      return false;
    } else {
      return (product.quantity_available ?? 0) <= 0;
    }
  }, [product, selectedVariant]);

  // Check if current user is the seller
  const isSeller = useMemo(() => {
    return product?.seller_id === user?.id;
  }, [product?.seller_id, user?.id]);

  // Check if buy button should be disabled
  const isBuyButtonDisabled = useMemo(() => {
    return isProductSold || isSeller;
  }, [isProductSold, isSeller]);

  // Get buy button text based on state
  const getBuyButtonText = (): string => {
    if (isSeller) {
      return t.yourProduct || 'Your Product';
    }
    if (isProductSold) {
      return t.sold || 'Sold';
    }
    return t.buy || 'Buy';
  };

  const handleOptionSelect = (groupId: string, valueId: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [groupId]: valueId,
    }));
  };

  const isOptionValueAvailable = (groupId: string, valueId: string): boolean => {
    if (!product?.has_variants || !product.variants) return true;
    
    // Temporarily select this option value
    const tempSelection = { ...selectedOptions, [groupId]: valueId };
    
    // Check if there's any variant that matches this selection
    const optionGroups = product.option_groups || [];
    const variants = product.variants || [];
    
    // For each variant, check if it matches the temp selection
    return variants.some(variant => {
      if (!variant.is_active || (variant.quantity_available ?? 0) <= 0) return false;
      if (!variant.option_values || variant.option_values.length === 0) return false;
      
      const variantValueIds = new Set(
        variant.option_values.map(vv => vv.option_value?.id).filter(Boolean)
      );
      
      // Check if this variant matches all currently selected options (with temp selection)
      let matches = true;
      for (const group of optionGroups) {
        const selectedValueId = tempSelection[group.id];
        if (selectedValueId) {
          // If this group has a selection, the variant must include that value
          if (!variantValueIds.has(selectedValueId)) {
            matches = false;
            break;
          }
        }
      }
      
      return matches;
    });
  };

  const handleMessageSeller = useCallback(async () => {
    if (!product) {
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

    if (!profile?.is_verified) {
      if (verification.status === 'pending') {
        Alert.alert('Verification pending', 'Your verification is under review. You can start chatting once it is approved.');
      } else if (verification.status === 'rejected') {
        Alert.alert(
          'Verification required',
          'We could not verify your previous submission. Please upload a clearer document.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Retry verification', onPress: () => setVerificationModalVisible(true) },
          ],
        );
      } else {
        Alert.alert(
          'Verification required',
          'Verify your identity to safely message sellers and buy items on Sham.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Start verification', onPress: () => setVerificationModalVisible(true) },
          ],
        );
      }
      return;
    }

    if (product.seller_id === user?.id) {
      router.push('/inbox');
      return;
    }

    try {
      setMessageLoading(true);
      const { order, created } = await ChatService.getOrCreateConversation({
        buyerId: user.id,
        sellerId: product.seller_id,
        productId: product.id,
        productPrice: product.price,
        currency: product.currency,
      });

      if (!order) {
        Alert.alert(t.unableToStartChat || 'Unable to start chat', t.tryAgainLater || 'Please try again later.');
        return;
      }

      if (created) {
        const friendlyName = product.seller?.full_name || product.seller?.username || t.there || 'there';
        const defaultMessage = `${t.hi || 'Hi'} ${friendlyName}, ${t.interestedIn || "I'm interested in"} "${product.title}". ${t.isItStillAvailable || 'Is it still available?'}`;
        await ChatService.sendMessage(order.id, user.id, product.seller_id, defaultMessage);
      }

      router.push(`/inbox/${order.id}`);
    } catch (err) {
      console.error('handleMessageSeller error', err);
      Alert.alert(t.somethingWentWrong || 'Something went wrong', t.couldNotOpenChat || 'We could not open the chat. Please try again.');
    } finally {
      setMessageLoading(false);
    }
  }, [isAuthenticated, product, profile?.is_verified, router, user?.id, verification.status]);

  const handleBuyNow = useCallback(() => {
    if (!product) {
      return;
    }

    // Check if product is sold
    if (isProductSold) {
      Alert.alert(t.sold || 'Sold', t.productSold || 'This product is no longer available.');
      return;
    }

    // Check if user is the seller
    if (isSeller) {
      Alert.alert(t.yourProduct || 'Your Product', t.cannotBuyOwnProduct || 'You cannot buy your own product.');
      return;
    }

    if (!isAuthenticated || !user?.id) {
      Alert.alert('Sign in required', 'Please sign in to continue.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/auth/login') },
      ]);
      return;
    }

    if (!profile?.is_verified) {
      if (verification.status === 'pending') {
        Alert.alert('Verification pending', 'Your verification is under review. You can place an order once it has been approved.');
      } else if (verification.status === 'rejected') {
        Alert.alert(
          'Verification required',
          'We could not verify your previous submission. Please upload a clearer photo of your ID.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Retry verification', onPress: () => setVerificationModalVisible(true) },
          ],
        );
      } else {
        Alert.alert(
          'Verify your identity',
          'Complete a quick identity check to buy safely on Sham.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Start verification', onPress: () => setVerificationModalVisible(true) },
          ],
        );
      }
      return;
    }

    // Validate variant selection if product has variants
    if (product.has_variants) {
      if (!selectedVariant) {
        Alert.alert('Select options', 'Please select all options before proceeding to checkout.');
        return;
      }
      
      if (!selectedVariant.is_active || (selectedVariant.quantity_available ?? 0) <= 0) {
        Alert.alert('Out of stock', 'The selected variant is currently out of stock.');
        return;
      }
    }

    // Pass variant ID to checkout if available
    const params: { id: string; variantId?: string } = { id: product.id };
    if (selectedVariant) {
      params.variantId = selectedVariant.id;
    }

    router.push({ pathname: '/checkout/[id]', params });
  }, [isAuthenticated, product, profile?.is_verified, router, user?.id, verification.status, selectedVariant, isProductSold, isSeller, t]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#61d5b6" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t.productNotFound || 'Product not found'}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>{t.goBack || 'Go Back'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar style="light" />
      
      {/* Header with Search Bar */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.searchBarContainer}>
            <SearchBar
              value={searchQuery}
              onChangeText={() => {}} // No-op since it's read-only
              placeholder={t.searchProducts || 'Search products...'}
              containerStyle={styles.searchBar}
              editable={false}
              onPressIn={() => router.push('/search')}
            />
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setActiveImageIndex(index);
            }}
            scrollEventThrottle={16}
          >
            {hasImages ? (
              images.map((uri: string, index: number) => (
                <Image
                  key={index}
                  source={{ uri }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              ))
            ) : (
              <View style={[styles.productImage, styles.placeholderImage]}>
                <MaterialCommunityIcons name="image-off-outline" size={60} color="#9CA3AF" />
              </View>
            )}
          </ScrollView>

          {/* Image Indicators */}
          {hasImages && images.length > 1 && (
            <View style={styles.imageIndicators}>
              <Text style={styles.imageCounter}>
                {activeImageIndex + 1}/{images.length}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.imageActions}>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialCommunityIcons name="share-variant" size={20} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.actionButton,
                inWishlists.length > 0 && styles.actionButtonFavorited
              ]} 
              onPress={handleToggleFavorite}
              disabled={isFavoriteLoading}
            >
              {isFavoriteLoading ? (
                <ActivityIndicator size="small" color={inWishlists.length > 0 ? "#EF4444" : "#6B7280"} />
              ) : (
                <MaterialCommunityIcons 
                  name={inWishlists.length > 0 ? "heart" : "heart-outline"} 
                  size={20} 
                  color={inWishlists.length > 0 ? "#EF4444" : "#6B7280"} 
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Badges */}
          <View style={styles.badgeRow}>
            {product.condition === 'new' && (
              <View style={[styles.badge, styles.badgeBestseller]}>
                <MaterialCommunityIcons name="star" size={14} color="#61d5b6" />
                <Text style={styles.badgeTextBestseller}>{product.condition}</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={styles.productTitle}>
            {getLocalizedTitle(product.title, product.ar_title)}
          </Text>

          {/* Seller Info */}
          {product.seller && (
            <View style={styles.sellerRow}>
              <Text style={styles.sellerLabel}>{t.seller || 'Seller'}: </Text>
              <TouchableOpacity 
                onPress={() => router.push(`/seller/${product.seller_id}`)}
                style={styles.sellerNameContainer}
              >
                <Text style={styles.sellerName}>
                  {product.seller.full_name || product.seller.username}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color="#61d5b6" />
              </TouchableOpacity>
            </View>
          )}

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatCurrency(product.price, product.currency)}</Text>
            {product.starting_price && product.starting_price > product.price && (
              <Text style={styles.originalPrice}>
                {formatCurrency(product.starting_price, product.currency)}
              </Text>
            )}
          </View>

          {/* Variant Selection */}
          {product.has_variants && product.option_groups && product.option_groups.length > 0 && (
            <View style={styles.variantSection}>
              {product.option_groups.map((group: ProductOptionGroup) => (
                <View key={group.id} style={styles.variantGroup}>
                  <Text style={styles.variantGroupLabel}>{group.name}</Text>
                  <View style={styles.variantOptions}>
                    {group.values?.map((value: ProductOptionValue) => {
                      const isSelected = selectedOptions[group.id] === value.id;
                      const isAvailable = isOptionValueAvailable(group.id, value.id);
                      
                      return (
                        <TouchableOpacity
                          key={value.id}
                          style={[
                            styles.variantOption,
                            isSelected && styles.variantOptionSelected,
                            !isAvailable && styles.variantOptionUnavailable,
                          ]}
                          onPress={() => {
                            if (isAvailable) {
                              handleOptionSelect(group.id, value.id);
                            }
                          }}
                          disabled={!isAvailable}
                        >
                          <Text
                            style={[
                              styles.variantOptionText,
                              isSelected && styles.variantOptionTextSelected,
                              !isAvailable && styles.variantOptionTextUnavailable,
                            ]}
                          >
                            {value.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
              
              {/* Selected variant stock */}
              {selectedVariant && (
                <View style={styles.variantStockInfo}>
                  <MaterialCommunityIcons 
                    name={selectedVariant.quantity_available > 0 ? "check-circle" : "alert-circle"} 
                    size={16} 
                    color={selectedVariant.quantity_available > 0 ? "#10B981" : "#EF4444"} 
                  />
                  <Text style={[
                    styles.variantStockText,
                    selectedVariant.quantity_available <= 0 && styles.variantStockTextOut
                  ]}>
                    {selectedVariant.quantity_available > 0 
                      ? `${selectedVariant.quantity_available} in stock`
                      : 'Out of stock'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Stock Status */}
          <View style={styles.statusRow}>
            <MaterialCommunityIcons 
              name={getCurrentStock() !== null && (getCurrentStock() ?? 0) > 0 ? "check-circle" : "alert-circle"} 
              size={16} 
              color={getCurrentStock() !== null && (getCurrentStock() ?? 0) > 0 ? "#10B981" : "#EF4444"} 
            />
            <Text style={[
              styles.statusText,
              getCurrentStock() !== null && (getCurrentStock() ?? 0) <= 0 && styles.statusTextOut
            ]}>
              {getCurrentStock() !== null 
                ? `${getCurrentStock()} in stock`
                : 'In-Stock'} ({product.view_count || 0} views)
            </Text>
          </View>

          {/* Rating */}
          {/* <View style={styles.ratingRow}>
            <View style={styles.stars}>
              {[1, 2, 3, 4].map((star) => (
                <MaterialCommunityIcons key={star} name="star" size={16} color="#FBBF24" />
              ))}
              <MaterialCommunityIcons name="star-half-full" size={16} color="#FBBF24" />
            </View>
            <Text style={styles.ratingText}>4.4 (2,165)</Text>
          </View> */}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Info Sections */}
          {/* <View style={styles.infoSection}>
            <MaterialCommunityIcons name="shield-check" size={20} color="#61d5b6" />
            <Text style={styles.infoText}>1 Week Refund Policy</Text>
          </View> */}

          {deliveryOptionLabel && (
            <View style={styles.infoSection}>
              <MaterialCommunityIcons name="truck-outline" size={20} color="#61d5b6" />
              <Text style={styles.infoText}>{deliveryOptionLabel}</Text>
            </View>
          )}

          {product.location && (
            <View style={styles.infoSection}>
              <MaterialCommunityIcons name="map-marker" size={20} color="#61d5b6" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoText}>{product.location}</Text>
              </View>
            </View>
          )}

          {/* Condition */}
          {product.condition && (
            <View style={styles.infoSection}>
              <MaterialCommunityIcons name="package-variant" size={20} color="#61d5b6" />
              <Text style={styles.infoText}>
                {t.condition || 'Condition'}: {product.condition === 'new' ? (t.brandNew || 'Brand New') : product.condition === 'used' ? (t.condUsed || 'Used') : (t.condRefurbished || 'Refurbished')}
              </Text>
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description */}
          {product.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>{t.aboutThisItem || 'About This Item'}</Text>
              <Text style={styles.descriptionText}>
                {getLocalizedTitle(product.description, product.ar_description)}
              </Text>
            </View>
          )}

          {/* Category */}
          {product.category && (
            <View style={styles.categorySection}>
              <Text style={styles.sectionTitle}>{t.category || 'Category'}</Text>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryText}>{product.category.name}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {isAuthenticated && !profile?.is_verified && (
        <View style={styles.verificationStrip}>
          <View style={styles.verificationStripRow}>
            <MaterialCommunityIcons name="shield-alert" size={22} color="#b45309" />
            <Text style={styles.verificationStripText}>
              Verify your identity to message sellers and checkout securely.
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={async () => {
                await verification.refetch();
                // Refresh profile to get latest is_verified status
                await refreshProfile();
              }}
              disabled={verification.isLoading}
            >
              <MaterialCommunityIcons 
                name="refresh" 
                size={18} 
                color="#b45309" 
                style={verification.isLoading && { opacity: 0.5 }}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.verificationStripButton}
            onPress={() => {
              if (!isAuthenticated) {
                Alert.alert(
                  t.signInRequired || 'Sign in required',
                  t.signInToVerify || 'Please sign in to verify your identity',
                  [
                    { text: t.cancel || 'Cancel', style: 'cancel' },
                    { text: t.signIn || 'Sign in', onPress: () => router.push('/auth/login') },
                  ]
                );
                return;
              }
              setVerificationModalVisible(true);
            }}
          >
            <Text style={styles.verificationStripButtonText}>
              {verification.status === 'pending' ? 'Waiting for approval' : 'Start verification'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.addToCartButton, messageLoading && styles.addToCartButtonDisabled]}
          onPress={handleMessageSeller}
          disabled={messageLoading}
        >
          {messageLoading ? (
            <ActivityIndicator size="small" color="#61d5b6" />
          ) : (
            <>
              <MaterialCommunityIcons name="cart-outline" size={20} color="#61d5b6" />
              <Text style={styles.addToCartText}>{t.messageSeller || 'Message Seller'}</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.buyNowButton, isBuyButtonDisabled && styles.buyNowButtonDisabled]}
          onPress={handleBuyNow}
          disabled={isBuyButtonDisabled}
        >
          <Text style={[styles.buyNowText, isBuyButtonDisabled && styles.buyNowTextDisabled]}>
            {getBuyButtonText()}
          </Text>
        </TouchableOpacity>
      </View>

      <VerificationModal
        visible={verificationModalVisible}
        onClose={() => setVerificationModalVisible(false)}
        onSubmitted={() => {
          setVerificationModalVisible(false);
          verification.refetch();
        }}
      />

      <SelectWishlistModal
        visible={wishlistModalVisible}
        onClose={() => setWishlistModalVisible(false)}
        productId={id || ''}
        onSuccess={handleWishlistSuccess}
        translations={{
          selectWishlist: t.selectWishlist || 'Select Wishlist',
          createNewWishlist: t.createNewWishlist || 'Create New Wishlist',
          cancel: t.cancel || 'Cancel',
          items: t.items || 'items',
          addToWishlist: t.addToWishlist || 'Add to Wishlist',
          success: t.success || 'Success',
          error: t.error || 'Error',
          addedToWishlist: t.addedToWishlist || 'Added to wishlist',
          failedToAddToWishlist: t.failedToAddToWishlist || 'Failed to add to wishlist',
          noWishlists: t.noWishlists || 'No Wishlists',
          createYourFirstWishlist: t.createYourFirstWishlist || 'Create your first wishlist',
          alreadyInWishlist: t.alreadyInWishlist || 'Already in this wishlist',
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  header: {
    backgroundColor: '#61d5b6',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarContainer: {
    flex: 1,
  },
  searchBar: {
    backgroundColor: '#FFFFFF',
  },
  headerIconButton: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: '#F9FAFB',
    position: 'relative',
  },
  productImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  placeholderImage: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  imageCounter: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  imageActions: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonFavorited: {
    backgroundColor: '#FEE2E2',
  },
  content: {
    padding: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  badgeBestseller: {
    backgroundColor: '#EDE9FE',
  },
  badgeTextBestseller: {
    fontSize: 12,
    fontWeight: '600',
    color: '#61d5b6',
    textTransform: 'capitalize',
  },
  productTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    lineHeight: 28,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sellerLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  sellerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sellerName: {
    fontSize: 14,
    color: '#61d5b6',
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  originalPrice: {
    fontSize: 16,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  statusTextOut: {
    color: '#EF4444',
  },
  variantSection: {
    marginBottom: 16,
  },
  variantGroup: {
    marginBottom: 16,
  },
  variantGroupLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  variantOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  variantOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  variantOptionSelected: {
    borderColor: '#61d5b6',
    backgroundColor: '#ECFDF5',
  },
  variantOptionUnavailable: {
    opacity: 0.5,
    borderColor: '#D1D5DB',
  },
  variantOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  variantOptionTextSelected: {
    color: '#61d5b6',
    fontWeight: '600',
  },
  variantOptionTextUnavailable: {
    color: '#9CA3AF',
  },
  variantStockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  variantStockText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  variantStockTextOut: {
    color: '#EF4444',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  descriptionSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  categorySection: {
    marginTop: 8,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  verificationStrip: {
    backgroundColor: '#fffbeb',
    borderTopWidth: 1,
    borderTopColor: '#fde68a',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  verificationStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  verificationStripText: {
    flex: 1,
    color: '#92400e',
    fontSize: 14,
    lineHeight: 20,
  },
  verificationStripButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#facc15',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  verificationStripButtonText: {
    color: '#78350f',
    fontWeight: '600',
    fontSize: 14,
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: UI.colors.background,
    borderTopWidth: UI.dimensions.borderWidth,
    borderTopColor: UI.colors.border,
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: UI.dimensions.buttonHeight,
    borderRadius: UI.dimensions.borderRadius,
    borderWidth: UI.dimensions.borderWidth,
    borderColor: UI.colors.primary,
    gap: 8,
  },
  addToCartButtonDisabled: {
    opacity: 0.6,
  },
  addToCartText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#61d5b6',
  },
  buyNowButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: UI.dimensions.buttonHeight,
    borderRadius: UI.dimensions.borderRadius,
    backgroundColor: UI.colors.primary,
  },
  buyNowButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  buyNowText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buyNowTextDisabled: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
