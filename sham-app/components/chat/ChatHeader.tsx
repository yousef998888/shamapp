import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useLanguageContext } from '@/contexts/LanguageContext';
import type { Order } from '@/types/database';

interface ChatHeaderProps {
  order: Order;
  currentUserId?: string | null;
  onBackPress?: () => void;
}

const formatRole = (order: Order, currentUserId?: string | null) => {
  if (!currentUserId) {
    return order.is_conversation_only ? 'Inquiry' : 'Conversation';
  }

  const isBuyer = currentUserId === order.buyer_id;
  return isBuyer ? 'Seller' : 'Buyer';
};

export function ChatHeader({ order, currentUserId, onBackPress }: ChatHeaderProps) {
  const router = useRouter();
  const { isRTL } = useLanguageContext();
  const isBuyer = currentUserId === order.buyer_id;
  const otherUser = isBuyer ? order.seller : order.buyer;

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
        {isRTL ? (
          <MaterialCommunityIcons name="arrow-right" size={24} color="#0F172A" />
        ) : (
          <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
        )}
      </TouchableOpacity>
      <View style={styles.avatarWrapper}>
        {otherUser?.avatar_url ? (
          <Image source={{ uri: otherUser.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackText}>
              {(otherUser?.full_name || otherUser?.username || 'U').slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.name} numberOfLines={1}>
          {otherUser?.full_name || otherUser?.username || 'Marketplace user'}
        </Text>
        <Text style={styles.subtitle}>
          {formatRole(order, currentUserId)} • {new Date(order.created_at).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarWrapper: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4338CA',
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#6B7280',
  },
});
