import React, { useMemo } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Order, OrderMessage } from '@/types/database';

interface ChatListProps {
  conversations: Order[];
  selectedOrderId?: string | null;
  onSelect: (orderId: string) => void;
  currentUserId?: string | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

const formatRelativeTime = (timestamp: string) => {
  const createdAt = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return createdAt.toLocaleDateString();
};

const getLastMessage = (messages?: OrderMessage[]) => {
  if (!messages?.length) {
    return null;
  }
  return messages.reduce((latest, current) =>
    new Date(current.created_at) > new Date(latest.created_at) ? current : latest,
  );
};

export function ChatList({
  conversations,
  selectedOrderId,
  onSelect,
  currentUserId,
  searchQuery,
  onSearchChange,
}: ChatListProps) {
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversations;
    }

    const query = searchQuery.toLowerCase();
    return conversations.filter(order => {
      const otherUser =
        currentUserId && order.buyer_id === currentUserId ? order.seller : order.buyer;
      const name = otherUser?.full_name || otherUser?.username || '';
      const productTitle = order.product?.title || '';

      return (
        name.toLowerCase().includes(query) ||
        productTitle.toLowerCase().includes(query) ||
        order.id.toLowerCase().includes(query)
      );
    });
  }, [conversations, currentUserId, searchQuery]);

  const renderItem = ({ item }: { item: Order }) => {
    const lastMessage = getLastMessage(item.messages);
    const isSelected = item.id === selectedOrderId;
    const isBuyer = currentUserId === item.buyer_id;
    const otherUser = isBuyer ? item.seller : item.buyer;
    const productImage = item.product?.images?.[0]?.image_url;

    return (
      <TouchableOpacity
        onPress={() => onSelect(item.id)}
        style={[styles.row, isSelected && styles.rowSelected]}
      >
        <View style={styles.avatarWrapper}>
          {productImage ? (
            <Image source={{ uri: productImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>
                {(otherUser?.full_name || otherUser?.username || 'U').slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.rowBody}>
          <View style={styles.rowHeader}>
            <Text style={styles.name} numberOfLines={1}>
              {otherUser?.full_name || otherUser?.username || 'Marketplace user'}
            </Text>
            <Text style={styles.timestamp}>
              {lastMessage ? formatRelativeTime(lastMessage.created_at) : formatRelativeTime(item.created_at)}
            </Text>
          </View>
          <Text style={styles.product} numberOfLines={1}>
            {item.product?.title || 'Product'}
          </Text>
          <Text style={styles.preview} numberOfLines={1}>
            {lastMessage
              ? lastMessage.message_type === 'system'
                ? `System • ${lastMessage.message}`
                : lastMessage.message
              : 'Conversation started'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchWrapper}>
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search chats"
          style={styles.searchInput}
          placeholderTextColor="#9CA3AF"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>
      <FlatList
        data={filteredConversations}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={filteredConversations.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>
              Start exploring products to connect with sellers and buyers.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchWrapper: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  rowSelected: {
    backgroundColor: '#EEF2FF',
  },
  avatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 14,
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0E7FF',
  },
  avatarFallbackText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4338CA',
  },
  rowBody: {
    flex: 1,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  product: {
    marginTop: 2,
    fontSize: 13,
    color: '#4B5563',
  },
  preview: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
