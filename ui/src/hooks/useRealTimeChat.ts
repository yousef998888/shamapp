import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { ChatService } from '@/services/ChatService';
import { OrderMessage } from '@/types/database';

interface UseRealTimeChatProps {
  orderId: string;
}

export function useRealTimeChat({ orderId }: UseRealTimeChatProps) {
  const { user } = useAuthContext();
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  // Load initial messages
  const loadMessages = useCallback(async () => {
    if (!orderId) return;
    
    setLoading(true);
    try {
      const messages = await ChatService.getMessages(orderId);
      setMessages(messages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // Subscribe to real-time messages
  const subscribeToMessages = useCallback(() => {
    if (!orderId) return;

    // Cleanup previous subscription
    if (subscription) {
      subscription.unsubscribe();
    }

    const newSubscription = ChatService.subscribeToMessages(orderId, (newMessage) => {
      setMessages(prev => [...prev, newMessage]);
    });

    setSubscription(newSubscription);
  }, [orderId, subscription]);

  // Send a message
  const sendMessage = useCallback(async (message: string, receiverId: string) => {
    if (!user || !orderId || !message.trim()) return;

    try {
      const sentMessage = await ChatService.sendMessage(
        orderId,
        user.id,
        receiverId,
        message,
        'text' // Use 'text' instead of 'user'
      );
      
      if (sentMessage) {
        // Message will be added via real-time subscription
        return sentMessage;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [user, orderId]);

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!user || !orderId) return;

    try {
      await ChatService.markMessagesAsRead(orderId, user.id);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [user, orderId]);

  // Initialize
  useEffect(() => {
    loadMessages();
    subscribeToMessages();

    // Cleanup on unmount
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [orderId]);

  // Mark messages as read when user is active
  useEffect(() => {
    if (messages.length > 0 && user) {
      markAsRead();
    }
  }, [messages, user, markAsRead]);

  return {
    messages,
    loading,
    sendMessage,
    markAsRead,
    reloadMessages: loadMessages
  };
} 