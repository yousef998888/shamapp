import { supabase } from '@/lib/supabase';
import { OrderMessage } from '@/types/database';

export class ChatService {
  // Send a message
  static async sendMessage(
    orderId: string, 
    senderId: string, 
    receiverId: string, 
    message: string,
    messageType: 'text' | 'system' | 'payment_status' | 'shipping_update' = 'text'
  ): Promise<OrderMessage | null> {
    console.log('ChatService.sendMessage called with:', { orderId, senderId, receiverId, message, messageType });
    
    try {
      const { data, error } = await supabase
        .from('order_messages')
        .insert({
          order_id: orderId,
          sender_id: senderId,
          receiver_id: receiverId,
          message: message,
          message_type: messageType,
          created_at: new Date().toISOString()
        })
        .select(`
          *,
          sender:users!order_messages_sender_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          ),
          receiver:users!order_messages_receiver_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        console.error('Supabase error sending message:', error);
        return null;
      }

      console.log('Message sent successfully:', data);
      return data;
    } catch (error) {
      console.error('Exception sending message:', error);
      return null;
    }
  }

  // Get messages for an order
  static async getMessages(orderId: string): Promise<OrderMessage[]> {
    try {
      const { data, error } = await supabase
        .from('order_messages')
        .select(`
          *,
          sender:users!order_messages_sender_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          ),
          receiver:users!order_messages_receiver_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  // Subscribe to real-time messages for an order
  static subscribeToMessages(
    orderId: string, 
    callback: (message: OrderMessage) => void
  ) {
    console.log('Setting up real-time subscription for order:', orderId);
    
    const subscription = supabase
      .channel(`order_messages_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_messages',
          filter: `order_id=eq.${orderId}`
        },
        async (payload) => {
          console.log('Real-time message received:', payload);
          if (payload.new) {
            try {
              // Fetch the full message with sender/receiver details
              const { data: messageData, error } = await supabase
                .from('order_messages')
                .select(`
                  *,
                  sender:users!order_messages_sender_id_fkey(
                    id,
                    username,
                    full_name,
                    avatar_url
                  ),
                  receiver:users!order_messages_receiver_id_fkey(
                    id,
                    username,
                    full_name,
                    avatar_url
                  )
                `)
                .eq('id', payload.new.id)
                .single();

              if (error) {
                console.error('Error fetching message details:', error);
                return;
              }

              if (messageData) {
                callback(messageData);
              }
            } catch (error) {
              console.error('Error processing real-time message:', error);
            }
          }
        }
      )
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'order_messages',
        filter: `order_id=eq.${orderId}`
      }, (payload) => {
        console.log('Message updated:', payload);
        // Handle message updates (e.g., read status)
        if (payload.new) {
          callback(payload.new as OrderMessage);
        }
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to real-time messages for order:', orderId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error for order:', orderId);
        } else if (status === 'TIMED_OUT') {
          console.error('Subscription timed out for order:', orderId);
        }
      });

    return subscription;
  }

  // Subscribe to order status changes
  static subscribeToOrderStatus(
    orderId: string, 
    callback: (order: any) => void
  ) {
    return supabase
      .channel(`order_status_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();
  }

  // Subscribe to typing indicators
  static subscribeToTyping(
    orderId: string,
    callback: (typingData: { userId: string; isTyping: boolean; username: string }) => void
  ) {
    return supabase
      .channel(`typing_${orderId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        callback(payload.payload);
      })
      .subscribe();
  }

  // Send typing indicator
  static async sendTypingIndicator(
    orderId: string,
    userId: string,
    username: string,
    isTyping: boolean
  ) {
    try {
      await supabase
        .channel(`typing_${orderId}`)
        .send({
          type: 'broadcast',
          event: 'typing',
          payload: { userId, isTyping, username }
        });
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  }

  // Mark messages as read
  static async markMessagesAsRead(
    orderId: string, 
    userId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('order_messages')
        .update({ is_read: true })
        .eq('order_id', orderId)
        .eq('receiver_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking messages as read:', error);
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  // Get unread message count for a user
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('order_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error getting unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Send system message (for status updates, etc.)
  static async sendSystemMessage(
    orderId: string,
    message: string,
    senderId: string,
    receiverId: string
  ): Promise<OrderMessage | null> {
    return this.sendMessage(orderId, senderId, receiverId, message, 'system');
  }
} 