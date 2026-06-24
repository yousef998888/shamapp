import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { useDirection } from '../hooks/useDirection';
import { ChatSidebar, ChatDetail, ChatLoading, EmptyChatState } from '../components/Chats';
import { OrderService } from '../services/OrderService';
import { ChatService } from '../services/ChatService';
import { Order, OrderMessage } from '../types/database';

export function ChatsPage() {
  const { user } = useAuthContext();
  const { isRTL } = useDirection();
  const navigate = useNavigate();
  const { chatId } = useParams<{ chatId?: string }>();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  useEffect(() => {
    // Clear messages and input when switching chats
    setMessages([]);
    setNewMessage('');
    
    if (chatId) {
      const order = orders.find(o => o.id === chatId);
      setSelectedOrder(order || null);
      if (order) {
        loadMessages(order.id);
        subscribeToMessages(order.id);
        // Close sidebar on mobile when chat is selected
        setShowSidebar(false);
      }
    } else if (orders.length > 0) {
      setSelectedOrder(orders[0]);
      if (orders[0]) {
        loadMessages(orders[0].id);
        subscribeToMessages(orders[0].id);
      }
    }
  }, [chatId, orders]);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [subscription]);

  const loadMessages = async (orderId: string) => {
    setLoadingMessages(true);
    try {
      const messages = await ChatService.getMessages(orderId);
      setMessages(messages);
      
      // Mark messages as read
      if (user) {
        await ChatService.markMessagesAsRead(orderId, user.id);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    console.log('handleSendMessage called', { newMessage, user: user?.id, selectedOrder: selectedOrder?.id });
    
    if (newMessage.trim() && user && selectedOrder) {
      setSendingMessage(true);
      try {
        const isBuyer = user.id === selectedOrder.buyer_id;
        const receiverId = isBuyer ? selectedOrder.seller_id : selectedOrder.buyer_id;
        
        console.log('Sending message', { orderId: selectedOrder.id, senderId: user.id, receiverId, message: newMessage });
        
        const result = await ChatService.sendMessage(selectedOrder.id, user.id, receiverId, newMessage);
        console.log('Message sent result:', result);
        
        if (result) {
          // Add message to local state immediately for instant feedback
          setMessages(prev => [...prev, result]);
        }
        
        setNewMessage('');
      } catch (error) {
        console.error('Error sending message:', error);
      } finally {
        setSendingMessage(false);
      }
    } else {
      console.log('Cannot send message:', { 
        hasMessage: !!newMessage.trim(), 
        hasUser: !!user, 
        hasOrder: !!selectedOrder 
      });
    }
  };

  const subscribeToMessages = (orderId: string) => {
    // Cleanup previous subscription
    if (subscription) {
      subscription.unsubscribe();
    }

    const newSubscription = ChatService.subscribeToMessages(orderId, (newMessage) => {
      console.log('Received real-time message:', newMessage);
      
      // Check if message is already in the list to avoid duplicates
      setMessages(prev => {
        const exists = prev.some(m => m.id === newMessage.id);
        if (!exists) {
          return [...prev, newMessage];
        }
        return prev;
      });
      
      // Mark message as read if it's for the current user
      if (user && newMessage.receiver_id === user.id) {
        ChatService.markMessagesAsRead(orderId, user.id);
      }
    });

    setSubscription(newSubscription);
    
    // Track subscription status
    if (newSubscription && newSubscription.subscribe) {
      newSubscription.subscribe((status: string) => {
        console.log('Subscription status changed:', status);
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });
    }
  };

  const fetchOrders = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch orders where user is either buyer or seller
      const buyerOrders = await OrderService.getOrders(user.id, 'buyer');
      const sellerOrders = await OrderService.getOrders(user.id, 'seller');
      
      // Combine and sort by creation date
      const allOrders = [...buyerOrders, ...sellerOrders].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setOrders(allOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSelect = (order: Order) => {
    setSelectedOrder(order);
    navigate(`/dashboard/chats/${order.id}`);
  };

  if (loading) {
    return <ChatLoading message="Loading orders..." />;
  }

  return (
    <div className={`h-[calc(100vh)] flex flex-col lg:flex-row ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Mobile Header with Back Button and Toggle */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b bg-white">
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold">Chats</h1>
      </div>

      {/* Mobile Sidebar Overlay */}
      {showSidebar && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setShowSidebar(false)}>
          <div className="fixed inset-y-0 left-0 w-80 bg-white shadow-lg" onClick={(e) => e.stopPropagation()}>
            <ChatSidebar
              setShowSidebar={setShowSidebar}
              orders={orders}
              selectedOrder={selectedOrder}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOrderSelect={handleOrderSelect}
              currentUserId={user?.id || ''}
              isRealtimeConnected={isRealtimeConnected}
            />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block lg:w-80 lg:border-e lg:bg-white">
        <ChatSidebar
          orders={orders}
          selectedOrder={selectedOrder}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOrderSelect={handleOrderSelect}
          currentUserId={user?.id || ''}
          isRealtimeConnected={isRealtimeConnected}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-gray-50 relative min-h-0">
        {selectedOrder ? (
          <ChatDetail 
            order={selectedOrder} 
            messages={messages}
            onSendMessage={handleSendMessage}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            sendingMessage={sendingMessage}
            loadingMessages={loadingMessages}
            currentUserId={user?.id || ''}
            isRealtimeConnected={isRealtimeConnected}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <EmptyChatState />
          </div>
        )}
      </div>
    </div>
  );
}