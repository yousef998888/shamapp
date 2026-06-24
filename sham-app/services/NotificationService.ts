import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/utils/supabase';

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

// expo-device is optional, handle gracefully if not installed
let Device: any;
try {
  Device = require('expo-device');
} catch {
  // Fallback: assume it's a device if expo-device is not available
  // In production, expo-device should be installed
  Device = { isDevice: Platform.OS !== 'web', modelName: 'unknown' };
}

// Configure how notifications are handled when app is in foreground
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export interface NotificationData {
  type: 'payment_approved' | 'payment_rejected' | 'product_sold' | 'order_status' | 'new_message' | 'general';
  orderId?: string;
  productId?: string;
  message?: string;
  [key: string]: any;
}

class NotificationService {
  private static expoPushToken: string | null = null;

  /**
   * Register for push notifications and get the Expo push token
   */
  static async registerForPushNotifications(): Promise<string | null> {
    // Check if Notifications is available
    if (!Notifications) {
      console.warn('Push notifications not available - expo-notifications not installed or not supported');
      return null;
    }

    // Only work on physical devices
    if (!Device.isDevice) {
      console.warn('Push notifications only work on physical devices');
      return null;
    }

    // Check if running in Expo Go (push notifications don't work in Expo Go for SDK 53+)
    if (Constants.appOwnership === 'expo') {
      console.log('Push notifications are not available in Expo Go. They will work in your development build.');
      return null;
    }

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        return null;
      }

      // Get the Expo push token
      // Try to get projectId from various sources
      let projectId: string | undefined;
      
      // First, try environment variable
      if (process.env.EXPO_PUBLIC_PROJECT_ID) {
        projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
      }
      // Then try Constants.expoConfig.extra.eas.projectId
      else if (Constants?.expoConfig?.extra?.eas?.projectId) {
        projectId = Constants.expoConfig.extra.eas.projectId;
      }
      // Try username/slug format as fallback (anhar94/sham-app)
      // This might work without needing the full UUID project ID
      else if (Constants?.expoConfig?.owner && Constants?.expoConfig?.slug) {
        const owner = Constants.expoConfig.owner;
        const slug = Constants.expoConfig.slug;
        // Only use if it looks like a username (not a UUID)
        if (owner && slug && !owner.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          // Use owner/slug format
          projectId = `${owner}/${slug}`;
          console.log(`Using owner/slug format for projectId: ${projectId}`);
        }
      }
      
      // Get the push token - always pass projectId if available
      let tokenData;
      if (projectId) {
        tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      } else {
        // Try without projectId (might work in managed workflow)
        try {
          tokenData = await Notifications.getExpoPushTokenAsync();
        } catch (error: any) {
          console.error('Failed to get push token:', error);
          // If it fails, we need the user to set EXPO_PUBLIC_PROJECT_ID
          console.warn(
            'Push notifications require a project ID. Please set EXPO_PUBLIC_PROJECT_ID in your .env file.\n' +
            'Get your project ID: 1) Go to https://expo.dev and create/link your project, or\n' +
            '2) Run: cd sham-app && npx expo init (just to link, you can cancel after it gets the ID), or\n' +
            '3) Use format: anhar94/sham-app (might work for some setups)'
          );
          return null;
        }
      }

      this.expoPushToken = tokenData.data;
      console.log('Expo Push Token:', this.expoPushToken);

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });
      }

      return this.expoPushToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Save push token to Supabase for the current user
   */
  static async savePushTokenToDatabase(token: string, userId: string): Promise<boolean> {
    try {
      console.log('💾 Attempting to save push token to database...', { userId, token: token.substring(0, 20) + '...' });
      
      // Check if token already exists
      const { data: existingToken, error: checkError } = await supabase
        .from('user_push_tokens')
        .select('id')
        .eq('user_id', userId)
        .eq('token', token)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is fine
        console.error('Error checking for existing token:', checkError);
        return false;
      }

      if (!existingToken) {
        // Insert new token
        const { data, error } = await supabase
          .from('user_push_tokens')
          .insert({
            user_id: userId,
            token,
            platform: Platform.OS,
            device_id: Device.modelName || 'unknown',
          })
          .select();

        if (error) {
          console.error('❌ Error saving push token:', error);
          console.error('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          
          // Check if table doesn't exist
          if (error.code === '42P01') {
            console.error('⚠️ user_push_tokens table does not exist! Please create the migration.');
          }
          
          return false;
        }
        
        console.log('✅ Push token saved successfully:', data?.[0]?.id);
        return true;
      } else {
        console.log('✅ Push token already exists in database');
        return true;
      }
    } catch (error) {
      console.error('❌ Error in savePushTokenToDatabase:', error);
      return false;
    }
  }

  /**
   * Remove push token from database (e.g., on logout)
   */
  static async removePushTokenFromDatabase(token: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_push_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('token', token);

      if (error) {
        console.error('Error removing push token:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in removePushTokenFromDatabase:', error);
      return false;
    }
  }

  /**
   * Initialize notifications - call this when user logs in
   */
  static async initialize(userId: string): Promise<string | null> {
    console.log('🔔 Initializing notifications for user:', userId);
    const token = await this.registerForPushNotifications();
    
    if (token) {
      console.log('✅ Push token obtained:', token.substring(0, 30) + '...');
      if (userId) {
        const saved = await this.savePushTokenToDatabase(token, userId);
        if (saved) {
          console.log('✅ Notifications initialized successfully');
        } else {
          console.warn('⚠️ Push token obtained but could not save to database');
        }
      }
    } else {
      console.warn('⚠️ No push token obtained. This might be because:');
      console.warn('  - Running in Expo Go (not supported)');
      console.warn('  - Running on simulator/emulator');
      console.warn('  - Permissions not granted');
    }
    
    return token;
  }

  /**
   * Cleanup notifications - call this when user logs out
   */
  static async cleanup(userId: string): Promise<void> {
    if (this.expoPushToken && userId) {
      await this.removePushTokenFromDatabase(this.expoPushToken, userId);
      this.expoPushToken = null;
    }
  }

  /**
   * Get current push token
   */
  static getPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Schedule a local notification (for testing or offline scenarios)
   */
  static async scheduleLocalNotification(
    title: string,
    body: string,
    data?: NotificationData,
    seconds: number = 1
  ): Promise<string> {
    if (!Notifications) {
      throw new Error('expo-notifications not available');
    }
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: seconds > 0 ? { 
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds 
      } : null,
    });
  }

  /**
   * Cancel a scheduled notification
   */
  static async cancelScheduledNotification(notificationId: string): Promise<void> {
    if (!Notifications) {
      console.warn('expo-notifications not available');
      return;
    }
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Cancel all scheduled notifications
   */
  static async cancelAllScheduledNotifications(): Promise<void> {
    if (!Notifications) {
      console.warn('expo-notifications not available');
      return;
    }
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get badge count
   */
  static async getBadgeCount(): Promise<number> {
    if (!Notifications) {
      return 0;
    }
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set badge count
   */
  static async setBadgeCount(count: number): Promise<void> {
    if (!Notifications) {
      console.warn('expo-notifications not available');
      return;
    }
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Clear badge count
   */
  static async clearBadge(): Promise<void> {
    if (!Notifications) {
      console.warn('expo-notifications not available');
      return;
    }
    await Notifications.setBadgeCountAsync(0);
  }
}

export default NotificationService;

