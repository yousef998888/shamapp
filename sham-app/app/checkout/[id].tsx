import React, { useMemo, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import LocationPicker from '@/components/LocationPicker';
import { useAuthContext } from '@/contexts/AuthContext';
import OrderService from '@/services/OrderService';
import type { Product, UserAddress, ProductVariant } from '@/types/database';
import { isPickupAddress } from '@/types/database';
import { supabase } from '@/utils/supabase';
import VerificationModal from '@/components/modals/VerificationModal';
import { useUserVerification } from '@/hooks/useUserVerification';
import { useProduct } from '@/hooks/useProduct';
import { usePageTranslation } from '@/hooks/useTranslation';
import { UI } from '@/constants/theme';

const formatCurrency = (value: number, currency?: string) => {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency || 'GBP',
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `£${value.toFixed(2)}`;
  }
};

const fetchPickupAddresses = async (userId: string): Promise<UserAddress[]> => {
  const { data, error } = await supabase
    .from('user_pickup_addresses')
    .select(`
      *,
      pickup_location:pickup_locations(
        *,
        city:cities(*)
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  // Transform the data to match the expected UserAddress format
  return (data || []).map(item => ({
    id: item.id,
    user_id: item.user_id,
    title: item.title,
    address_line_1: item.pickup_location.address,
    address_line_1_ar: item.pickup_location.address_ar,
    address_line_2: undefined,
    city: item.pickup_location.city.name,
    city_ar: item.pickup_location.city.name_ar,
    state_province: undefined,
    postal_code: undefined,
    country: item.pickup_location.city.country,
    country_ar: item.pickup_location.city.country_ar,
    latitude: item.pickup_location.latitude,
    longitude: item.pickup_location.longitude,
    is_default: item.is_default,
    is_active: item.is_active,
    created_at: item.created_at,
    updated_at: item.updated_at,
    // Store the pickup location ID for reference
    pickup_location_id: item.pickup_location_id,
    pickup_location: item.pickup_location
  }));
};

const MAX_INSTRUCTIONS_LENGTH = 300;
type FulfilmentOption = 'delivery' | 'collection';

export default function CheckoutScreen() {
  const { id, variantId } = useLocalSearchParams<{ id: string; variantId?: string }>();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuthContext();
  const queryClient = useQueryClient();
  const { t, language } = usePageTranslation('checkoutPage');

  const [isPickupPickerVisible, setPickupPickerVisible] = useState(false);
  const [selectedPickupAddress, setSelectedPickupAddress] = useState<UserAddress | null>(null);
  const [fulfilmentType, setFulfilmentType] = useState<FulfilmentOption>('delivery');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [contactPhone, setContactPhone] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);
  const verification = useUserVerification();

  // Helper functions for localized address fields
  const getLocalizedAddressLine1 = (address: UserAddress): string => {
    if (language === 'ar' && address.address_line_1_ar) {
      return address.address_line_1_ar;
    }
    return address.address_line_1 || '';
  };

  const getLocalizedCity = (address: UserAddress): string => {
    if (language === 'ar' && address.city_ar) {
      return address.city_ar;
    }
    return address.city || '';
  };

  const getLocalizedCountry = (address: UserAddress): string => {
    if (language === 'ar' && address.country_ar) {
      return address.country_ar;
    }
    return address.country || '';
  };

  const {
    data: product,
    isLoading: productLoading,
    error: productError,
  } = useProduct(id);

  // Find the selected variant if variantId is provided
  const selectedVariant = useMemo(() => {
    if (!variantId || !product?.variants) return null;
    return product.variants.find(v => v.id === variantId) || null;
  }, [variantId, product?.variants]);

  const fulfilmentOptions = useMemo<FulfilmentOption[]>(() => {
    switch (product?.delivery_option) {
      case 'collection':
        return ['collection'];
      case 'postage':
        return ['delivery'];
      case 'both':
        return ['delivery', 'collection'];
      default:
        return ['delivery'];
    }
  }, [product?.delivery_option]);

  const hasDeliveryOption = fulfilmentOptions.includes('delivery');

  const {
    data: pickupAddresses,
    isLoading: pickupLoading,
  } = useQuery({
    queryKey: ['pickup-addresses', user?.id],
    queryFn: () => fetchPickupAddresses(user!.id),
    enabled: !!user && hasDeliveryOption,
  });

  const {
    data: pickupMethod,
    isLoading: pickupMethodLoading,
  } = useQuery({
    queryKey: ['pickup-delivery-method'],
    queryFn: OrderService.getPickupMethod,
    enabled: hasDeliveryOption,
  });

  useEffect(() => {
    if (!hasDeliveryOption) {
      if (selectedPickupAddress) {
        setSelectedPickupAddress(null);
      }
      return;
    }
    if (pickupAddresses && pickupAddresses.length > 0 && !selectedPickupAddress) {
      const defaultPickup = pickupAddresses.find(address => address.is_default) || pickupAddresses[0];
      if (defaultPickup) {
        setSelectedPickupAddress(defaultPickup);
      }
    }
  }, [hasDeliveryOption, pickupAddresses, selectedPickupAddress]);

  useEffect(() => {
    if (fulfilmentOptions.length === 0) {
      return;
    }
    setFulfilmentType(prev =>
      fulfilmentOptions.includes(prev) ? prev : fulfilmentOptions[0]
    );
  }, [fulfilmentOptions]);

  useEffect(() => {
    if (profile?.phone) {
      setContactPhone(profile.phone);
    }
  }, [profile?.phone]);

  const currency = product?.currency || 'GBP';
  const buyerProtectionFee = 0.75;
  const collectionPointFee = hasDeliveryOption ? Number(pickupMethod?.base_price ?? 0) : 0;
  const fulfilmentFee = fulfilmentType === 'delivery' ? collectionPointFee : 0;

  const orderTotal = useMemo(() => {
    if (!product) return 0;
    const unitPrice = selectedVariant?.price_override ?? product.price;
    return unitPrice + fulfilmentFee + buyerProtectionFee;
  }, [product, selectedVariant, fulfilmentFee, buyerProtectionFee]);

  const handlePlaceOrder = () => {
    if (!user) {
      Alert.alert(t.signInRequired || 'Sign in required', t.signInToPlaceOrder || 'Please sign in to place an order.');
      return;
    }

    if (!profile?.is_verified) {
      if (verification.status === 'pending') {
        Alert.alert('Verification pending', 'Your verification is currently under review. You can continue once it has been approved.');
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
          'Complete a quick identity check to buy items safely on Sham.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Start verification', onPress: () => setVerificationModalVisible(true) },
          ],
        );
      }
      return;
    }

    if (!contactPhone.trim()) {
      Alert.alert(t.addContactNumber || 'Add contact number', t.provideContactPhone || 'Please provide a contact phone number so we can reach you.');
      return;
    }

    if (!product) {
      Alert.alert(t.productUnavailable || 'Product unavailable', t.productNoLongerAvailable || 'This product is no longer available.');
      return;
    }

    const isDelivery = fulfilmentType === 'delivery';

    console.log("isDelivery", isDelivery);
    

    if (isDelivery) {
      if (!selectedPickupAddress) {
        Alert.alert(t.selectPickupLocation || 'Select pickup location', t.choosePickupLocation || 'Choose a pickup location to continue.');
        return;
      }
      if (!pickupMethod) {
        Alert.alert(t.deliveryUnavailable || 'Delivery unavailable', t.pickupNotConfigured || 'Pickup delivery method is not configured yet.');
        return;
      }
    }
    const resolvedMethod = isDelivery ? pickupMethod : null;

    setIsPlacingOrder(true);
    const trimmedPhone = contactPhone.trim();
    const trimmedInstructions = deliveryInstructions.trim();

    const pickupLocationPayload =
      isDelivery && selectedPickupAddress
        ? {
            id: selectedPickupAddress.id,
            title: selectedPickupAddress.title,
            address_line_1: selectedPickupAddress.address_line_1,
            address_line_1_ar: selectedPickupAddress.address_line_1_ar,
            address_line_2: selectedPickupAddress.address_line_2,
            address_line_2_ar: selectedPickupAddress.address_line_2_ar,
            city: selectedPickupAddress.city,
            city_ar: selectedPickupAddress.city_ar,
            country: selectedPickupAddress.country,
            country_ar: selectedPickupAddress.country_ar,
            postal_code: selectedPickupAddress.postal_code,
            latitude: selectedPickupAddress.latitude,
            longitude: selectedPickupAddress.longitude,
            pickup_location_id: isPickupAddress(selectedPickupAddress)
              ? selectedPickupAddress.pickup_location_id
              : undefined,
          }
        : null;

    // Determine unit price - use variant price override if available, otherwise product price
    const unitPrice = selectedVariant?.price_override ?? product.price;

    OrderService.createOrder({
      buyer_id: user.id,
      seller_id: product.seller_id,
      product_id: product.id,
      product_variant_id: selectedVariant?.id || null,
      quantity: 1,
      unit_price: unitPrice,
      total_amount: unitPrice,
      shipping_fee: fulfilmentFee,
      grand_total: orderTotal,
      currency: currency,
      delivery_method_id: resolvedMethod?.id,
      delivery_type: isDelivery ? 'pickup_point' : 'seller_collection',
      pickup_address_id:
        isDelivery && selectedPickupAddress && isPickupAddress(selectedPickupAddress)
          ? selectedPickupAddress.id
          : undefined,
      pickup_location_data: pickupLocationPayload
        ? {
            ...pickupLocationPayload,
            address_id: selectedPickupAddress?.id,
            contact_phone: trimmedPhone,
            instructions: trimmedInstructions || null,
          }
        : null,
      delivery_address: isDelivery
        ? {
            contact_phone: trimmedPhone,
            instructions: trimmedInstructions || null,
          }
        : null,
      contact_phone: trimmedPhone,
      special_instructions: trimmedInstructions || undefined,
      delivery_fee: fulfilmentFee,
      status: isDelivery ? undefined : 'awaiting_collection',
      initialMessage: !isDelivery
        ? t.collectionOrderCreated || 'Collection order created. Coordinate pickup details here.'
        : undefined,
    })
      .then(order => {
        if (!order) {
          Alert.alert(t.checkoutFailed || 'Checkout failed', t.unableToPlaceOrder || 'Unable to place your order. Please try again.');
          return;
        }

        if (isDelivery) {
          router.replace({
            pathname: '/checkout/success',
            params: {
              orderId: order.id,
              total: order.grand_total?.toString() || orderTotal.toString(),
              productId: product.id,
              productTitle: product.title,
              productImage: product.images && product.images[0] ? product.images[0].image_url : '',
            },
          });
        } else {
          router.replace(`/inbox/${order.id}`);
        }
      })
      .catch(err => {
        console.error('checkout error', err);
        Alert.alert(t.checkoutFailed || 'Checkout failed', t.somethingWentWrong || 'Something went wrong. Please try again.');
      })
      .finally(() => setIsPlacingOrder(false));
  };

  const renderProductSection = () => {
    if (productLoading) {
      return (
        <View style={styles.sectionLoading}>
          <ActivityIndicator size="small" color="#61d5b6" />
        </View>
      );
    }

    if (productError || !product) {
      return (
        <View style={styles.sectionError}>
          <MaterialCommunityIcons name="alert-circle" size={20} color="#DC2626" />
          <Text style={styles.sectionErrorText}>{t.unableToLoadProduct || 'Unable to load product details.'}</Text>
        </View>
      );
    }

    const productImage = product.images && product.images.length > 0 ? product.images[0].image_url : null;
    const unitPrice = selectedVariant?.price_override ?? product.price;
    
    // Build variant description if variant is selected
    const variantDescription = useMemo(() => {
      if (!selectedVariant || !product.option_groups) return null;
      
      const parts: string[] = [];
      product.option_groups.forEach(group => {
        const matchingValue = selectedVariant.option_values?.find(
          vv => vv.option_value && group.values?.some(gv => gv.id === vv.option_value?.id)
        );
        if (matchingValue?.option_value) {
          parts.push(`${group.name}: ${matchingValue.option_value.name}`);
        }
      });
      
      return parts.length > 0 ? parts.join(', ') : null;
    }, [selectedVariant, product.option_groups]);

    return (
      <View style={styles.productCard}>
        {productImage ? (
          <Image source={{ uri: productImage }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, styles.productImagePlaceholder]}>
            <MaterialCommunityIcons name="image-off-outline" size={28} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.productDetails}>
          <Text style={styles.productTitle}>{product.title}</Text>
          {variantDescription && (
            <Text style={styles.variantDescription}>{variantDescription}</Text>
          )}
          {product.seller && (
            <TouchableOpacity 
              onPress={() => router.push(`/seller/${product.seller_id}`)}
              style={styles.sellerContainer}
            >
              <Text style={styles.productSubtitle}>
                {t.soldBy || 'Sold by'} {product.seller.full_name || product.seller.username}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color="#61d5b6" />
            </TouchableOpacity>
          )}
          <Text style={styles.productPrice}>{formatCurrency(unitPrice, product.currency)}</Text>
        </View>
      </View>
    );
  };

  const handlePhoneChange = (value: string) => {
    setContactPhone(value.replace(/[^\d()+\-\s]/g, ''));
  };

  const handleInstructionChange = (value: string) => {
    if (value.length <= MAX_INSTRUCTIONS_LENGTH) {
      setDeliveryInstructions(value);
    } else {
      setDeliveryInstructions(value.slice(0, MAX_INSTRUCTIONS_LENGTH));
    }
  };

  const isDeliveryFlow = fulfilmentType === 'delivery';
  const fulfilmentMethodLoading = isDeliveryFlow ? pickupMethodLoading : false;
  const fulfilmentSelectionReady = isDeliveryFlow ? !!selectedPickupAddress : true;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!profile?.is_verified && (
          <View style={styles.verificationBanner}>
            <View style={styles.verificationBannerRow}>
              <MaterialCommunityIcons name="shield-alert" size={24} color="#b45309" />
              <Text style={styles.verificationBannerText}>
                Verify your identity once to complete purchases securely on Sham.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.verificationBannerButton}
              onPress={() => setVerificationModalVisible(true)}
            >
              <Text style={styles.verificationBannerButtonText}>
                {verification.status === 'pending' ? 'Waiting for approval' : 'Start verification'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          {renderProductSection()}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fulfilment</Text>
          {fulfilmentOptions.length > 1 ? (
            <View style={styles.fulfilmentToggle}>
              {fulfilmentOptions.map(option => {
                const isActive = fulfilmentType === option;
                const iconName = option === 'collection' ? 'storefront-outline' : 'truck-delivery-outline';
                const label = option === 'collection' ? (t.collection || 'Collection') : (t.delivery || 'Delivery');
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.fulfilmentOption, isActive && styles.fulfilmentOptionActive]}
                    onPress={() => setFulfilmentType(option)}
                  >
                    <MaterialCommunityIcons
                      name={iconName}
                      size={18}
                      color={isActive ? '#0F172A' : '#64748B'}
                    />
                    <Text
                      style={[styles.fulfilmentOptionText, isActive && styles.fulfilmentOptionTextActive]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={[styles.fulfilmentOption, styles.fulfilmentOptionActive]}>
              <MaterialCommunityIcons
                name={fulfilmentOptions[0] === 'collection' ? 'storefront-outline' : 'truck-delivery-outline'}
                size={18}
                color="#0F172A"
              />
              <Text style={[styles.fulfilmentOptionText, styles.fulfilmentOptionTextActive]}>
                {fulfilmentOptions[0] === 'collection' ? (t.collection || 'Collection') : (t.delivery || 'Delivery')}
              </Text>
            </View>
          )}
          <Text style={styles.helperText}>
            {fulfilmentType === 'collection'
              ? (t.meetSellerDirectly || 'Meet the seller directly and confirm collection together.')
              : (t.dropAtCollectionPoint || 'Drop the item at an approved collection point for courier delivery.')}
          </Text>
        </View>

        {fulfilmentType === 'delivery' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t.collectionPoint || 'Collection Point'}</Text>
              <TouchableOpacity onPress={() => setPickupPickerVisible(true)}>
                <Text style={styles.sectionActionText}>{selectedPickupAddress ? (t.change || 'Change') : (t.select || 'Select')}</Text>
              </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.locationCard} onPress={() => setPickupPickerVisible(true)}>
            {pickupLoading ? (
              <ActivityIndicator size="small" color="#61d5b6" />
            ) : selectedPickupAddress ? (
              <View style={styles.locationContent}>
                <View style={styles.locationIcon}>
                  <MaterialCommunityIcons name="map-marker-radius" size={20} color="#61d5b6" />
                </View>
                <View style={styles.locationDetails}>
                  <Text style={styles.locationTitle}>
                    {selectedPickupAddress.title.replace('Collection Point - ', '')}
                  </Text>
                  <Text style={styles.locationSubtitle}>{getLocalizedAddressLine1(selectedPickupAddress)}</Text>
                  <Text style={styles.locationMeta}>
                    {getLocalizedCity(selectedPickupAddress)}, {getLocalizedCountry(selectedPickupAddress)}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.locationEmpty}>
                <MaterialCommunityIcons name="map-marker-plus" size={20} color="#6366F1" />
                <Text style={styles.locationEmptyText}>{t.chooseCollectionPoint || 'Choose a collection point'}</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.helperText}>
            {pickupMethodLoading
              ? (t.loadingCollectionPoints || 'Loading collection points...')
              : (t.sellerWillHandParcel || 'The seller will hand the parcel to the courier at this location.')}
          </Text>
        </View>
        )}

        {fulfilmentType === 'collection' && (
        <View style={styles.section}>
          <View style={styles.collectionInfoCard}>
            <MaterialCommunityIcons name="handshake-outline" size={20} color="#61d5b6" />
            <View style={styles.collectionInfoText}>
              <Text style={styles.collectionInfoTitle}>{t.arrangeCollection || 'Arrange collection'}</Text>
              <Text style={styles.collectionInfoSubtitle}>
                {t.chatOpensOnOrder || 'A chat opens once you place the order so you and the seller can agree the meetup details.'}
              </Text>
            </View>
          </View>
        </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialCommunityIcons name="cellphone" size={18} color="#64748B" />
              <Text style={styles.sectionTitle}>{t.mobileContact || 'Mobile Contact'}</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.sectionActionText}>{t.seeAll || 'See All'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>{t.weWillReachOut || 'We will reach out if anything comes up with your order.'}</Text>
          <View style={styles.phoneInputContainerFullWidth}>
            <TextInput
              value={contactPhone}
              onChangeText={handlePhoneChange}
              placeholder={t.phonePlaceholder || '+44 (000) 000-0000'}
              keyboardType="phone-pad"
              style={styles.phoneInput}
            />
          </View>
          <Text style={styles.helperTextSmall}>
            {t.messageDataRates || 'Message and data rates may apply based on your order.'}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialCommunityIcons name="truck-delivery-outline" size={18} color="#64748B" />
              <Text style={styles.sectionTitle}>{t.deliveryInstructions || 'Delivery Instructions'}</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.sectionActionText}>{t.seeAll || 'See All'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.instructionsContainer}>
            <TextInput
              value={deliveryInstructions}
              onChangeText={handleInstructionChange}
              placeholder={t.deliveryInstructionsPlaceholder || 'Just leave them in front of the door...'}
              style={styles.instructionsInput}
              multiline
              numberOfLines={5}
              maxLength={MAX_INSTRUCTIONS_LENGTH}
              textAlignVertical="top"
            />
            <View style={styles.instructionsFooter}>
              <Text style={styles.helperTextSmall}>
                {t.optionalNotesFor || 'Optional notes for the'} {fulfilmentType === 'collection' ? (t.collection || 'collection') : (t.delivery || 'delivery')}.
              </Text>
              <Text style={styles.helperTextSmall}>
                {deliveryInstructions.length}/{MAX_INSTRUCTIONS_LENGTH}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.priceBreakdown || 'Price Breakdown'}</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t.itemPrice || 'Item price'}</Text>
              <Text style={styles.summaryValue}>
                {product ? formatCurrency(selectedVariant?.price_override ?? product.price, currency) : '—'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {fulfilmentType === 'collection' ? (t.collectionFee || 'Collection fee') : (t.deliveryFee || 'Delivery fee')}
              </Text>
              <Text style={styles.summaryValue}>
                {fulfilmentFee > 0 ? formatCurrency(fulfilmentFee, currency) : (t.free || 'Free')}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t.buyerProtection || 'Buyer protection'}</Text>
              <Text style={styles.summaryValue}>{formatCurrency(buyerProtectionFee, currency)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRowTotal}>
              <Text style={styles.summaryTotalLabel}>{t.total || 'Total'}</Text>
              <Text style={styles.summaryTotalValue}>{formatCurrency(orderTotal, currency)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View>
          <Text style={styles.footerLabel}>{t.payableToday || 'Payable today'}</Text>
          <Text style={styles.footerAmount}>{formatCurrency(orderTotal, currency)}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.footerButton,
            (!fulfilmentSelectionReady || isPlacingOrder || fulfilmentMethodLoading) && styles.footerButtonDisabled,
          ]}
          onPress={handlePlaceOrder}
          disabled={!fulfilmentSelectionReady || isPlacingOrder || fulfilmentMethodLoading}
        >
          {isPlacingOrder ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.footerButtonText}>{t.placeOrder || 'Place Order'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <LocationPicker
        visible={isPickupPickerVisible}
        onClose={() => setPickupPickerVisible(false)}
        onSelect={() => {}} // Not used with apply button pattern
        onApply={address => {
          setSelectedPickupAddress(address);
          setPickupPickerVisible(false);
          queryClient.invalidateQueries({ queryKey: ['pickup-addresses', user?.id] });
        }}
        selectedAddressId={selectedPickupAddress?.id}
        showTabs
        defaultTab="collection"
        title={t.selectCollectionPoint || 'Select Collection Point'}
        selectionType="pickup"
      />

      <VerificationModal
        visible={verificationModalVisible}
        onClose={() => setVerificationModalVisible(false)}
        onSubmitted={() => {
          verification.refetch();
          setVerificationModalVisible(false);
        }}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 140,
  },
  verificationBanner: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#facc15',
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  verificationBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  verificationBannerText: {
    flex: 1,
    color: '#92400e',
    fontSize: 14,
    lineHeight: 20,
  },
  verificationBannerButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#facc15',
    paddingHorizontal: 16,
    height: UI.dimensions.buttonHeight,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: UI.dimensions.borderRadius,
  },
  verificationBannerButtonText: {
    color: '#78350f',
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  fulfilmentToggle: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  fulfilmentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  fulfilmentOptionActive: {
    borderColor: '#61d5b6',
    backgroundColor: '#ECFDF5',
  },
  fulfilmentOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  fulfilmentOptionTextActive: {
    color: '#0F172A',
  },
  collectionInfoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  collectionInfoText: {
    flex: 1,
  },
  collectionInfoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 4,
  },
  collectionInfoSubtitle: {
    fontSize: 13,
    color: '#047857',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  sectionLoading: {
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 64,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  sectionErrorText: {
    color: '#DC2626',
    fontSize: 14,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
  },
  productImage: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  productImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  sellerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  productSubtitle: {
    fontSize: 13,
    color: '#475569',
  },
  variantDescription: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#61d5b6',
    marginTop: 12,
  },
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 96,
    justifyContent: 'center',
  },
  locationContent: {
    flexDirection: 'row',
    gap: 12,
  },
  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  locationDetails: {
    flex: 1,
    gap: 4,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  locationSubtitle: {
    fontSize: 14,
    color: '#334155',
  },
  locationMeta: {
    fontSize: 13,
    color: '#64748B',
  },
  locationEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  locationEmptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  helperText: {
    marginTop: 8,
    fontSize: 13,
    color: '#64748B',
  },
  helperTextSmall: {
    marginTop: 8,
    fontSize: 12,
    color: '#94A3B8',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#475569',
  },
  summaryValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  summaryRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 16,
  },
  footerLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  footerAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  footerButton: {
    flex: 1,
    height: UI.dimensions.buttonHeight,
    borderRadius: UI.dimensions.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.colors.primary,
  },
  footerButtonDisabled: {
    opacity: 0.6,
  },
  footerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  phoneInputContainerFullWidth: {
    borderRadius: UI.dimensions.borderRadius,
    borderWidth: UI.dimensions.borderWidth,
    borderColor: UI.colors.border,
    backgroundColor: UI.colors.background,
    paddingHorizontal: 16,
    height: UI.dimensions.inputHeight,
    justifyContent: 'center',
    marginTop: 12,
  },
  phoneInput: {
    fontSize: 16,
    color: '#0F172A',
    paddingVertical: 12,
  },
  instructionsContainer: {
    borderRadius: UI.dimensions.borderRadius,
    borderWidth: UI.dimensions.borderWidth,
    borderColor: UI.colors.border,
    backgroundColor: UI.colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  instructionsInput: {
    fontSize: 15,
    color: '#0F172A',
    minHeight: 120,
  },
  instructionsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
});
