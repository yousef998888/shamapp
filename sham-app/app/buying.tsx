import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthContext } from '@/contexts/AuthContext';
import OrderService from '@/services/OrderService';
import PaymentInstructionsModal from '@/components/orders/PaymentInstructionsModal';
import OrderDetailsModal from '@/components/orders/OrderDetailsModal';
import PageHeader from '@/components/PageHeader';
import type { Order } from '@/types/database';
import { ORDER_STATUS_META } from '@/constants/orderStatus';
import { usePageTranslation } from '@/hooks/useTranslation';
import { UI } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

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

const getPrimaryImage = (order: Order): string | undefined => {
  const images = (order.product as any)?.product_images || (order.product as any)?.images;
  if (Array.isArray(images) && images.length > 0) {
    const primary = images.find((img: any) => img?.is_primary);
    return primary?.image_url || images[0]?.image_url;
  }
  return undefined;
};

const BuyingScreen: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuthContext();
  const { t } = usePageTranslation('buyingPage');

  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const {
    data: orders,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['buyer-orders', user?.id],
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return OrderService.getOrders(user.id, 'buyer');
    },
    enabled: !!user?.id,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const stats = useMemo(() => {
    const list = orders || [];
    const total = list.length;
    const pending = list.filter(order => order.status === 'pending_payment').length;
    const shipping = list.filter(order => order.status === 'shipped').length;
    const completed = list.filter(order => order.status === 'completed').length;
    return { total, pending, shipping, completed };
  }, [orders]);

  const openPaymentModal = (order: Order) => {
    setSelectedOrder(order);
    setPaymentModalVisible(true);
  };

  const openOrderDetails = useCallback(
    async (order: Order) => {
      setDetailsOrder(order);
      setDetailsVisible(true);
      const needsLoader = !order.statuses || order.statuses.length === 0;
      if (needsLoader) {
        setDetailsLoading(true);
      }

      try {
        const fresh = await OrderService.getOrder(order.id);
        if (fresh) {
          setDetailsOrder(fresh);
        }
      } catch (error) {
        console.error('Error fetching order details', error);
      } finally {
        if (needsLoader) {
          setDetailsLoading(false);
        }
      }
    },
    []
  );

  const closeOrderDetails = () => {
    setDetailsVisible(false);
    setDetailsOrder(null);
    setDetailsLoading(false);
  };

  const handleSubmitPaymentProof = useCallback(
    async (paymentId: string, receiptUri: string | null) => {
      if (!selectedOrder) return;
      setPaymentSubmitting(true);
      
      let receiptUrl: string | null = null;
      if (receiptUri) {
        receiptUrl = await OrderService.uploadPaymentReceipt(selectedOrder.id, receiptUri);
        if (!receiptUrl) {
          Alert.alert('Upload Error', 'Failed to upload receipt. Please try again.');
          setPaymentSubmitting(false);
          return;
        }
      }
      
      const amount = selectedOrder.grand_total;
      const success = await OrderService.submitPaymentProof(
        selectedOrder.id,
        paymentId,
        amount,
        selectedOrder.currency,
        receiptUrl
      );
      setPaymentSubmitting(false);

      if (success) {
        Alert.alert(t.paymentSubmitted || 'Payment submitted', t.paymentSubmittedMessage || 'Thanks! We will review your payment shortly.');
        setPaymentModalVisible(false);
        setSelectedOrder(null);
        const result = await refetch();
        if (result.data) {
          const updated = result.data.find(order => order.id === detailsOrder?.id);
          if (updated) {
            setDetailsOrder(updated);
          }
        }
      } else {
        Alert.alert(t.unableToSubmit || 'Unable to submit', t.checkPaymentId || 'Please check the payment ID and try again.');
      }
    },
    [detailsOrder?.id, refetch, selectedOrder]
  );

  const handleConfirmReceipt = useCallback(
    async (order: Order) => {
      if (!user?.id) return;
      setConfirmingOrderId(order.id);
      const success = await OrderService.updateOrderStatus(
        order.id,
        'completed',
        user.id,
        'Confirmed via mobile app'
      );
      setConfirmingOrderId(null);

      if (success) {
        Alert.alert(t.orderCompleted || 'Order completed', t.thanksForConfirming || 'Thanks for confirming receipt. Enjoy your purchase!');
        const result = await refetch();
        if (result.data) {
          const updated = result.data.find(item => item.id === detailsOrder?.id);
          if (updated) {
            setDetailsOrder(updated);
          }
        }
      } else {
        Alert.alert(t.updateFailed || 'Update failed', t.updateFailedMessage || 'We could not update the order status. Please try again later.');
      }
    },
    [detailsOrder?.id, refetch, user?.id]
  );

  const handleTrackOrder = useCallback((order: Order) => {
    if (order.delivery?.tracking_number) {
      Alert.alert(t.trackingInformation || 'Tracking information', `${t.trackingNumber || 'Tracking number'}: ${order.delivery.tracking_number}`);
    } else {
      Alert.alert(t.trackingUnavailable || 'Tracking unavailable', t.trackingUnavailableMessage || 'The seller will provide tracking details once they dispatch the item.');
    }
  }, [t]);

  const handleHelpWithOrder = useCallback((_order: Order) => {
    router.push('/(tabs)/index');
  }, [router]);

  const handleCancelOrder = useCallback((_order: Order) => {
    Alert.alert(
      t.needToCancel || 'Need to cancel?',
      t.contactSupport || 'Please contact support so we can review the cancellation with the seller.'
    );
  }, [t]);

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title={t.buying || 'Buying'} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#61d5b6" />
          <Text style={{ marginTop: 12, color: '#6B7280' }}>{t.loading || 'Loading...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title={t.buying || 'Buying'} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <IconSymbol name="bag.fill" size={80} color="#61d5b6" />
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#1F2937', textAlign: 'center', marginTop: 24, marginBottom: 12 }}>
            {t.signInToViewOrders || 'Sign in to view your orders'}
          </Text>
          <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 32, lineHeight: 24 }}>
            {t.buyingDescription || 'Track your purchases and manage your orders'}
          </Text>
          <TouchableOpacity
            style={{ width: '100%', paddingVertical: 16, backgroundColor: '#61d5b6', borderRadius: 12, alignItems: 'center', marginBottom: 12, shadowColor: '#61d5b6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>{t.signIn || 'Sign In'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ width: '100%', paddingVertical: 16, backgroundColor: '#FFFFFF', borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#61d5b6' }}
            onPress={() => router.push('/auth/signup')}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#61d5b6' }}>{t.createAccount || 'Create Account'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderOrderCard = (order: Order) => {
    const meta = ORDER_STATUS_META[order.status];
    const productTitle = order.product?.title || 'Product';
    const orderImage = getPrimaryImage(order);
    const nextAction =
      order.status === 'pending_payment' || order.status === 'payment_submitted'
        ? () => openPaymentModal(order)
        : order.status === 'delivered'
          ? () => handleConfirmReceipt(order)
          : undefined;
    const actionLabel = meta?.action;
    const isConfirming = confirmingOrderId === order.id;

    return (
      <View key={order.id} style={styles.orderCard}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.orderSummaryTouchable}
          onPress={() => openOrderDetails(order)}
        >
          <View style={styles.orderHeader}>
            <View style={styles.orderHeaderLeft}>
              {orderImage ? (
                <Image source={{ uri: orderImage }} style={styles.orderImage} />
              ) : (
                <View style={[styles.orderImage, styles.orderImagePlaceholder]}>
                  <MaterialCommunityIcons name="image-off-outline" size={20} color="#94A3B8" />
                </View>
              )}
              <View style={styles.orderTitleBlock}>
                <Text style={styles.orderTitle}>{productTitle}</Text>
                <Text style={styles.orderSubtitle}>{`Order #${order.id.slice(0, 6).toUpperCase()}`}</Text>
              </View>
            </View>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: meta?.background || '#E2E8F0' },
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  { color: meta?.color || '#1E293B' },
                ]}
              >
                {meta?.label || order.status}
              </Text>
            </View>
          </View>

          <View style={styles.orderRow}>
            <View style={styles.orderPriceBlock}>
              <Text style={styles.orderPriceLabel}>{t.totalPaid || 'Total paid'}</Text>
              <Text style={styles.orderPriceValue}>
                {formatCurrency(order.grand_total, order.currency)}
              </Text>
            </View>
            <View style={styles.orderMetaBlock}>
              <MaterialCommunityIcons name="truck-outline" size={18} color="#64748B" />
              <Text style={styles.orderMetaText}>
                {order.delivery?.delivery_type === 'seller_collection'
                  ? t.collection || 'Collection'
                  : order.delivery?.delivery_type === 'pickup_point'
                  ? t.courierDropoff || 'Courier Drop-off'
                  : t.delivery || 'Delivery'}
              </Text>
            </View>
          </View>

          <View style={[styles.infoBox, { backgroundColor: meta?.background || '#F8FAFC' }]}>
            <Text
              style={[
                styles.infoBoxText,
                { color: meta?.color || '#1E293B' },
              ]}
            >
              {(() => {
                // Customize description based on delivery type for delivered orders
                if (order.status === 'delivered' && order.delivery?.delivery_type === 'pickup_point') {
                  return 'Your order has arrived at the collection point and is ready for pickup.';
                } else if (order.status === 'delivered' && order.delivery?.delivery_type === 'seller_collection') {
                  return 'Ready for collection. Arrange pickup with the seller.';
                }
                return meta?.description || 'Order update pending.';
              })()}
            </Text>
            {/* Show collection point info and tracking when delivered */}
            {order.status === 'delivered' && order.delivery?.delivery_type === 'pickup_point' && (
              <View style={styles.deliveredInfoContainer}>
                {order.delivery?.pickup_location_data && (
                  <View style={styles.deliveredInfoRow}>
                    <MaterialCommunityIcons name="storefront-outline" size={16} color={meta?.color || '#1E293B'} />
                    <Text style={[styles.deliveredInfoText, { color: meta?.color || '#1E293B' }]}>
                      {order.delivery.pickup_location_data.name}
                    </Text>
                  </View>
                )}
                {order.delivery?.pickup_location_data?.address && (
                  <View style={styles.deliveredInfoRow}>
                    <MaterialCommunityIcons name="map-marker-outline" size={16} color={meta?.color || '#1E293B'} />
                    <Text style={[styles.deliveredInfoText, { color: meta?.color || '#1E293B' }]}>
                      {order.delivery.pickup_location_data.address}
                    </Text>
                  </View>
                )}
                {order.delivery?.tracking_number && (
                  <View style={styles.deliveredInfoRow}>
                    <MaterialCommunityIcons name="barcode-scan" size={16} color={meta?.color || '#1E293B'} />
                    <Text style={[styles.deliveredInfoText, { color: meta?.color || '#1E293B' }]}>
                      Tracking: {order.delivery.tracking_number}
                    </Text>
                  </View>
                )}
              </View>
            )}
            {/* Show tracking for shipped orders with collection point */}
            {order.status === 'shipped' && order.delivery?.delivery_type === 'pickup_point' && order.delivery?.tracking_number && (
              <View style={styles.deliveredInfoContainer}>
                <View style={styles.deliveredInfoRow}>
                  <MaterialCommunityIcons name="barcode-scan" size={16} color={meta?.color || '#1E293B'} />
                  <Text style={[styles.deliveredInfoText, { color: meta?.color || '#1E293B' }]}>
                    Tracking: {order.delivery.tracking_number}
                  </Text>
                </View>
                {order.delivery?.pickup_location_data && (
                  <View style={styles.deliveredInfoRow}>
                    <MaterialCommunityIcons name="storefront-outline" size={16} color={meta?.color || '#1E293B'} />
                    <Text style={[styles.deliveredInfoText, { color: meta?.color || '#1E293B' }]}>
                      Will arrive at: {order.delivery.pickup_location_data.name}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.cardFooter}>
          <View style={styles.cardFooterActions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push({ pathname: '/product/[id]', params: { id: order.product_id } })}
            >
              <MaterialCommunityIcons name="eye-outline" size={18} color="#1E40AF" />
              <Text style={styles.secondaryButtonText}>{t.viewProduct || 'View Product'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => openOrderDetails(order)}
            >
              <MaterialCommunityIcons name="clipboard-text-outline" size={18} color="#1E40AF" />
              <Text style={styles.secondaryButtonText}>{t.seeOrderDetails || 'See Order Details'}</Text>
            </TouchableOpacity>
          </View>

          {nextAction && actionLabel && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={nextAction}
              disabled={paymentSubmitting || isConfirming}
            >
              {order.status === 'pending_payment' && (
                <MaterialCommunityIcons name="cash-plus" size={18} color="#FFFFFF" />
              )}
              {order.status === 'payment_submitted' && (
                <MaterialCommunityIcons name="pencil-outline" size={18} color="#FFFFFF" />
              )}
              {order.status === 'delivered' && (
                <MaterialCommunityIcons name="check-circle-outline" size={18} color="#FFFFFF" />
              )}
              {isConfirming ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>{actionLabel}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="shopping-outline" size={48} color="#94A3B8" />
      <Text style={styles.emptyTitle}>{t.noPurchasesYet || 'No purchases yet'}</Text>
      <Text style={styles.emptySubtitle}>
        {t.startShoppingMessage || 'Start shopping to see your orders here. We will keep track of every purchase you make.'}
      </Text>
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => router.push('/(tabs)/index')}
      >
        <Text style={styles.browseButtonText}>{t.browseMarketplace || 'Browse Marketplace'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <PageHeader title={t.myPurchases || 'My Purchases'} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#61d5b6" />
        }
      >

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t.totalOrders || 'Total Orders'}</Text>
            <Text style={styles.statValue}>{stats.total}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t.pendingPayment || 'Pending Payment'}</Text>
            <Text style={styles.statValue}>{stats.pending}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t.inTransit || 'In Transit'}</Text>
            <Text style={styles.statValue}>{stats.shipping}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t.completed || 'Completed'}</Text>
            <Text style={styles.statValue}>{stats.completed}</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#61d5b6" />
            <Text style={styles.loadingText}>{t.loadingPurchases || 'Loading your purchases…'}</Text>
          </View>
        ) : (orders || []).length === 0 ? (
          renderEmpty()
        ) : (
          <View style={styles.orderList}>
            {(orders || []).map(order => renderOrderCard(order))}
          </View>
        )}
      </ScrollView>

      <OrderDetailsModal
        visible={detailsVisible}
        order={detailsOrder}
        loading={detailsLoading}
        onClose={closeOrderDetails}
        onSubmitPayment={openPaymentModal}
        onConfirmReceipt={handleConfirmReceipt}
        onTrackOrder={handleTrackOrder}
        onHelp={handleHelpWithOrder}
        onCancelOrder={handleCancelOrder}
        confirmingOrderId={confirmingOrderId}
        paymentSubmitting={paymentSubmitting}
      />

      <PaymentInstructionsModal
        visible={paymentModalVisible}
        onClose={() => {
          setPaymentModalVisible(false);
          setSelectedOrder(null);
        }}
        onSubmit={handleSubmitPaymentProof}
        submitting={paymentSubmitting}
        defaultPaymentId={selectedOrder?.payment_id || selectedOrder?.payment?.payment_id || null}
        totalAmount={selectedOrder?.grand_total}
        currency={selectedOrder?.currency || selectedOrder?.product?.currency || null}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 48,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statCard: {
    flexBasis: '47%',
    backgroundColor: UI.colors.background,
    borderRadius: UI.dimensions.borderRadius,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: UI.dimensions.borderWidth,
    borderColor: UI.colors.border,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  statValue: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  loadingState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#475569',
  },
  orderList: {
    paddingHorizontal: 20,
    gap: 16,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
  },
  orderSummaryTouchable: {
    gap: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  orderImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  orderImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderTitleBlock: {
    flex: 1,
    gap: 4,
  },
  orderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  orderSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderPriceBlock: {
    gap: 4,
  },
  orderPriceLabel: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  orderPriceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  orderMetaBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderMetaText: {
    fontSize: 13,
    color: '#475569',
  },
  infoBox: {
    borderRadius: 16,
    padding: 14,
  },
  infoBoxText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  deliveredInfoContainer: {
    marginTop: 12,
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  deliveredInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  deliveredInfoText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  cardFooter: {
    gap: 12,
  },
  cardFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: UI.dimensions.buttonHeight,
    paddingHorizontal: 16,
    borderRadius: UI.dimensions.borderRadius,
    borderWidth: UI.dimensions.borderWidth,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: UI.dimensions.buttonHeight,
    paddingHorizontal: 16,
    borderRadius: UI.dimensions.borderRadius,
    backgroundColor: UI.colors.primary,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyState: {
    marginTop: 40,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
  },
  browseButton: {
    marginTop: 8,
    backgroundColor: UI.colors.primary,
    paddingHorizontal: 20,
    height: UI.dimensions.buttonHeight,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: UI.dimensions.borderRadius,
  },
  browseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default BuyingScreen;
