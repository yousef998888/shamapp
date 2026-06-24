import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';
import type { Order, OrderMessage } from '@/types/database';

class ChatService {
  static async sendMessage(
    orderId: string,
    senderId: string,
    receiverId: string,
    message: string,
    messageType: OrderMessage['message_type'] = 'text',
  ): Promise<OrderMessage | null> {
    try {
      const { data, error } = await supabase
        .from('order_messages')
        .insert({
          order_id: orderId,
          sender_id: senderId,
          receiver_id: receiverId,
          message,
          message_type: messageType,
        })
        .select(
          `
            *,
            sender:users!order_messages_sender_id_fkey(*),
            receiver:users!order_messages_receiver_id_fkey(*)
          `,
        )
        .single();

      if (error) {
        console.error('ChatService.sendMessage error', error);
        return null;
      }

      return (data as OrderMessage) ?? null;
    } catch (error) {
      console.error('ChatService.sendMessage exception', error);
      return null;
    }
  }

  static async getMessages(orderId: string): Promise<OrderMessage[]> {
    try {
      const { data, error } = await supabase
        .from('order_messages')
        .select(
          `
            *,
            sender:users!order_messages_sender_id_fkey(*),
            receiver:users!order_messages_receiver_id_fkey(*)
          `,
        )
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('ChatService.getMessages error', error);
        return [];
      }

      return (data as OrderMessage[]) ?? [];
    } catch (error) {
      console.error('ChatService.getMessages exception', error);
      return [];
    }
  }

  static subscribeToMessages(
    orderId: string,
    callback: (message: OrderMessage) => void,
  ): RealtimeChannel {
    const channel = supabase
      .channel(`order_messages_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_messages',
          filter: `order_id=eq.${orderId}`,
        },
        async payload => {
          if (!payload.new) {
            return;
          }

          const { data, error } = await supabase
            .from('order_messages')
            .select(
              `
                *,
                sender:users!order_messages_sender_id_fkey(*),
                receiver:users!order_messages_receiver_id_fkey(*)
              `,
            )
            .eq('id', payload.new.id)
            .single();

          if (error) {
            console.error('ChatService.subscribeToMessages fetch error', error);
            callback(payload.new as OrderMessage);
            return;
          }

          if (data) {
            callback(data as OrderMessage);
          } else {
            callback(payload.new as OrderMessage);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_messages',
          filter: `order_id=eq.${orderId}`,
        },
        payload => {
          if (payload.new) {
            callback(payload.new as OrderMessage);
          }
        },
      )
      .subscribe();

    return channel;
  }

  static subscribeToOrderStatus(
    orderId: string,
    callback: (order: Record<string, unknown>) => void,
  ): RealtimeChannel {
    const channel = supabase
      .channel(`order_status_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        payload => {
          if (payload.new) {
            callback(payload.new as Record<string, unknown>);
          }
        },
      )
      .subscribe();

    return channel;
  }

  static subscribeToTyping(
    orderId: string,
    callback: (typingData: { userId: string; isTyping: boolean; username: string }) => void,
  ): RealtimeChannel {
    const channel = supabase
      .channel(`typing_${orderId}`)
      .on('broadcast', { event: 'typing' }, payload => {
        if (payload?.payload) {
          callback(payload.payload as { userId: string; isTyping: boolean; username: string });
        }
      })
      .subscribe();

    return channel;
  }

  static async sendTypingIndicator(
    orderId: string,
    userId: string,
    username: string,
    isTyping: boolean,
  ): Promise<void> {
    try {
      await supabase.channel(`typing_${orderId}`).send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, isTyping, username },
      });
    } catch (error) {
      console.error('ChatService.sendTypingIndicator error', error);
    }
  }

  static async markMessagesAsRead(orderId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('order_messages')
        .update({ is_read: true })
        .eq('order_id', orderId)
        .eq('receiver_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('ChatService.markMessagesAsRead error', error);
      }
    } catch (error) {
      console.error('ChatService.markMessagesAsRead exception', error);
    }
  }

  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('order_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('ChatService.getUnreadCount error', error);
        return 0;
      }

      return count ?? 0;
    } catch (error) {
      console.error('ChatService.getUnreadCount exception', error);
      return 0;
    }
  }

  static async sendSystemMessage(
    orderId: string,
    message: string,
    senderId: string,
    receiverId: string,
  ): Promise<OrderMessage | null> {
    return this.sendMessage(orderId, senderId, receiverId, message, 'system');
  }

  static async getOrCreateConversation(options: {
    buyerId: string;
    sellerId: string;
    productId: string;
    productPrice?: number | null;
    currency?: string | null;
  }): Promise<{ order: Order | null; created: boolean }> {
    const { buyerId, sellerId, productId, productPrice, currency } = options;

    try {
      const selectClause = `
            *,
            product:products(*),
            buyer:users!orders_buyer_id_fkey(*),
            seller:users!orders_seller_id_fkey(*),
            messages:order_messages(
              *,
              sender:users!order_messages_sender_id_fkey(*),
              receiver:users!order_messages_receiver_id_fkey(*)
            )
          `;

      const baseQuery = () =>
        supabase
          .from('orders')
          .select(selectClause)
          .eq('buyer_id', buyerId)
          .eq('seller_id', sellerId)
          .eq('product_id', productId)
          .order('created_at', { ascending: false })
          .limit(1);

      const { data: existingOrder, error: existingOrderError } = await baseQuery()
        .eq('is_conversation_only', false)
        .maybeSingle();

      if (existingOrderError && existingOrderError.code !== 'PGRST116') {
        throw existingOrderError;
      }

      if (existingOrder) {
        return { order: existingOrder as Order, created: false };
      }

      const { data: existingConversation, error: existingConversationError } = await baseQuery()
        .eq('is_conversation_only', true)
        .maybeSingle();

      if (existingConversationError && existingConversationError.code !== 'PGRST116') {
        throw existingConversationError;
      }

      if (existingConversation) {
        return { order: existingConversation as Order, created: false };
      }

      const safeCurrency = currency || 'GBP';
      const { data: inserted, error: insertError } = await supabase
        .from('orders')
        .insert({
          buyer_id: buyerId,
          seller_id: sellerId,
          product_id: productId,
          quantity: 1,
          unit_price: 0,
          total_amount: 0,
          shipping_fee: 0,
          grand_total: 0,
          currency: safeCurrency,
          status: 'pending_payment',
          is_conversation_only: true,
        })
        .select(selectClause)
        .single();

      if (insertError) {
        throw insertError;
      }

      return { order: inserted as Order, created: true };
    } catch (error) {
      console.error('ChatService.getOrCreateConversation error', error);
      return { order: null, created: false };
    }
  }
}

export default ChatService;
