/**
 * Admin panel notification helper
 * Sends push notifications via Expo Push Notification Service
 */

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

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send push notification to a user
 */
export async function sendPushNotification(
  supabase: any,
  options: SendNotificationOptions
): Promise<boolean> {
  try {
    console.log('📤 Attempting to send push notification:', {
      userId: options.userId,
      title: options.title,
      body: options.body
    });

    // Fetch all active push tokens for the user
    const { data: tokens, error } = await supabase
      .from('user_push_tokens')
      .select('token')
      .eq('user_id', options.userId)
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching push tokens:', error);
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

    if (!tokens || tokens.length === 0) {
      console.warn(`⚠️ No push tokens found for user ${options.userId}`);
      console.warn('This means the device is not registered for push notifications.');
      console.warn('Make sure:');
      console.warn('  1. The user has logged into the mobile app');
      console.warn('  2. The app requested notification permissions');
      console.warn('  3. The user_push_tokens table exists in the database');
      return false;
    }

    console.log(`✅ Found ${tokens.length} push token(s) for user ${options.userId}`);

    // Send notification to all tokens (user might have multiple devices)
    const pushTokens = tokens.map((t: any) => t.token);
    
    // Expo allows up to 100 messages per request
    const batchSize = 100;
    let successCount = 0;

    for (let i = 0; i < pushTokens.length; i += batchSize) {
      const batch = pushTokens.slice(i, i + batchSize);
      
      const messages = batch.map((token: string) => ({
        to: token,
        sound: 'default' as const,
        title: options.title,
        body: options.body,
        data: options.data || {},
        priority: 'high' as const,
        ...(options.badge !== undefined && { badge: options.badge }),
      }));

      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
          },
          body: JSON.stringify(messages),
        });

        if (response.ok) {
          const result = await response.json();
          const results = Array.isArray(result.data) ? result.data : [result.data];
          
          results.forEach((item: any, index: number) => {
            if (item?.status === 'ok') {
              successCount++;
              console.log(`✅ Notification sent successfully to token ${index + 1}`);
            } else {
              console.error(`❌ Notification failed for token ${index + 1}:`, item?.message || item);
            }
          });
        } else {
          const errorText = await response.text();
          console.error('❌ Failed to send notifications:', response.status, errorText);
        }
      } catch (error) {
        console.error('❌ Error sending batch notifications:', error);
      }
    }

    console.log(`📊 Notification send result: ${successCount}/${pushTokens.length} successful`);
    return successCount > 0;
  } catch (error) {
    console.error('Error in sendPushNotification:', error);
    return false;
  }
}

/**
 * Send payment approved notification
 */
export async function sendPaymentApprovedNotification(
  supabase: any,
  userId: string,
  orderId: string
): Promise<boolean> {
  return await sendPushNotification(supabase, {
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
export async function sendPaymentRejectedNotification(
  supabase: any,
  userId: string,
  orderId: string,
  reason?: string
): Promise<boolean> {
  return await sendPushNotification(supabase, {
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
export async function sendProductSoldNotification(
  supabase: any,
  sellerId: string,
  orderId: string,
  productTitle: string
): Promise<boolean> {
  return await sendPushNotification(supabase, {
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
 * Send order delivered notification
 */
export async function sendOrderDeliveredNotification(
  supabase: any,
  buyerId: string,
  orderId: string,
  deliveryType?: 'home_delivery' | 'pickup_point' | 'seller_collection'
): Promise<boolean> {
  // Customize message based on delivery type
  let body = 'Your order has been delivered. Please confirm receipt.';
  if (deliveryType === 'pickup_point') {
    body = 'Your order has arrived at the collection point and is ready for pickup.';
  } else if (deliveryType === 'seller_collection') {
    body = 'Your order is ready for collection. Arrange pickup with the seller.';
  } else {
    body = 'Our courier team has delivered your package at your doorstep.';
  }

  return await sendPushNotification(supabase, {
    userId: buyerId,
    title: 'Order Delivered! ✅',
    body,
    data: {
      type: 'order_status',
      orderId,
      status: 'delivered',
    },
  });
}

