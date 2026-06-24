import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import NotificationService, { NotificationData } from '@/services/NotificationService';
import { router } from 'expo-router';

// Conditionally import expo-notifications to avoid errors in Expo Go SDK 53+
let Notifications: typeof import('expo-notifications') | null = null;
try {
  // Only import if available (development builds support it, Expo Go doesn't)
  if (typeof require !== 'undefined') {
    Notifications = require('expo-notifications');
  }
} catch (error) {
  // expo-notifications not available (e.g., in Expo Go SDK 53+)
  console.warn('expo-notifications not available:', error);
}

export interface NotificationHandler {
  onNotificationReceived?: (notification: any) => void;
  onNotificationTapped?: (response: any) => void;
}

/**
 * Hook for managing push notifications in the app
 */
export function useNotifications(handlers?: NotificationHandler) {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    // Initialize notifications when user is logged in
    if (user?.id && !isRegistered) {
      initializeNotifications();
    }

    // Cleanup when user logs out
    return () => {
      if (!user?.id && isRegistered) {
        cleanupNotifications();
      }
    };
  }, [user?.id]);

  useEffect(() => {
    // Only set up listeners if Notifications is available
    if (!Notifications) {
      console.warn('Notifications not available - skipping listener setup');
      return;
    }

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
      
      if (handlers?.onNotificationReceived) {
        handlers.onNotificationReceived(notification);
      }
    });

    // Listen for user tapping on notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification tapped:', response);
      
      handleNotificationTap(response);
      
      if (handlers?.onNotificationTapped) {
        handlers.onNotificationTapped(response);
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const initializeNotifications = async () => {
    if (!user?.id) {
      console.log('⏸️ Skipping notification initialization - no user');
      return;
    }

    try {
      console.log('🔔 useNotifications: Initializing notifications...');
      const token = await NotificationService.initialize(user.id);
      setExpoPushToken(token);
      setIsRegistered(!!token);
      
      if (token) {
        console.log('✅ useNotifications: Device registered successfully');
      } else {
        console.warn('⚠️ useNotifications: Device registration failed');
      }
    } catch (error) {
      console.error('❌ Error initializing notifications:', error);
      setIsRegistered(false);
    }
  };

  const cleanupNotifications = async () => {
    if (!user?.id) return;

    try {
      await NotificationService.cleanup(user.id);
      setIsRegistered(false);
      setExpoPushToken(null);
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
    }
  };

  const handleNotificationTap = (response: any) => {
    const data = response?.notification?.request?.content?.data as NotificationData;

    // Navigate based on notification type
    switch (data.type) {
      case 'payment_approved':
      case 'payment_rejected':
      case 'order_status':
        if (data.orderId) {
          router.push(`/inbox/${data.orderId}`);
        }
        break;

      case 'product_sold':
        if (data.productId) {
          router.push(`/product/${data.productId}`);
        } else if (data.orderId) {
          router.push(`/inbox/${data.orderId}`);
        }
        break;

      case 'new_message':
        if (data.orderId) {
          router.push(`/inbox/${data.orderId}`);
        }
        break;

      default:
        // Navigate to a default screen or do nothing
        break;
    }
  };

  return {
    expoPushToken,
    isRegistered,
    initializeNotifications,
    cleanupNotifications,
  };
}

