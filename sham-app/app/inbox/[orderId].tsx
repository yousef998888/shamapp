import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { ChatComposer, ChatHeader, ChatMessageList, ChatProductCard, ChatStatusCard } from '@/components/chat';
import { useAuthContext } from '@/contexts/AuthContext';
import { useRealtimeChat } from '@/hooks/useRealtimeChat';
import ChatService from '@/services/ChatService';
import OrderService from '@/services/OrderService';
import type { Order } from '@/types/database';
import { usePageTranslation } from '@/hooks/useTranslation';

const InboxDetailScreen = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { user, profile, isAuthenticated, loading: authLoading } = useAuthContext();
  const { t } = usePageTranslation('chatPage');
  const params = useLocalSearchParams<{ orderId?: string }>();

  const orderIdParam = useMemo(() => {
    const raw = params.orderId;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params.orderId]);

  const [order, setOrder] = useState<Order | null>(null);
  const [orderLoading, setOrderLoading] = useState(true);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [composerValue, setComposerValue] = useState('');
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const typingChannelRef = useRef<RealtimeChannel | null>(null);

  const {
    messages,
    loading: messagesLoading,
    sendMessage,
  } = useRealtimeChat({ orderId: orderIdParam });

  useEffect(() => {
    setOrder(prev => {
      if (!prev) {
        return prev;
      }
      return { ...prev, messages };
    });
  }, [messages]);

  const loadOrder = useCallback(async () => {
    if (!orderIdParam) {
      return;
    }

    setOrderLoading(true);
    setOrderError(null);

    try {
      const data = await OrderService.getOrder(orderIdParam);
      if (!data) {
        setOrderError(t.couldNotFindConversation || 'We could not find this conversation.');
        setOrder(null);
      } else {
        setOrder(data);
      }
    } catch (error) {
      console.error('InboxDetailScreen.loadOrder error', error);
      setOrderError(t.couldNotLoadConversation || 'We could not load this conversation. Please try again later.');
    } finally {
      setOrderLoading(false);
    }
  }, [orderIdParam]);

  useEffect(() => {
    if (isAuthenticated && orderIdParam) {
      loadOrder();
    }
  }, [isAuthenticated, loadOrder, orderIdParam]);

  useEffect(() => {
    if (!order) {
      return;
    }

    const otherUser = user?.id === order.buyer_id ? order.seller : order.buyer;
    const title = otherUser?.full_name || otherUser?.username || t.chat || 'Chat';
    navigation.setOptions({ title });
  }, [navigation, order, user?.id]);

  useEffect(() => {
    if (!orderIdParam) {
      return undefined;
    }

    if (typingChannelRef.current) {
      typingChannelRef.current.unsubscribe();
    }

    const channel = ChatService.subscribeToTyping(orderIdParam, payload => {
      if (!payload) {
        return;
      }

      setTypingUsers(prev => {
        const next = { ...prev };
        if (payload.userId === user?.id) {
          return next;
        }

        if (payload.isTyping) {
          next[payload.userId] = payload.username;
        } else {
          delete next[payload.userId];
        }
        return next;
      });
    });

    typingChannelRef.current = channel;

    return () => {
      channel.unsubscribe();
      typingChannelRef.current = null;
      setTypingUsers({});
    };
  }, [orderIdParam, user?.id]);

  const handleTypingStart = useCallback(() => {
    if (!orderIdParam || !user?.id) {
      return;
    }

    ChatService.sendTypingIndicator(
      orderIdParam,
      user.id,
      profile?.username || profile?.full_name || 'You',
      true,
    ).catch(error => console.error('InboxDetailScreen.handleTypingStart error', error));
  }, [orderIdParam, profile?.full_name, profile?.username, user?.id]);

  const handleTypingStop = useCallback(() => {
    if (!orderIdParam || !user?.id) {
      return;
    }

    ChatService.sendTypingIndicator(
      orderIdParam,
      user.id,
      profile?.username || profile?.full_name || 'You',
      false,
    ).catch(error => console.error('InboxDetailScreen.handleTypingStop error', error));
  }, [orderIdParam, profile?.full_name, profile?.username, user?.id]);

  const handleSend = useCallback(async () => {
    if (!order || !user?.id || !orderIdParam || !composerValue.trim()) {
      return;
    }

    const receiverId = user.id === order.buyer_id ? order.seller_id : order.buyer_id;
    if (!receiverId) {
      return;
    }

    setSending(true);
    try {
      const sent = await sendMessage(composerValue, receiverId);
      if (!sent) {
        throw new Error('Message not sent');
      }
      setComposerValue('');
      handleTypingStop();
    } catch (error) {
      console.error('InboxDetailScreen.handleSend error', error);
      Alert.alert(t.messageNotSent || 'Message not sent', t.pleaseTryAgain || 'Please try again.');
    } finally {
      setSending(false);
    }
  }, [composerValue, handleTypingStop, order, orderIdParam, sendMessage, user?.id]);

  const typingIndicatorText = useMemo(() => {
    return Object.values(typingUsers)
      .filter(Boolean)
      .map(name => name.trim())
      .join(', ');
  }, [typingUsers]);

  if (authLoading) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#4338CA" />
        <Text style={styles.centeredText}>{t.loading || 'Loading…'}</Text>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <Text style={styles.title}>{t.signInToViewChats || 'Sign in to view chats'}</Text>
        <Text style={styles.subtitle}>
          {t.conversationRequiresAccount || 'This conversation requires a Sham account. Sign in to continue chatting.'}
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/auth/login')}>
          <Text style={styles.primaryButtonText}>{t.signIn || 'Sign in'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!orderIdParam) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <Text style={styles.title}>{t.missingConversationId || 'Missing conversation ID'}</Text>
        <Text style={styles.subtitle}>{t.goBackAndSelectChat || 'Please go back and select a chat.'}</Text>
      </SafeAreaView>
    );
  }

  if (orderLoading && !order) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#4338CA" />
        <Text style={styles.centeredText}>{t.loadingConversation || 'Loading conversation…'}</Text>
      </SafeAreaView>
    );
  }

  if (orderError || !order) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <Text style={styles.title}>{t.conversationUnavailable || 'Conversation unavailable'}</Text>
        <Text style={styles.subtitle}>{orderError || (t.chatMayHaveBeenRemoved || 'This chat may have been removed.')}</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={loadOrder}>
          <Text style={styles.secondaryButtonText}>{t.tryAgain || 'Try again'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isBuyer = user?.id === order.buyer_id;
  const receiverId = isBuyer ? order.seller_id : order.buyer_id;

  return (
    <SafeAreaView style={styles.container}>
      <ChatHeader order={order} currentUserId={user?.id} />
      <ChatProductCard order={order} />
      <ChatStatusCard order={order} currentUserId={user?.id} />

      <View style={styles.messagesWrapper}>
        <ChatMessageList
          messages={messages}
          currentUserId={user?.id}
          loading={messagesLoading && messages.length === 0}
        />
      </View>

      {typingIndicatorText ? (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingIndicatorText}>{typingIndicatorText} {t.isTyping || 'is typing…'}</Text>
        </View>
      ) : null}

      <ChatComposer
        value={composerValue}
        onChangeText={setComposerValue}
        onSend={handleSend}
        disabled={sending || !receiverId}
        placeholder={t.writeMessage || 'Write a message…'}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  messagesWrapper: {
    flex: 1,
    marginTop: 8,
  },
  typingIndicator: {
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  typingIndicatorText: {
    fontSize: 12,
    color: '#6B7280',
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  centeredText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: '#4338CA',
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 20,
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#4338CA',
  },
  secondaryButtonText: {
    color: '#4338CA',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default InboxDetailScreen;
