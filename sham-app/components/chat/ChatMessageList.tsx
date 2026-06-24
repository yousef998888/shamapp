import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import type { OrderMessage } from '@/types/database';

interface ChatMessageListProps {
  messages: OrderMessage[];
  currentUserId?: string | null;
  loading?: boolean;
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export function ChatMessageList({ messages, currentUserId, loading }: ChatMessageListProps) {
  const listRef = useRef<FlatList<OrderMessage>>(null);

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [messages]);

  const renderItem = ({ item }: { item: OrderMessage }) => {
    if (item.message_type === 'system') {
      return (
        <View style={styles.systemMessageWrapper}>
          <Text style={styles.systemMessageText}>{item.message}</Text>
        </View>
      );
    }

    const isOwnMessage = item.sender_id === currentUserId;

    return (
      <View style={[styles.messageWrapper, isOwnMessage ? styles.alignEnd : styles.alignStart]}>
        <View style={[styles.messageBubble, isOwnMessage ? styles.bubbleOwn : styles.bubbleOther]}>
          <Text style={[styles.messageText, isOwnMessage && styles.messageTextOwn]}>{item.message}</Text>
        </View>
        <Text style={styles.timestamp}>{formatTime(item.created_at)}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="small" color="#6366F1" />
      </View>
    );
  }

  if (messages.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Start the conversation</Text>
        <Text style={styles.emptySubtitle}>
          Use the message box below to ask questions or share updates with your trading partner.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    paddingHorizontal: 32,
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  messageWrapper: {
    marginBottom: 12,
    maxWidth: '85%',
  },
  alignStart: {
    alignSelf: 'flex-start',
  },
  alignEnd: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  messageBubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
  },
  bubbleOwn: {
    backgroundColor: '#4C1D95',
  },
  bubbleOther: {
    backgroundColor: '#F3F4F6',
  },
  messageText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 20,
  },
  messageTextOwn: {
    color: '#F9FAFB',
  },
  timestamp: {
    marginTop: 4,
    fontSize: 11,
    color: '#9CA3AF',
  },
  systemMessageWrapper: {
    alignSelf: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  systemMessageText: {
    fontSize: 12,
    color: '#4B5563',
  },
});
