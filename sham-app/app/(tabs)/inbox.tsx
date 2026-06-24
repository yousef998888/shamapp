import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { ChatList } from '@/components/chat';
import { useAuthContext } from '@/contexts/AuthContext';
import OrderService from '@/services/OrderService';
import { supabase } from '@/utils/supabase';
import type { Order } from '@/types/database';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { usePageTranslation } from '@/hooks/useTranslation';
import { IconSymbol } from '@/components/ui/icon-symbol';

type InboxTabKey = 'messages' | 'notifications';

interface Notification {
  id: string;
  type: 'payment_approved' | 'payment_rejected' | 'product_sold' | 'order_status' | 'shipped' | 'delivered' | 'order_completed';
  orderId: string;
  title: string;
  description: string;
  timestamp: string;
  productTitle?: string;
  status?: string;
}

const InboxTabScreen = () => {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuthContext();
  const { t } = usePageTranslation('inboxPage');

  const [activeTab, setActiveTab] = useState<InboxTabKey>('messages');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const { markAsRead } = useNotificationCount();

  const loadOrders = useCallback(async () => {
    if (!user?.id) {
      setOrders([]);
      return;
    }

    setOrdersLoading(true);
    setOrdersError(null);

    try {
      const [buyerOrders, sellerOrders] = await Promise.all([
        OrderService.getOrders(user.id, 'buyer', { includeConversations: true }),
        OrderService.getOrders(user.id, 'seller', { includeConversations: true }),
      ]);

      const mergedMap = new Map<string, Order>();
      [...buyerOrders, ...sellerOrders].forEach(order => {
        mergedMap.set(order.id, order);
      });

      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setOrders(merged);
    } catch (error) {
      console.error('InboxTabScreen.loadOrders error', error);
      setOrdersError(t.errorMessage);
    } finally {
      setOrdersLoading(false);
    }
  }, [user?.id, t]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        loadOrders();
      }
    }, [isAuthenticated, loadOrders]),
  );

  const handleSelectOrder = useCallback(
    (orderId: string) => {
      router.push(`/inbox/${orderId}`);
    },
    [router],
  );

  const loadNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    setNotificationsLoading(true);
    try {
      // Fetch all orders for this user (both as buyer and seller)
      const [buyerOrders, sellerOrders] = await Promise.all([
        OrderService.getOrders(user.id, 'buyer'),
        OrderService.getOrders(user.id, 'seller'),
      ]);

      const allOrders = [...buyerOrders, ...sellerOrders];
      const orderIds = allOrders.map(o => o.id);

      if (orderIds.length === 0) {
        setNotifications([]);
        setNotificationsLoading(false);
        return;
      }

      // Fetch order status changes
      const { data: statuses, error } = await supabase
        .from('order_statuses')
        .select(`
          *,
          order:orders!inner(
            id,
            product:products(id, title),
            buyer:users!orders_buyer_id_fkey(id),
            seller:users!orders_seller_id_fkey(id),
            delivery:order_deliveries(
              delivery_type,
              tracking_number,
              pickup_location_data
            )
          )
        `)
        .in('order_id', orderIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        setNotifications([]);
        return;
      }

      // Transform status changes to notifications
      const notifications = (statuses || [])
        .map((status: any): Notification | null => {
          const order = status.order;
          const product = order?.product;
          const isBuyer = order?.buyer?.id === user.id;
          const isSeller = order?.seller?.id === user.id;
          
          // Filter out notifications for actions the user performed themselves
          // Sellers don't see "shipped" notifications (they shipped it)
          // Buyers don't see "payment_submitted" notifications (they submitted it)
          if (isSeller && status.status === 'shipped') {
            return null; // Seller shipped it themselves, don't notify
          }
          if (isBuyer && status.status === 'payment_submitted') {
            return null; // Buyer submitted payment themselves, don't notify
          }
          
          // Handle delivery - it might be an array or a single object
          const delivery = Array.isArray(order?.delivery) 
            ? order.delivery[0] 
            : order?.delivery;
          
          let type: Notification['type'] = 'order_status';
          let title = '';
          let description = '';

          switch (status.status) {
            case 'payment_submitted':
              // Only sellers see this (buyer submitted payment)
              if (isSeller) {
                type = 'order_status';
                title = t.paymentProofSubmitted || 'Payment Proof Submitted';
                const productTitle = product?.title || 'your product';
                description = (t.paymentProofSubmittedDesc || 'The buyer has submitted payment proof for "{product}". Please review it.').replace('{product}', productTitle);
              }
              break;
            
            case 'admin_approved':
              type = 'payment_approved';
              if (isBuyer) {
                title = t.paymentApproved || 'Payment Approved!';
                const productTitle = product?.title || 'your order';
                description = (t.paymentApprovedBuyerDesc || 'Your payment has been verified for "{product}". The seller will now ship your item.').replace('{product}', productTitle);
              } else if (isSeller) {
                title = t.paymentVerified || 'Payment Verified';
                const productTitle = product?.title || 'your product';
                description = (t.paymentVerifiedSellerDesc || 'Payment for "{product}" has been verified. You can now ship the item.').replace('{product}', productTitle);
              }
              break;
            
            case 'shipped':
              // Only buyers see this (seller shipped it)
              if (isBuyer) {
                type = 'shipped';
                title = t.packageOnTheWay || 'Your package is on the way!';
                const shippedDeliveryType = delivery?.delivery_type;
                const trackingNumber = delivery?.tracking_number;
                const pickupLocation = delivery?.pickup_location_data;
                
                if (shippedDeliveryType === 'pickup_point' && pickupLocation) {
                  description = trackingNumber
                    ? (t.packageShippedPickupWithTracking || 'Your order has been shipped. Tracking: {tracking}. It will arrive at {location}.').replace('{tracking}', trackingNumber).replace('{location}', pickupLocation.name)
                    : (t.packageShippedPickup || 'Your order has been shipped. It will arrive at {location}.').replace('{location}', pickupLocation.name);
                } else if (shippedDeliveryType === 'seller_collection') {
                  description = t.packageShippedCollection || "Your order has been shipped. Arrange collection with the seller when it's ready.";
                } else if (trackingNumber) {
                  description = (t.packageShippedWithTracking || 'Your order has been shipped. Tracking: {tracking}').replace('{tracking}', trackingNumber);
                } else {
                  description = t.packageShippedGeneric || 'Your order has been shipped and is on the way to you.';
                }
              }
              break;
            
            case 'delivered':
              type = 'delivered';
              const deliveryType = delivery?.delivery_type;
              const deliveredTrackingNumber = delivery?.tracking_number;
              const deliveredPickupLocation = delivery?.pickup_location_data;
              
              if (isBuyer) {
                // Buyer perspective
                title = 'Your package has arrived!';
                if (deliveryType === 'pickup_point') {
                  if (deliveredPickupLocation) {
                    description = deliveredTrackingNumber
                      ? `Your order has arrived at ${deliveredPickupLocation.name} and is ready for pickup. Tracking: ${deliveredTrackingNumber}`
                      : `Your order has arrived at ${deliveredPickupLocation.name} and is ready for pickup.`;
                  } else {
                    description = deliveredTrackingNumber
                      ? `Your order has arrived at the collection point and is ready for pickup. Tracking: ${deliveredTrackingNumber}`
                      : `Your order has arrived at the collection point and is ready for pickup.`;
                  }
                } else if (deliveryType === 'seller_collection') {
                  description = `Ready for collection. Arrange pickup with the seller.`;
                } else {
                  description = `Our courier team has delivered your package at your doorstep.`;
                }
              } else if (isSeller) {
                // Seller perspective
                title = 'Package Delivered to Buyer';
                if (deliveryType === 'pickup_point') {
                  if (deliveredPickupLocation) {
                    description = deliveredTrackingNumber
                      ? `Your package has arrived at the buyer's collection point (${deliveredPickupLocation.name}). Tracking: ${deliveredTrackingNumber}`
                      : `Your package has arrived at the buyer's collection point (${deliveredPickupLocation.name}).`;
                  } else {
                    description = deliveredTrackingNumber
                      ? `Your package has arrived at the buyer's collection point. Tracking: ${deliveredTrackingNumber}`
                      : `Your package has arrived at the buyer's collection point.`;
                  }
                } else if (deliveryType === 'seller_collection') {
                  description = `Your package is ready for buyer collection.`;
                } else {
                  description = `Your package has been delivered to the buyer's address.`;
                }
              }
              break;
            
            case 'completed':
              type = 'order_completed';
              if (isBuyer) {
                title = 'Order Completed';
                description = `Your order of "${product?.title || 'product'}" has been successfully completed. Thank you for shopping with us!`;
              } else if (isSeller) {
                title = 'Order Completed';
                description = `The order for "${product?.title || 'your product'}" has been completed. Payment has been released.`;
              }
              break;
            
            case 'cancelled':
              type = 'order_status';
              if (isBuyer) {
                title = 'Order Cancelled';
                description = `Your order for "${product?.title || 'product'}" has been cancelled.`;
              } else if (isSeller) {
                title = 'Order Cancelled';
                description = `The order for "${product?.title || 'your product'}" has been cancelled.`;
              }
              break;
            
            default:
              // Only show if it's relevant to the user
              if (isBuyer || isSeller) {
                title = 'Order status updated';
                description = `Your order status has been updated to: ${status.status}`;
              }
          }

          // Return null if no notification should be shown
          if (!title || !description) {
            return null;
          }

          return {
            id: status.id,
            type,
            orderId: status.order_id,
            title,
            description,
            timestamp: status.created_at,
            productTitle: product?.title,
            status: status.status,
          };
        })
        .filter((notification): notification is Notification => notification !== null);

      setNotifications(notifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        if (activeTab === 'notifications') {
          loadNotifications();
          // Mark notifications as read when viewing the notifications tab
          markAsRead();
        }
        // Also load orders when focused
        loadOrders();
      }
    }, [isAuthenticated, activeTab, loadNotifications, loadOrders, markAsRead]),
  );
  
  // Subscribe to real-time order status changes for live notifications
  useEffect(() => {
    if (!user?.id) {
      return;
    }

    // Subscribe to order_statuses table for new notifications
    const channel = supabase
      .channel(`notifications_realtime_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_statuses',
        },
        async (payload) => {
          // When a new order status is inserted, reload notifications if we're on that tab
          if (activeTab === 'notifications') {
            await loadNotifications();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, activeTab, loadNotifications]);

  const emptyStateMessage = useMemo(() => {
    if (ordersError) {
      return ordersError;
    }

    return t.emptySubtitle;
  }, [ordersError, t]);

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      return t.justNow || 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}${t.hoursAgoShort || 'h ago'}`;
    } else if (diffInDays === 1) {
      return t.oneDayAgo || '1d ago';
    } else {
      return `${diffInDays}${t.daysAgoShort || 'd ago'}`;
    }
  };

  const isToday = (dateString: string): boolean => {
    const date = new Date(dateString);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const groupedNotifications = useMemo(() => {
    const today: Notification[] = [];
    const earlier: Notification[] = [];

    notifications.forEach(notif => {
      if (isToday(notif.timestamp)) {
        today.push(notif);
      } else {
        earlier.push(notif);
      }
    });

    return { today, earlier };
  }, [notifications]);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'payment_approved':
      case 'order_completed':
        return 'check-circle';
      case 'shipped':
        return 'truck';
      case 'delivered':
        return 'package-variant';
      case 'order_status':
        return 'information';
      default:
        return 'bell';
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const iconName = getNotificationIcon(item.type);
    const showActionButton = item.type === 'delivered' || item.type === 'shipped';

    return (
      <TouchableOpacity
        style={styles.notificationCard}
        onPress={() => {
          if (item.orderId) {
            router.push(`/inbox/${item.orderId}`);
          }
        }}
      >
        <View style={styles.notificationIconContainer}>
          <MaterialCommunityIcons name={iconName as any} size={24} color="#6B7280" />
        </View>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationDescription}>{item.description}</Text>
          {showActionButton && item.type === 'delivered' && (
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => {
                if (item.orderId) {
                  router.push(`/inbox/${item.orderId}`);
                }
              }}
            >
              <Text style={styles.notificationButtonText}>{t.seeTrackingInfo || 'See tracking info'}</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color="#9333EA" />
            </TouchableOpacity>
          )}
          {item.type === 'shipped' && (
            <TouchableOpacity style={styles.notificationButtonGray}>
              <Text style={styles.notificationButtonTextGray}>{t.estimatedDelivery || 'Est: 3d from now'}</Text>
              <MaterialCommunityIcons name="calendar" size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.notificationTime}>{formatTimeAgo(item.timestamp)}</Text>
      </TouchableOpacity>
    );
  };

  const renderTabButton = (tab: InboxTabKey, label: string) => (
    <TouchableOpacity
      key={tab}
      style={[styles.tab, activeTab === tab && styles.activeTab]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (authLoading) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#4338CA" />
        <Text style={styles.centeredText}>{t.loading}</Text>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <IconSymbol name="bubble.left.and.bubble.right" size={80} color="#61d5b6" />
        <Text style={styles.title}>{t.signInToViewMessages || 'Sign in to view messages'}</Text>
        <Text style={styles.subtitle}>{t.inboxDescription || 'Access your conversations with buyers and sellers'}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/auth/login')}>
          <Text style={styles.primaryButtonText}>{t.signIn || 'Sign In'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/auth/signup')}>
          <Text style={styles.secondaryButtonText}>{t.createAccount || 'Create Account'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (ordersLoading && orders.length === 0) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#4338CA" />
        <Text style={styles.centeredText}>{t.loading}</Text>
      </SafeAreaView>
    );
  }

  const renderNotificationsTab = () => {
    if (notificationsLoading && notifications.length === 0) {
      return (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#4338CA" />
          <Text style={styles.centeredText}>{t.loadingNotifications || 'Loading notifications…'}</Text>
        </View>
      );
    }

    if (!notificationsLoading && notifications.length === 0) {
      return (
        <View style={styles.centeredContainer}>
          <Text style={styles.title}>{t.noNotificationsYet || 'No notifications yet'}</Text>
          <Text style={styles.subtitle}>
            {t.notificationsEmptySubtitle || "You'll see order updates, payment confirmations, and other notifications here."}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.notificationsContainer} showsVerticalScrollIndicator={false}>
        {groupedNotifications.today.length > 0 && (
          <View style={styles.notificationSection}>
            <Text style={styles.sectionTitle}>{t.today || 'Today'}</Text>
            {groupedNotifications.today.map(notif => (
              <View key={notif.id}>
                {renderNotification({ item: notif })}
              </View>
            ))}
          </View>
        )}

        {groupedNotifications.earlier.length > 0 && (
          <View style={styles.notificationSection}>
            <Text style={styles.sectionTitle}>{t.earlier || 'Earlier'}</Text>
            {groupedNotifications.earlier.map(notif => (
              <View key={notif.id}>
                {renderNotification({ item: notif })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderMessagesTab = () => {
    if (ordersLoading && orders.length === 0) {
      return (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#4338CA" />
          <Text style={styles.centeredText}>{t.loadingConversations || 'Loading your conversations…'}</Text>
        </View>
      );
    }

    if (!ordersLoading && orders.length === 0) {
      return (
        <View style={styles.centeredContainer}>
          <Text style={styles.title}>{t.noConversationsYet || 'No conversations yet'}</Text>
          <Text style={styles.subtitle}>{emptyStateMessage}</Text>
          {ordersError ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={loadOrders}>
              <Text style={styles.secondaryButtonText}>{t.tryAgain || 'Try again'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );
    }

    return (
      <ChatList
        conversations={orders}
        selectedOrderId={null}
        onSelect={handleSelectOrder}
        currentUserId={user?.id}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {renderTabButton('messages', t.messages || 'Messages')}
        {renderTabButton('notifications', t.notifications || 'Notifications')}
      </View>

      {/* Tab Content */}
      {activeTab === 'messages' ? renderMessagesTab() : renderNotificationsTab()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  centeredText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: '#61d5b6',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
    width: '100%',
    shadowColor: '#61d5b6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#61d5b6',
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#61d5b6',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 25,
    padding: 4,
    gap: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#000',
    fontWeight: '600',
  },
  notificationsContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  notificationSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  notificationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9333EA',
    marginRight: 4,
  },
  notificationButtonGray: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  notificationButtonTextGray: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginRight: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 8,
  },
});

export default InboxTabScreen;
