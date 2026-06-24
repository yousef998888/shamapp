/**
 * Server-side notification service for sending push notifications via Expo Push Notification Service
 */

interface ExpoPushMessage {
  to: string | string[];
  sound: 'default' | null;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
}

interface NotificationData {
  type: 'payment_approved' | 'payment_rejected' | 'product_sold' | 'order_status' | 'new_message' | 'general';
  orderId?: string;
  productId?: string;
  message?: string;
  [key: string]: any;
}

interface SendNotificationOptions {
  userId: string;
  title: string;
  body: string;
  data?: NotificationData;
  badge?: number;
}

class NotificationService {
  private static readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
  private static readonly ACCESS_TOKEN = process.env.EXPO_ACCESS_TOKEN; // Optional, for higher rate limits

  /**
   * Send push notification to a user by their Expo push token
   */
  static async sendPushNotification(
    pushToken: string,
    title: string,
    body: string,
    data?: NotificationData,
    badge?: number
  ): Promise<boolean> {
    try {
      const message: ExpoPushMessage = {
        to: pushToken,
        sound: 'default',
        title,
        body,
        data: data || {},
        priority: 'high',
      };

      if (badge !== undefined) {
        message.badge = badge;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      };

      if (this.ACCESS_TOKEN) {
        headers['Authorization'] = `Bearer ${this.ACCESS_TOKEN}`;
      }

      const response = await fetch(this.EXPO_PUSH_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Error sending push notification:', error);
        return false;
      }

      const result = await response.json();
      
      // Check if notification was successfully queued
      if (result.data?.status === 'ok') {
        return true;
      } else {
        console.error('Push notification failed:', result.data?.message);
        return false;
      }
    } catch (error) {
      console.error('Error in sendPushNotification:', error);
      return false;
    }
  }

  /**
   * Send push notification to multiple users
   */
  static async sendBulkPushNotifications(
    pushTokens: string[],
    title: string,
    body: string,
    data?: NotificationData,
    badge?: number
  ): Promise<{ success: number; failed: number }> {
    if (pushTokens.length === 0) {
      return { success: 0, failed: 0 };
    }

    // Expo allows up to 100 messages per request
    const batchSize = 100;
    let success = 0;
    let failed = 0;

    for (let i = 0; i < pushTokens.length; i += batchSize) {
      const batch = pushTokens.slice(i, i + batchSize);
      
      const messages: ExpoPushMessage[] = batch.map(token => ({
        to: token,
        sound: 'default',
        title,
        body,
        data: data || {},
        priority: 'high',
        ...(badge !== undefined && { badge }),
      }));

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        };

        if (this.ACCESS_TOKEN) {
          headers['Authorization'] = `Bearer ${this.ACCESS_TOKEN}`;
        }

        const response = await fetch(this.EXPO_PUSH_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(messages),
        });

        if (response.ok) {
          const result = await response.json();
          const results = Array.isArray(result.data) ? result.data : [result.data];
          
          results.forEach((item: any) => {
            if (item?.status === 'ok') {
              success++;
            } else {
              failed++;
            }
          });
        } else {
          failed += batch.length;
        }
      } catch (error) {
        console.error('Error sending batch notifications:', error);
        failed += batch.length;
      }
    }

    return { success, failed };
  }

  /**
   * Send notification to a user by their user ID (requires database lookup)
   * This method assumes you have access to the database to fetch push tokens
   */
  static async sendNotificationToUser(
    db: any, // Your database client (Supabase, PostgreSQL, etc.)
    options: SendNotificationOptions
  ): Promise<boolean> {
    try {
      // Fetch all active push tokens for the user
      const { data: tokens, error } = await db
        .from('user_push_tokens')
        .select('token')
        .eq('user_id', options.userId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching push tokens:', error);
        return false;
      }

      if (!tokens || tokens.length === 0) {
        console.log(`No push tokens found for user ${options.userId}`);
        return false;
      }

      // Send notification to all tokens (user might have multiple devices)
      const pushTokens = tokens.map((t: any) => t.token);
      const result = await this.sendBulkPushNotifications(
        pushTokens,
        options.title,
        options.body,
        options.data,
        options.badge
      );

      return result.success > 0;
    } catch (error) {
      console.error('Error in sendNotificationToUser:', error);
      return false;
    }
  }

  /**
   * Send payment approved notification
   */
  static async sendPaymentApprovedNotification(
    db: any,
    userId: string,
    orderId: string
  ): Promise<boolean> {
    return await this.sendNotificationToUser(db, {
      userId,
      title: 'Payment Approved! 🎉',
      body: 'Your payment has been approved. The seller will proceed with your order.',
      data: {
        type: 'payment_approved',
        orderId,
      },
    });
  }

  /**
   * Send payment rejected notification
   */
  static async sendPaymentRejectedNotification(
    db: any,
    userId: string,
    orderId: string,
    reason?: string
  ): Promise<boolean> {
    return await this.sendNotificationToUser(db, {
      userId,
      title: 'Payment Rejected',
      body: reason || 'Your payment was rejected. Please contact support for more information.',
      data: {
        type: 'payment_rejected',
        orderId,
        reason,
      },
    });
  }

  /**
   * Send product sold notification
   */
  static async sendProductSoldNotification(
    db: any,
    sellerId: string,
    orderId: string,
    productTitle: string
  ): Promise<boolean> {
    return await this.sendNotificationToUser(db, {
      userId: sellerId,
      title: 'Product Sold! 💰',
      body: `Your product "${productTitle}" has been sold! Check your orders.`,
      data: {
        type: 'product_sold',
        orderId,
        productTitle,
      },
    });
  }

  /**
   * Send order status update notification
   */
  static async sendOrderStatusNotification(
    db: any,
    userId: string,
    orderId: string,
    status: string,
    deliveryType?: 'home_delivery' | 'pickup_point' | 'seller_collection'
  ): Promise<boolean> {
    // Base messages
    const statusMessages: Record<string, { title: string; body: string }> = {
      shipped: {
        title: 'Order Shipped! 📦',
        body: 'Your order has been shipped. Track it in your orders.',
      },
      delivered: {
        title: 'Order Delivered! ✅',
        body: 'Your order has been delivered. Please confirm receipt.',
      },
      cancelled: {
        title: 'Order Cancelled',
        body: 'Your order has been cancelled.',
      },
    };

    let message = statusMessages[status] || {
      title: 'Order Update',
      body: `Your order status has been updated to: ${status}`,
    };

    // Customize delivered message based on delivery type
    if (status === 'delivered' && deliveryType) {
      if (deliveryType === 'pickup_point') {
        message = {
          title: 'Order Delivered! ✅',
          body: 'Your order has arrived at the collection point and is ready for pickup.',
        };
      } else if (deliveryType === 'seller_collection') {
        message = {
          title: 'Order Delivered! ✅',
          body: 'Your order is ready for collection. Arrange pickup with the seller.',
        };
      } else {
        message = {
          title: 'Order Delivered! ✅',
          body: 'Our courier team has delivered your package at your doorstep.',
        };
      }
    }

    return await this.sendNotificationToUser(db, {
      userId,
      title: message.title,
      body: message.body,
      data: {
        type: 'order_status',
        orderId,
        status,
      },
    });
  }

  /**
   * Send new message notification
   */
  static async sendNewMessageNotification(
    db: any,
    userId: string,
    orderId: string,
    senderName: string,
    messagePreview: string
  ): Promise<boolean> {
    return await this.sendNotificationToUser(db, {
      userId,
      title: `New message from ${senderName}`,
      body: messagePreview.length > 50 ? `${messagePreview.substring(0, 50)}...` : messagePreview,
      data: {
        type: 'new_message',
        orderId,
        senderName,
      },
    });
  }
}

export default NotificationService;

