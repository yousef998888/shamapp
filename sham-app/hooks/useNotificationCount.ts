import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import OrderService from '@/services/OrderService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_VIEWED_KEY = 'notifications_last_viewed';

/**
 * Hook to track unread notification count and subscribe to real-time updates
 */
export function useNotificationCount() {
  const { user } = useAuthContext();
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastViewed, setLastViewed] = useState<Date | null>(null);
  const [lastViewedLoaded, setLastViewedLoaded] = useState(false);

  // Load last viewed timestamp from storage
  useEffect(() => {
    const loadLastViewed = async () => {
      try {
        const stored = await AsyncStorage.getItem(LAST_VIEWED_KEY);
        if (stored) {
          setLastViewed(new Date(stored));
        }
        setLastViewedLoaded(true);
      } catch (error) {
        console.error('Error loading last viewed:', error);
        setLastViewedLoaded(true);
      }
    };
    loadLastViewed();
  }, []);

  // Load initial notification count
  const loadNotificationCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }

    try {
      // Get all orders for this user
      const [buyerOrders, sellerOrders] = await Promise.all([
        OrderService.getOrders(user.id, 'buyer'),
        OrderService.getOrders(user.id, 'seller'),
      ]);

      const allOrders = [...buyerOrders, ...sellerOrders];
      const orderIds = allOrders.map(o => o.id);

      if (orderIds.length === 0) {
        setUnreadCount(0);
        return;
      }

      // Get notifications since last viewed, or from today if never viewed
      const cutoffDate = lastViewed || new Date();
      if (!lastViewed) {
        cutoffDate.setHours(0, 0, 0, 0); // Start of today
      }

      const { data: statuses, error } = await supabase
        .from('order_statuses')
        .select('id, created_at, order_id, status')
        .in('order_id', orderIds)
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading notification count:', error);
        return;
      }

      // Count only relevant notifications (exclude cancelled, etc.)
      const relevantStatuses = ['admin_approved', 'shipped', 'delivered', 'completed', 'payment_submitted'];
      const count = statuses?.filter(s => relevantStatuses.includes(s.status)).length || 0;
      setUnreadCount(count);
    } catch (error) {
      console.error('Error in loadNotificationCount:', error);
    }
  }, [user?.id, lastViewed]);

  const markAsRead = useCallback(async () => {
    const now = new Date();
    setUnreadCount(0);
    setLastViewed(now);
    try {
      await AsyncStorage.setItem(LAST_VIEWED_KEY, now.toISOString());
    } catch (error) {
      console.error('Error saving last viewed:', error);
    }
  }, []);

  // Load count on mount and when user/lastViewed changes
  useEffect(() => {
    if (user?.id && lastViewedLoaded) {
      // Only load after lastViewed is loaded from storage (even if null)
      loadNotificationCount();
    }
  }, [user?.id, lastViewed, lastViewedLoaded, loadNotificationCount]);

  // Subscribe to real-time order status changes
  const hasLoggedErrorRef = useRef(false);
  
  useEffect(() => {
    if (!user?.id) {
      return;
    }

    hasLoggedErrorRef.current = false; // Reset on new subscription
    
    console.log('📡 Setting up real-time subscription for notifications...', { userId: user.id });
    
    // Subscribe to order_statuses table for new notifications
    const channel = supabase
      .channel(`notifications_count_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_statuses',
        },
        async (payload) => {
          console.log('🔔 Real-time notification received:', payload);
          
          // Check if this notification is relevant to the user
          const newStatus = payload.new as any;
          
          // Only count if it's after last viewed time
          const statusTime = new Date(newStatus.created_at);
          const shouldCount = !lastViewed || statusTime > lastViewed;
          
          console.log('📊 Notification check:', {
            status: newStatus.status,
            orderId: newStatus.order_id,
            shouldCount,
            lastViewed: lastViewed?.toISOString(),
            statusTime: statusTime.toISOString()
          });
          
          if (shouldCount) {
            // Get the order to check if it belongs to this user
            const { data: order, error } = await supabase
              .from('orders')
              .select('buyer_id, seller_id')
              .eq('id', newStatus.order_id)
              .single();

            if (error) {
              console.error('Error fetching order:', error);
              return;
            }

            if (order && (order.buyer_id === user.id || order.seller_id === user.id)) {
              // Only count relevant statuses
              const relevantStatuses = ['admin_approved', 'shipped', 'delivered', 'completed', 'payment_submitted'];
              if (relevantStatuses.includes(newStatus.status)) {
                console.log('✅ Incrementing notification count for status:', newStatus.status);
                setUnreadCount(prev => {
                  const newCount = prev + 1;
                  console.log(`🔴 Badge count: ${prev} → ${newCount}`);
                  return newCount;
                });
              }
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to real-time notifications');
          hasLoggedErrorRef.current = false; // Reset on success
        } else if (status === 'CHANNEL_ERROR' && !hasLoggedErrorRef.current) {
          hasLoggedErrorRef.current = true; // Only log once
          console.warn('⚠️ Real-time subscription failed (CHANNEL_ERROR)');
          console.warn('📋 To fix this, enable Real-time in Supabase Dashboard:');
          console.warn('   1. Go to Settings → API');
          console.warn('   2. Ensure "Realtime" is enabled');
          console.warn('   3. Verify order_statuses is in supabase_realtime publication');
          console.warn('   (Notifications will still work via polling)');
        } else if (status === 'TIMED_OUT' && !hasLoggedErrorRef.current) {
          hasLoggedErrorRef.current = true;
          console.warn('⏱️ Real-time subscription timed out');
        } else if (status === 'CLOSED') {
          // Don't log CLOSED as it's normal during cleanup
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, lastViewed]);

  return {
    unreadCount,
    markAsRead,
    refreshCount: loadNotificationCount,
  };
}

