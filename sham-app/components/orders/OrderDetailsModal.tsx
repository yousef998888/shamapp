import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import type { Order, OrderStatus } from '@/types/database';
import { ORDER_STATUS_META, ORDER_STATUS_SEQUENCE } from '@/constants/orderStatus';
import { UI } from '@/constants/theme';

interface OrderDetailsModalProps {
  visible: boolean;
  order: Order | null;
  loading?: boolean;
  onClose: () => void;
  onSubmitPayment: (order: Order) => void;
  onConfirmReceipt: (order: Order) => void;
  onTrackOrder: (order: Order) => void;
  onHelp: (order: Order) => void;
  onCancelOrder: (order: Order) => void;
  confirmingOrderId?: string | null;
  paymentSubmitting?: boolean;
}

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

const formatDate = (value?: string | null) => {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  visible,
  order,
  loading = false,
  onClose,
  onSubmitPayment,
  onConfirmReceipt,
  onTrackOrder,
  onHelp,
  onCancelOrder,
  confirmingOrderId,
  paymentSubmitting = false,
}) => {
  const meta = order ? ORDER_STATUS_META[order.status] : null;
  const deliveryType = order?.delivery?.delivery_type ?? order?.delivery_type ?? null;
  const isPickupOrder = deliveryType === 'pickup_point';
  const isSellerCollection = deliveryType === 'seller_collection';

  const primaryImage = useMemo(() => {
    if (!order) return null;
    const images = (order.product as any)?.product_images || (order.product as any)?.images;
    if (Array.isArray(images) && images.length > 0) {
      const primary = images.find((img: any) => img?.is_primary);
      return primary?.image_url || images[0]?.image_url;
    }
    return null;
  }, [order]);

  const timelineItems = useMemo(() => {
    if (!order) return [];

    const statusMap = new Map<Order['status'], OrderStatus>();
    (order.statuses || []).forEach(status => {
      statusMap.set(status.status, status);
    });

    const currentIndex = ORDER_STATUS_SEQUENCE.indexOf(order.status);

    const baseSequence = ORDER_STATUS_SEQUENCE.filter(status => status !== 'cancelled');

    const items = baseSequence.map((status, index) => {
      const statusMeta = ORDER_STATUS_META[status];
      const record = statusMap.get(status);
      const isCurrent = order.status === status;
      const isCompleted = index < currentIndex || isCurrent;

      return {
        key: status,
        title: statusMeta.label,
        description: statusMeta.timelineDescription,
        icon: statusMeta.icon,
        date: record?.created_at ?? null,
        isCurrent,
        isCompleted,
      };
    });

    if (order.status === 'cancelled') {
      items.push({
        key: 'cancelled',
        title: ORDER_STATUS_META.cancelled.label,
        description: ORDER_STATUS_META.cancelled.timelineDescription,
        icon: ORDER_STATUS_META.cancelled.icon,
        date: statusMap.get('cancelled')?.created_at ?? order.updated_at ?? null,
        isCurrent: true,
        isCompleted: true,
      });
    }

    return [
      {
        key: 'ordered',
        title: 'Order placed',
        description: 'We have received your order and shared the details with the seller.',
        icon: 'cart-arrow-down',
        date: order.created_at,
        isCompleted: true,
        isCurrent: ORDER_STATUS_SEQUENCE.indexOf(order.status) < 0,
      },
      ...items,
    ];
  }, [order]);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <MaterialCommunityIcons name="close" size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Order Details</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color="#61d5b6" size="large" />
              <Text style={styles.loadingText}>Loading order details…</Text>
            </View>
          ) : !order ? (
            <View style={styles.loadingState}>
              <MaterialCommunityIcons name="alert-circle-outline" size={28} color="#64748B" />
              <Text style={styles.loadingText}>We could not load this order. Please try again.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.summaryCard}>
                {primaryImage ? (
                  <Image source={{ uri: primaryImage }} style={styles.productImage} />
                ) : (
                  <View style={[styles.productImage, styles.productPlaceholder]}>
                    <MaterialCommunityIcons name="image-off-outline" size={30} color="#94A3B8" />
                  </View>
                )}

                <View style={styles.statusPill}>
                  <MaterialCommunityIcons
                    name={meta?.icon as any}
                    size={16}
                    color={meta?.color || '#1D4ED8'}
                  />
                  <Text style={[styles.statusPillText, { color: meta?.color || '#1D4ED8' }]}>
                    {meta?.label || order.status}
                  </Text>
                </View>

                <Text style={styles.orderId}>{`Order #${order.id.slice(0, 8).toUpperCase()}`}</Text>
                <Text style={styles.productTitle}>{order.product?.title || 'Product'}</Text>
                
                {/* Variant information */}
                {order.product_variant_id && (order as any).variant && order.product?.option_groups && (() => {
                  const variant = (order as any).variant;
                  const variantParts: string[] = [];
                  
                  variant.option_values?.forEach((vv: any) => {
                    const optionValue = vv.option_value;
                    if (!optionValue) return;
                    
                    const optionGroup = order.product?.option_groups?.find(group => 
                      group.values?.some(v => v.id === optionValue.id)
                    );
                    
                    if (optionGroup) {
                      variantParts.push(`${optionGroup.name}: ${optionValue.name}`);
                    }
                  });
                  
                  if (variantParts.length === 0) return null;
                  
                  return (
                    <View style={styles.variantInfo}>
                      <Text style={styles.variantText}>
                        {variantParts.join(' • ')}
                      </Text>
                    </View>
                  );
                })()}
                
                <Text style={styles.orderMeta}>
                  {`Qty: ${order.quantity} • Purchased ${formatDate(order.created_at) || '—'}`}
                </Text>
                <Text style={styles.deliveryMeta}>
                  {order.estimated_delivery_date
                    ? `Arriving ${formatDate(order.estimated_delivery_date)}`
                    : order.delivery?.delivery_method?.estimated_days
                      ? `Estimated delivery: ${order.delivery.delivery_method.estimated_days} days`
                      : 'Delivery estimate will be shared soon'}
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Timeline</Text>
                <View style={styles.timelineContainer}>
                  {timelineItems.map((item, index) => {
                    const isLast = index === timelineItems.length - 1;
                    return (
                      <View key={item.key} style={styles.timelineItem}>
                        <View style={styles.timelineIconWrap}>
                          <View
                            style={[
                              styles.timelineIconCircle,
                              item.isCompleted && styles.timelineIconCircleCompleted,
                              item.isCurrent && styles.timelineIconCircleCurrent,
                            ]}
                          >
                            <MaterialCommunityIcons
                              name={item.icon as any}
                              size={16}
                              color={item.isCompleted ? '#FFFFFF' : '#94A3B8'}
                            />
                          </View>
                          {!isLast && <View style={styles.timelineLine} />}
                        </View>
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineTitle}>{item.title}</Text>
                          <Text style={styles.timelineDescription}>{item.description}</Text>
                          {item.date && (
                            <Text style={styles.timelineDate}>{formatDate(item.date)}</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Shipping Info</Text>
                <View style={styles.infoCard}>
                  <View style={styles.infoHeader}>
                    <MaterialCommunityIcons name="truck-fast-outline" size={20} color="#6366F1" />
                    <Text style={styles.infoHeaderText}>
                      {order.delivery?.delivery_method?.display_name || 'Delivery'}
                    </Text>
                  </View>
                  <Text style={styles.infoBodyText}>
                    {order.delivery?.delivery_method?.estimated_days
                      ? `Estimated delivery: ${order.delivery.delivery_method.estimated_days} days`
                      : 'Delivery estimate pending confirmation'}
                  </Text>
                  <Text style={styles.infoBodyText}>
                    Cost:{' '}
                    <Text style={styles.infoBodyStrong}>
                      {formatCurrency(order.delivery?.delivery_fee ?? order.delivery_fee ?? order.shipping_fee, order.currency)}
                    </Text>
                  </Text>
                  {order.delivery?.tracking_number && (
                    <Text style={styles.infoBodyText}>
                      Tracking: <Text style={styles.infoBodyStrong}>{order.delivery.tracking_number}</Text>
                    </Text>
                  )}
                  {/* Show collection point info when delivered */}
                  {order.status === 'delivered' && order.delivery?.delivery_type === 'pickup_point' && order.delivery?.pickup_location_data && (
                    <View style={styles.collectionPointInfo}>
                      <Text style={styles.infoBodyText}>
                        <Text style={styles.infoBodyStrong}>Collection Point:</Text>
                      </Text>
                      <Text style={styles.infoBodyText}>
                        {order.delivery.pickup_location_data.name}
                      </Text>
                      {order.delivery.pickup_location_data.address && (
                        <Text style={styles.infoBodyText}>
                          {order.delivery.pickup_location_data.address}
                        </Text>
                      )}
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.trackButton}
                    onPress={() => onTrackOrder(order)}
                  >
                    <Text style={styles.trackButtonText}>Track order</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {isSellerCollection
                    ? 'Collection Details'
                    : isPickupOrder
                    ? 'Collection Point'
                    : 'Delivery Address'}
                </Text>
                <View style={styles.infoCard}>
                  {(() => {
                    const isPickup = isPickupOrder;
                    const isCollectionMeetup = isSellerCollection;
                    const shippingAddress =
                      order.delivery?.shipping_address ||
                      (order.shipping_address as any) ||
                      null;
                    const deliveryAddress = order.delivery?.delivery_address || null;
                    const pickupAddress =
                      order.delivery?.pickup_address ||
                      (order.pickup_address as any) ||
                      null;
                    const pickupLocation = order.delivery?.pickup_location_data || null;

                    const iconName = isCollectionMeetup
                      ? 'handshake-outline'
                      : isPickup
                      ? 'storefront-outline'
                      : 'map-marker-radius-outline';
                    const iconColor = isCollectionMeetup
                      ? '#0891B2'
                      : isPickup
                      ? '#F97316'
                      : '#22C55E';
                    const heading = isCollectionMeetup
                      ? 'Arrange via chat'
                      : isPickup
                      ? pickupLocation?.name ||
                        pickupAddress?.title ||
                        'Collection point'
                      : shippingAddress?.title || 'Where we\'ll deliver';

                    const addressLines: string[] = [];

                    if (isCollectionMeetup) {
                      if (deliveryAddress?.instructions) {
                        addressLines.push(deliveryAddress.instructions);
                      }
                      if (order.special_instructions) {
                        addressLines.push(order.special_instructions);
                      }
                      if (order.contact_phone || deliveryAddress?.contact_phone) {
                        addressLines.push(
                          `Contact: ${order.contact_phone || deliveryAddress?.contact_phone}`
                        );
                      }
                      addressLines.push('Use the chat to agree on time and place.');
                    } else if (isPickup) {
                      if (pickupLocation?.address) {
                        addressLines.push(pickupLocation.address);
                      }
                      if (pickupAddress?.address_line_1) {
                        addressLines.push(pickupAddress.address_line_1);
                      }
                      if (pickupAddress?.address_line_2) {
                        addressLines.push(pickupAddress.address_line_2);
                      }
                      const cityLine = [pickupAddress?.city, pickupAddress?.state_province]
                        .filter(Boolean)
                        .join(', ');
                      if (cityLine) {
                        addressLines.push(cityLine);
                      }
                      if (pickupAddress?.postal_code) {
                        addressLines.push(pickupAddress.postal_code);
                      }
                      if (pickupAddress?.country) {
                        addressLines.push(pickupAddress.country);
                      }
                    } else {
                      if (deliveryAddress?.street) {
                        addressLines.push(deliveryAddress.street);
                      }
                      if (shippingAddress?.address_line_1) {
                        addressLines.push(shippingAddress.address_line_1);
                      }
                      if (shippingAddress?.address_line_2) {
                        addressLines.push(shippingAddress.address_line_2);
                      }
                      const cityLine = [
                        deliveryAddress?.city || shippingAddress?.city,
                        shippingAddress?.state_province,
                      ]
                        .filter(Boolean)
                        .join(', ');
                      if (cityLine) {
                        addressLines.push(cityLine);
                      }
                      const postal = deliveryAddress?.postal_code || shippingAddress?.postal_code;
                      if (postal) {
                        addressLines.push(postal);
                      }
                      const country = deliveryAddress?.country || shippingAddress?.country;
                      if (country) {
                        addressLines.push(country);
                      }
                    }

                    const uniqueLines = addressLines.filter(
                      (line, index, arr) => line && arr.indexOf(line) === index
                    );

                    return (
                      <>
                        <View style={styles.infoHeader}>
                          <MaterialCommunityIcons name={iconName as any} size={20} color={iconColor} />
                          <Text style={styles.infoHeaderText}>{heading}</Text>
                        </View>
                        <Text style={styles.infoBodyText}>
                          {uniqueLines.length > 0
                            ? uniqueLines.join('\n')
                            : 'Address will be shared with the seller once payment is confirmed.'}
                        </Text>
                      </>
                    );
                  })()}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Payment Summary</Text>
                <View style={styles.infoCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Items ({order.quantity})</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(order.total_amount, order.currency)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Delivery fee</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(order.delivery_fee ?? order.shipping_fee, order.currency)}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryGrandLabel}>Grand total</Text>
                    <Text style={styles.summaryGrandValue}>
                      {formatCurrency(order.grand_total, order.currency)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.sectionActions}>
                {order.status === 'pending_payment' && (
                  <TouchableOpacity
                    style={[styles.primaryButton, styles.paymentButton]}
                    onPress={() => onSubmitPayment(order)}
                    disabled={paymentSubmitting}
                  >
                    {paymentSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="cash-plus" size={18} color="#FFFFFF" />
                        <Text style={styles.primaryButtonText}>Submit Payment Proof</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                {order.status === 'payment_submitted' && (
                  <TouchableOpacity
                    style={[styles.primaryButton, styles.paymentButton]}
                    onPress={() => onSubmitPayment(order)}
                    disabled={paymentSubmitting}
                  >
                    {paymentSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="pencil-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.primaryButtonText}>Edit Payment Proof</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                {order.status === 'delivered' && (
                  <TouchableOpacity
                    style={[styles.primaryButton, styles.paymentButton]}
                    onPress={() => onConfirmReceipt(order)}
                    disabled={confirmingOrderId === order.id}
                  >
                    {confirmingOrderId === order.id ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="check-circle-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.primaryButtonText}>Confirm Receipt</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.helpButton}
                  onPress={() => onHelp(order)}
                >
                  <Text style={styles.helpButtonText}>I need help with this order</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => onCancelOrder(order)}
                >
                  <Text style={styles.cancelButtonText}>Cancel this order</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '95%',
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerButton: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerPlaceholder: {
    width: 32,
  },
  loadingState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 24,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  productImage: {
    width: 92,
    height: 92,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
  },
  productPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderId: {
    fontSize: 14,
    color: '#64748B',
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  variantInfo: {
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    alignSelf: 'center',
  },
  variantText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  orderMeta: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
  },
  deliveryMeta: {
    fontSize: 13,
    color: '#1D4ED8',
    textAlign: 'center',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  timelineContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 16,
  },
  timelineIconWrap: {
    alignItems: 'center',
  },
  timelineIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineIconCircleCompleted: {
    backgroundColor: '#6366F1',
  },
  timelineIconCircleCurrent: {
    backgroundColor: '#61d5b6',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    gap: 4,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  timelineDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  timelineDate: {
    fontSize: 12,
    color: '#64748B',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    gap: 10,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  infoBodyText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  infoBodyStrong: {
    fontWeight: '600',
    color: '#0F172A',
  },
  trackButton: {
    marginTop: 4,
    borderRadius: UI.dimensions.borderRadius,
    borderWidth: UI.dimensions.borderWidth,
    borderColor: '#C7D2FE',
    height: UI.dimensions.buttonHeight,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
  },
  collectionPointInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 4,
  },
  trackButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4338CA',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#475569',
  },
  summaryValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  summaryGrandLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryGrandValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  sectionActions: {
    gap: 12,
    paddingBottom: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: UI.dimensions.borderRadius,
    height: UI.dimensions.buttonHeight,
  },
  paymentButton: {
    backgroundColor: '#61d5b6',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  helpButton: {
    borderRadius: UI.dimensions.borderRadius,
    height: UI.dimensions.buttonHeight,
    borderWidth: UI.dimensions.borderWidth,
    borderColor: '#4338CA',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
  },
  helpButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4338CA',
  },
  cancelButton: {
    borderRadius: UI.dimensions.borderRadius,
    height: UI.dimensions.buttonHeight,
    borderWidth: UI.dimensions.borderWidth,
    borderColor: UI.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: UI.colors.background,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
});

export default OrderDetailsModal;
