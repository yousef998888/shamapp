import { supabase } from '../lib/supabase';
import { Order, OrderDelivery, OrderMessage, DeliveryMethod } from '../types/database';

export class OrderService {
  // Create a new order
  static async createOrder(orderData: {
    buyer_id: string;
    seller_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    shipping_fee: number;
    grand_total: number;
    currency: string;
    delivery_method_id?: string | null;
    delivery_type: 'home_delivery' | 'pickup_point' | 'seller_collection';
    delivery_address?: any;
    pickup_location_id?: string;
    pickup_location_data?: any;
    // New fields
    shipping_address_id?: string;
    pickup_address_id?: string;
    contact_phone?: string;
    special_instructions?: string;
    delivery_fee?: number;
    estimated_delivery_date?: string;
    status?: Order['status'];
    initialMessage?: string;
  }): Promise<Order | null> {
    try {
      // First, ensure the buyer exists in the public.users table
      const { error: buyerError } = await supabase
        .from('users')
        .select('id')
        .eq('id', orderData.buyer_id)
        .single();

      if (buyerError && buyerError.code === 'PGRST116') {
        // User doesn't exist in public.users, create a basic profile
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser.user) {
          const { error: insertError } = await supabase.from('users').insert({
            id: orderData.buyer_id,
            email: authUser.user.email || '',
            password_hash: '', // This will be empty for auth users
            full_name: authUser.user.user_metadata?.full_name || '',
            username: authUser.user.user_metadata?.username || authUser.user.email?.split('@')[0] || '',
            avatar_url: authUser.user.user_metadata?.avatar_url || '',
            phone: authUser.user.phone || '',
            location: '',
            bio: '',
            is_verified: false,
            rating: 0,
            total_sales: 0,
            member_since: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          if (insertError) throw insertError;
        }
      } else if (buyerError) {
        throw buyerError;
      }

      const resolvedStatus: Order['status'] =
        orderData.status ??
        (orderData.delivery_type === 'seller_collection' ? 'awaiting_collection' : 'pending_payment');

      let deliveryMethodId = orderData.delivery_method_id ?? null;
      if (!deliveryMethodId && orderData.delivery_type === 'seller_collection') {
        const fallbackMethod = await this.getOrCreateDeliveryMethod('seller_collection', {
          display_name: 'Seller Collection',
          base_price: 0,
          estimated_days: 0,
          is_active: true,
        });
        deliveryMethodId = fallbackMethod?.id ?? null;
      }

      if (!deliveryMethodId) {
        throw new Error('Delivery method is not configured for this order type.');
      }

      // Start a transaction
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          buyer_id: orderData.buyer_id,
          seller_id: orderData.seller_id,
          product_id: orderData.product_id,
          quantity: orderData.quantity,
          unit_price: orderData.unit_price,
          total_amount: orderData.total_amount,
          shipping_fee: orderData.shipping_fee,
          grand_total: orderData.grand_total,
          currency: orderData.currency,
          status: resolvedStatus,
          // New delivery fields
          delivery_method_id: deliveryMethodId,
          delivery_type: orderData.delivery_type,
          // Only include fields that are actually provided
          ...(orderData.shipping_address_id && { shipping_address_id: orderData.shipping_address_id }),
          ...(orderData.pickup_address_id && { pickup_address_id: orderData.pickup_address_id }),
          ...(orderData.contact_phone && { contact_phone: orderData.contact_phone }),
          ...(orderData.special_instructions && { special_instructions: orderData.special_instructions }),
          delivery_fee: orderData.delivery_fee ?? 0,
          ...(orderData.estimated_delivery_date && { estimated_delivery_date: orderData.estimated_delivery_date }),
        })
        .select(`
          *,
          product:products(*),
          buyer:users!orders_buyer_id_fkey(*),
          seller:users!orders_seller_id_fkey(*)
        `)
        .single();

      if (orderError) throw orderError;

      // Create delivery record
      const { error: deliveryError } = await supabase
        .from('order_deliveries')
        .insert({
          order_id: order.id,
          delivery_method_id: deliveryMethodId,
          delivery_type: orderData.delivery_type,
          delivery_address: orderData.delivery_address,
          pickup_location_data: orderData.pickup_location_data,
          // New fields - only include if provided
          ...(orderData.shipping_address_id && { shipping_address_id: orderData.shipping_address_id }),
          ...(orderData.pickup_address_id && { pickup_address_id: orderData.pickup_address_id }),
          ...(orderData.contact_phone && { contact_phone: orderData.contact_phone }),
          delivery_fee: orderData.delivery_fee ?? 0,
        });

      if (deliveryError) throw deliveryError;

      const message =
        orderData.initialMessage ??
        (resolvedStatus === 'awaiting_collection'
          ? 'Collection order created. Coordinate pickup details here.'
          : 'Order created successfully. Please complete payment to proceed.');

      // Create initial system message
      const { error: messageError } = await supabase
        .from('order_messages')
        .insert({
          order_id: order.id,
          sender_id: orderData.buyer_id,
          receiver_id: orderData.seller_id,
          message,
          message_type: 'system',
        });

      if (messageError) throw messageError;

      await this.setProductStatus(orderData.product_id, 'inactive');

      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      return null;
    }
  }

  private static async getOrCreateDeliveryMethod(
    name: string,
    defaults: { display_name: string; base_price: number; estimated_days: number; is_active?: boolean },
  ): Promise<DeliveryMethod | null> {
    try {
      const { data, error } = await supabase
        .from('delivery_methods')
        .select('*')
        .eq('name', name)
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        return data as DeliveryMethod;
      }

      const { data: inserted, error: insertError } = await supabase
        .from('delivery_methods')
        .insert({
          name,
          display_name: defaults.display_name,
          base_price: defaults.base_price,
          estimated_days: defaults.estimated_days,
          is_active: defaults.is_active ?? true,
        })
        .select('*')
        .single();

      if (insertError) {
        throw insertError;
      }

      return inserted as DeliveryMethod;
    } catch (error) {
      console.error('Error ensuring delivery method:', error);
      return null;
    }
  }

  private static async setProductStatus(
    productId: string,
    status: 'active' | 'inactive' | 'sold' | 'draft',
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('products')
        .update({ status })
        .eq('id', productId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error setting product status:', error);
    }
  }

  // Get orders for a user (buyer or seller)
  static async getOrders(
    userId: string,
    role: 'buyer' | 'seller',
    options: { includeConversations?: boolean } = {},
  ): Promise<Order[]> {
    const includeConversations = options.includeConversations ?? false;

    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          product:products(*),
          buyer:users!orders_buyer_id_fkey(*),
          seller:users!orders_seller_id_fkey(*),
          delivery:order_deliveries(
            *,
            delivery_method:delivery_methods(*)
          ),
          payment:order_payments(*),
          messages:order_messages(
            *,
            sender:users!order_messages_sender_id_fkey(*),
            receiver:users!order_messages_receiver_id_fkey(*)
          ),
          statuses:order_statuses(
            *,
            changed_by_user:users!order_statuses_changed_by_fkey(*)
          )
        `)
        .eq(role === 'buyer' ? 'buyer_id' : 'seller_id', userId);

      if (!includeConversations) {
        query = query.eq('is_conversation_only', false);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  // Get a single order with all relations
  static async getOrder(orderId: string): Promise<Order | null> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          product:products(*),
          buyer:users!orders_buyer_id_fkey(*),
          seller:users!orders_seller_id_fkey(*),
          delivery:order_deliveries(
            *,
            delivery_method:delivery_methods(*)
          ),
          payment:order_payments(*),
          messages:order_messages(
            *,
            sender:users!order_messages_sender_id_fkey(*),
            receiver:users!order_messages_receiver_id_fkey(*)
          ),
          statuses:order_statuses(
            *,
            changed_by_user:users!order_statuses_changed_by_fkey(*)
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching order:', error);
      return null;
    }
  }

  // Update order status
  static async updateOrderStatus(orderId: string, status: Order['status'], changedBy: string, reason?: string, metadata?: any): Promise<boolean> {
    try {
      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Add status history (trigger should handle this automatically, but we'll add it explicitly)
      const { error: statusError } = await supabase
        .from('order_statuses')
        .insert({
          order_id: orderId,
          status,
          changed_by: changedBy,
          reason,
          metadata,
        });

      if (statusError) throw statusError;

      try {
        const order = await this.getOrder(orderId);
        const productId = order?.product_id;
        if (productId) {
          if (['shipped', 'delivered', 'completed'].includes(status)) {
            await this.setProductStatus(productId, 'sold');
          } else if (status === 'cancelled') {
            await this.setProductStatus(productId, 'active');
          } else if (['pending_payment', 'awaiting_collection', 'payment_submitted', 'admin_approved'].includes(status)) {
            await this.setProductStatus(productId, 'inactive');
          }
        }
      } catch (productStatusError) {
        console.error('Error syncing product status:', productStatusError);
      }

      return true;
    } catch (error) {
      console.error('Error updating order status:', error);
      return false;
    }
  }

  // Submit payment proof
  static async submitPaymentProof(orderId: string, paymentId: string, amount: number, currency: string): Promise<boolean> {
    try {
      // Create payment record
      const { error: paymentError } = await supabase
        .from('order_payments')
        .insert({
          order_id: orderId,
          payment_method: 'sham_cash',
          payment_id: paymentId,
          amount,
          currency,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        });

      if (paymentError) throw paymentError;

      // Update order with payment ID
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          payment_id: paymentId,
          status: 'payment_submitted'
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Add system message
      const { error: messageError } = await supabase
        .from('order_messages')
        .insert({
          order_id: orderId,
          sender_id: (await this.getOrder(orderId))?.buyer_id || '',
          receiver_id: (await this.getOrder(orderId))?.seller_id || '',
          message: `Payment proof submitted with ID: ${paymentId}`,
          message_type: 'payment_status',
        });

      if (messageError) throw messageError;

      return true;
    } catch (error) {
      console.error('Error submitting payment proof:', error);
      return false;
    }
  }

  // Send a message
  static async sendMessage(orderId: string, senderId: string, receiverId: string, message: string, messageType: OrderMessage['message_type'] = 'text'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('order_messages')
        .insert({
          order_id: orderId,
          sender_id: senderId,
          receiver_id: receiverId,
          message,
          message_type: messageType,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  // Get delivery methods
  static async getDeliveryMethods(): Promise<DeliveryMethod[]> {
    try {
      const { data, error } = await supabase
        .from('delivery_methods')
        .select('*')
        .eq('is_active', true)
        .order('base_price', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching delivery methods:', error);
      return [];
    }
  }

  // Update delivery status
  static async updateDeliveryStatus(
    orderId: string,
    deliveryStatus: OrderDelivery['delivery_status'],
    options: {
      trackingNumber?: string;
      invoiceId?: string;
      deliveryNoteUrl?: string;
    } = {},
  ): Promise<boolean> {
    try {
      const updateData: Record<string, any> = { delivery_status: deliveryStatus };

      if (options.trackingNumber) {
        updateData.tracking_number = options.trackingNumber;
      }
      if (options.invoiceId !== undefined) {
        updateData.invoice_id = options.invoiceId;
      }
      if (options.deliveryNoteUrl !== undefined) {
        updateData.delivery_note_url = options.deliveryNoteUrl;
      }

      const { error } = await supabase
        .from('order_deliveries')
        .update(updateData)
        .eq('order_id', orderId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating delivery status:', error);
      return false;
    }
  }

  // Mark message as read
  static async markMessageAsRead(messageId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('order_messages')
        .update({ is_read: true })
        .eq('id', messageId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return false;
    }
  }
} 
