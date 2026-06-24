import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuthContext } from '@/contexts/AuthContext';
import ChatService from '@/services/ChatService';
import type { OrderMessage } from '@/types/database';

interface UseRealtimeChatOptions {
  orderId?: string;
}

export function useRealtimeChat({ orderId }: UseRealtimeChatOptions) {
  const { user } = useAuthContext();
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const loadMessages = useCallback(
    async (options: { silent?: boolean } = {}) => {
      const silent = options.silent ?? false;

    if (!orderId) {
      setMessages([]);
      return;
    }

    if (!silent) {
      setLoading(true);
    }
    try {
      const data = await ChatService.getMessages(orderId);
      setMessages(
        data.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
      );
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  },
    [orderId],
  );

  const subscribeToMessages = useCallback(() => {
    if (!orderId) {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      return;
    }

    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    const channel = ChatService.subscribeToMessages(orderId, newMessage => {
      setMessages(prev => {
        const alreadyExists = prev.some(message => message.id === newMessage.id);
        const base = alreadyExists
          ? prev.map(message => (message.id === newMessage.id ? newMessage : message))
          : [...prev, newMessage];

        return base
          .slice()
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });

      if (user && newMessage.receiver_id === user.id) {
        ChatService.markMessagesAsRead(orderId, user.id);
      }

      // Refresh the thread to keep relations (sender/receiver) in sync and recover from missed events.
      void loadMessages({ silent: true });
    });

    channelRef.current = channel;
  }, [loadMessages, orderId, user]);

  const sendMessage = useCallback(
    async (content: string, receiverId: string, type: OrderMessage['message_type'] = 'text') => {
      if (!orderId || !user?.id || !content.trim()) {
        return null;
      }

      const message = await ChatService.sendMessage(orderId, user.id, receiverId, content.trim(), type);
      if (message) {
        setMessages(prev =>
          [...prev, message]
            .slice()
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
        );
      }
      return message;
    },
    [orderId, user?.id],
  );

  const markAsRead = useCallback(async () => {
    if (orderId && user?.id) {
      await ChatService.markMessagesAsRead(orderId, user.id);
    }
  }, [orderId, user?.id]);

  useEffect(() => {
    loadMessages();
    subscribeToMessages();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [loadMessages, subscribeToMessages]);

  useEffect(() => {
    if (messages.length && user?.id) {
      markAsRead();
    }
  }, [messages, user?.id, markAsRead]);

  return {
    messages,
    loading,
    sendMessage,
    markAsRead,
    reloadMessages: loadMessages,
  };
}
