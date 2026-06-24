import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { supabase } from '@/utils/supabase';
import OrderService from '@/services/OrderService';
import PaymentInstructionsModal from '@/components/orders/PaymentInstructionsModal';
import { usePageTranslation } from '@/hooks/useTranslation';

interface RecommendedProduct {
  id: string;
  title: string;
  price: number;
  currency: string;
  image_url?: string | null;
}

const fetchRecommendedProducts = async (excludeId?: string): Promise<RecommendedProduct[]> => {
  let query = supabase
    .from('products')
    .select(
      `
      id,
      title,
      price,
      currency,
      status,
      images:product_images(image_url)
    `
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(6);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('fetchRecommendedProducts error', error);
    return [];
  }

  return (data || []).map(item => {
    const imageUrl = Array.isArray(item.images) && item.images.length > 0 ? item.images[0].image_url : null;
    return {
      id: item.id,
      title: item.title,
      price: item.price,
      currency: item.currency,
      image_url: imageUrl,
    };
  });
};

const formatCurrency = (value?: number, currency?: string) => {
  if (value == null) return '—';
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

export default function CheckoutSuccessScreen() {
  const insets = useSafeAreaInsets();
  const { t } = usePageTranslation('checkoutPage');
  const { orderId, total, productId, productTitle, productImage } = useLocalSearchParams<{
    orderId?: string;
    total?: string;
    productId?: string;
    productTitle?: string;
    productImage?: string;
  }>();

  const orderTotal = useMemo(() => {
    if (!total) return null;
    const parsed = Number(total);
    return Number.isNaN(parsed) ? null : parsed;
  }, [total]);

  const { data: recommendedProducts } = useQuery({
    queryKey: ['checkout-recommendations', productId],
    queryFn: () => fetchRecommendedProducts(productId),
  });

  const { data: orderDetails, refetch: refetchOrder, isFetching: orderLoading } = useQuery({
    queryKey: ['checkout-order', orderId],
    queryFn: () => OrderService.getOrder(orderId!),
    enabled: !!orderId,
  });

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const shortOrderId = useMemo(() => {
    if (!orderId) return '—';
    return `#${orderId.slice(0, 8).toUpperCase()}`;
  }, [orderId]);

  const summaryImage = useMemo(() => {
    if (productImage) return productImage;
    const images = (orderDetails?.product as any)?.images;
    if (Array.isArray(images) && images.length > 0) {
      const primary = images.find((img: any) => img.is_primary);
      return primary?.image_url || images[0]?.image_url || undefined;
    }
    return undefined;
  }, [orderDetails?.product, productImage]);

  const primaryCta = () => {
    router.replace('/buying');
  };

  const viewOrderStatus = () => {
    router.push('/buying');
  };

  const contactSupport = () => {
    router.push('/(tabs)/index');
  };

  const goToHome = () => {
    router.replace('/(tabs)/index');
  };

  const currentStatus = orderDetails?.status || 'pending_payment';
  const isCollectionOrder =
    currentStatus === 'awaiting_collection' ||
    orderDetails?.delivery?.delivery_type === 'seller_collection';
  const statusSteps = useMemo(() => {
    if (isCollectionOrder) {
      return [
        {
          key: 'awaiting_collection',
          title: t.awaitingCollection || 'Awaiting Collection',
          description: t.chatWithSellerToArrange || 'Chat with the seller to arrange a pickup time and place.',
          icon: 'chat-processing-outline',
        },
        {
          key: 'completed',
          title: t.collected || 'Collected',
          description: t.markOrderAsComplete || 'Mark the order as complete once you have the item.',
          icon: 'handshake-outline',
        },
      ];
    }

    return [
      {
        key: 'pending_payment',
        title: t.paymentRequired || 'Payment Required',
        description: t.sendPaymentViaShamCash || 'Send payment via Sham Cash and add your payment ID to continue.',
        icon: 'clock-outline',
      },
      {
        key: 'payment_submitted',
        title: t.paymentSubmitted || 'Payment Submitted',
        description: t.reviewingPaymentProof || 'We are reviewing your payment proof.',
        icon: 'check-circle-outline',
      },
      {
        key: 'admin_approved',
        title: t.paymentApproved || 'Payment Approved',
        description: t.sellerCanDispatch || 'The seller can now dispatch your item.',
        icon: 'shield-check-outline',
      },
      {
        key: 'shipped',
        title: t.dispatched || 'Dispatched',
        description: t.orderOnTheWay || 'Your order is on the way to you.',
        icon: 'truck-delivery-outline',
      },
      {
        key: 'delivered',
        title: t.delivered || 'Delivered',
        description: t.confirmReceipt || 'Confirm receipt once the item arrives.',
        icon: 'package-variant-closed',
      },
      {
        key: 'completed',
        title: t.completed || 'Completed',
        description: t.transactionComplete || 'Transaction complete. Enjoy your purchase!',
        icon: 'star-circle-outline',
      },
    ];
  }, [isCollectionOrder]);

  const currentStepIndex = useMemo(() => {
    const index = statusSteps.findIndex(step => step.key === currentStatus);
    return index >= 0 ? index : 0;
  }, [currentStatus, statusSteps]);

  const handleSubmitPaymentProof = useCallback(
    async (paymentId: string, receiptUri: string | null) => {
      if (!orderId) return;

      setPaymentSubmitting(true);
      
      let receiptUrl: string | null = null;
      if (receiptUri) {
        receiptUrl = await OrderService.uploadPaymentReceipt(orderId, receiptUri);
        if (!receiptUrl) {
          Alert.alert('Upload Error', 'Failed to upload receipt. Please try again.');
          setPaymentSubmitting(false);
          return;
        }
      }
      
      const amount = orderDetails?.grand_total ?? orderTotal ?? 0;
      const currency = orderDetails?.currency ?? orderDetails?.product?.currency ?? 'GBP';
      const success = await OrderService.submitPaymentProof(orderId, paymentId, amount, currency, receiptUrl);
      setPaymentSubmitting(false);

      if (success) {
        setPaymentModalVisible(false);
        Alert.alert(t.paymentSubmitted || 'Payment submitted', t.thanksWillReview || 'Thanks! We will review your payment shortly.');
        refetchOrder();
      } else {
        Alert.alert(t.somethingWentWrong || 'Something went wrong', t.couldNotSubmitPayment || 'We could not submit the payment proof. Please try again.');
      }
    },
    [orderDetails, orderId, orderTotal, refetchOrder]
  );

  // Handle back button to navigate to product page
  useEffect(() => {
    const backAction = () => {
      if (productId) {
        router.replace(`/product/${productId}`);
      } else {
        router.replace('/buying');
      }
      return true; // Prevent default back behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [productId]);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconWrapper}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="check" size={36} color="#0F172A" />
          </View>
        </View>

        <Text style={styles.heading}>{t.checkoutSuccessful || 'Checkout Successful.'}</Text>
        <Text style={styles.subheading}>{t.orderConfirmed || 'Your order is confirmed and we will keep you posted on the next steps.'}</Text>

        <View style={styles.orderSummaryCard}>
          <View style={styles.orderSummaryHeader}>
            <Text style={styles.orderSummaryLabel}>{t.orderTotal || 'Order total'}</Text>
            <Text style={styles.orderSummaryValue}>
              {formatCurrency(
                orderDetails?.grand_total ?? orderTotal ?? undefined,
                orderDetails?.currency ?? undefined
              )}
            </Text>
          </View>
          <View style={styles.orderSummaryBody}>
            {summaryImage ? (
              <Image source={{ uri: summaryImage }} style={styles.productImage} />
            ) : (
              <View style={[styles.productImage, styles.productPlaceholder]}>
                <MaterialCommunityIcons name="image-off-outline" size={24} color="#94A3B8" />
              </View>
            )}
            <View style={styles.productDetails}>
              <Text style={styles.productTitle}>
                {productTitle || orderDetails?.product?.title || 'Product'}
              </Text>
              <Text style={styles.productMeta}>{orderId ? `${t.order || 'Order'} ${shortOrderId}` : (t.orderConfirmed || 'Order confirmed')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusHeaderContent}>
              <Text style={styles.statusHeading}>{t.nextSteps || 'Next steps'}</Text>
              <Text style={styles.statusSubheading}>
                {statusSteps[currentStepIndex]?.description}
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{statusSteps[currentStepIndex]?.title}</Text>
            </View>
          </View>

          <View style={styles.timeline}>
            {statusSteps.map((step, index) => {
              const isActive = index <= currentStepIndex;
              return (
                <View key={step.key} style={styles.timelineItem}>
                  <View style={[styles.timelineCircle, isActive && styles.timelineCircleActive]}>
                    <MaterialCommunityIcons
                      name={step.icon as any}
                      size={18}
                      color={isActive ? '#FFFFFF' : '#94A3B8'}
                    />
                  </View>
                  <Text style={[styles.timelineLabel, isActive && styles.timelineLabelActive]}>
                    {step.title}
                  </Text>
                </View>
              );
            })}
          </View>

          {orderLoading && (
            <View style={styles.statusLoading}>
              <ActivityIndicator color="#4338CA" size="small" />
              <Text style={styles.statusLoadingText}>{t.refreshingStatus || 'Refreshing status…'}</Text>
            </View>
          )}

          {currentStatus === 'pending_payment' && orderId && !isCollectionOrder && (
            <TouchableOpacity
              style={styles.statusPrimaryButton}
              onPress={() => setPaymentModalVisible(true)}
            >
              <MaterialCommunityIcons name="cash-plus" size={18} color="#FFFFFF" />
              <Text style={styles.statusPrimaryButtonText}>{t.submitPaymentProof || 'Submit Payment Proof'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.ctaStack}>
          <TouchableOpacity style={styles.primaryButton} onPress={primaryCta}>
            <Text style={styles.primaryButtonText}>{t.seeMyPurchases || 'See My Purchases'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={viewOrderStatus}>
            <Text style={styles.secondaryButtonText}>{t.seeOrderStatus || 'See Order Status'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.homeButton} onPress={goToHome}>
            <MaterialCommunityIcons name="home" size={18} color="#61d5b6" />
            <Text style={styles.homeButtonLabel}>{t.goToHome || 'Go to Home'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.textButton} onPress={contactSupport}>
            <MaterialCommunityIcons name="lifebuoy" size={18} color="#6366F1" />
            <Text style={styles.textButtonLabel}>{t.needHelp || 'I need help with this'}</Text>
          </TouchableOpacity>
        </View>

        {recommendedProducts && recommendedProducts.length > 0 && (
          <View style={styles.recommendSection}>
            <View style={styles.recommendHeader}>
              <Text style={styles.recommendTitle}>{t.youMightAlsoLike || 'You might also like'}</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/index')}>
                <Text style={styles.sectionActionText}>{t.seeAll || 'See All'}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recommendList}>
              {recommendedProducts.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.recommendCard}
                  onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.id } })}
                >
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.recommendImage} />
                  ) : (
                    <View style={[styles.recommendImage, styles.productPlaceholder]}>
                      <MaterialCommunityIcons name="image-off-outline" size={22} color="#94A3B8" />
                    </View>
                  )}
                  <Text style={styles.recommendName} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.recommendPrice}>{formatCurrency(item.price, item.currency)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      <PaymentInstructionsModal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        onSubmit={handleSubmitPaymentProof}
        submitting={paymentSubmitting}
        defaultPaymentId={orderDetails?.payment_id || orderDetails?.payment?.payment_id || null}
        totalAmount={orderDetails?.grand_total ?? orderTotal}
        currency={orderDetails?.currency ?? orderDetails?.product?.currency ?? null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  iconWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  subheading: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
    textAlign: 'center',
  },
  orderSummaryCard: {
    marginTop: 24,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    gap: 16,
  },
  orderSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderSummaryLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  orderSummaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  orderSummaryBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  productImage: {
    width: 68,
    height: 68,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  productPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productDetails: {
    flex: 1,
    gap: 4,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  productMeta: {
    fontSize: 13,
    color: '#64748B',
  },
  statusCard: {
    marginTop: 24,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    padding: 20,
    gap: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  statusHeaderContent: {
    flex: 1,
    gap: 6,
  },
  statusHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  statusSubheading: {
    fontSize: 13,
    lineHeight: 18,
    color: '#475569',
  },
  statusBadge: {
    backgroundColor: '#4338CA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  timeline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timelineItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timelineCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineCircleActive: {
    backgroundColor: '#6366F1',
  },
  timelineLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  timelineLabelActive: {
    color: '#312E81',
  },
  statusLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E0E7FF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statusLoadingText: {
    fontSize: 13,
    color: '#4338CA',
  },
  statusPrimaryButton: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#61d5b6',
    borderRadius: 16,
    paddingVertical: 14,
  },
  statusPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  ctaStack: {
    marginTop: 32,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#61d5b6',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#61d5b6',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#61d5b6',
    fontSize: 16,
    fontWeight: '700',
  },
  textButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  textButtonLabel: {
    color: '#6366F1',
    fontSize: 15,
    fontWeight: '600',
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  homeButtonLabel: {
    color: '#61d5b6',
    fontSize: 15,
    fontWeight: '600',
  },
  recommendSection: {
    marginTop: 40,
    gap: 16,
  },
  recommendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recommendTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  recommendList: {
    gap: 16,
  },
  recommendCard: {
    width: 160,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
  },
  recommendImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  recommendName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  recommendPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#61d5b6',
  },
});
