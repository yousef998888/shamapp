import  { useState, useEffect } from 'react';
import { ChatHeader } from './ChatHeader';
import { ProductInfo } from './ProductInfo';
import { OrderStatus } from './OrderStatus';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { PaymentModal } from '../Products/PaymentModal';
import { ReceiptConfirmationModal } from '../Products/ReceiptConfirmationModal';
import { OrderService } from '../../services/OrderService';
import { Order, OrderMessage } from '../../types/database';

interface ChatDetailProps {
  order: Order;
  messages: OrderMessage[];
  onSendMessage: () => void;
  newMessage: string;
  setNewMessage: (message: string) => void;
  sendingMessage: boolean;
  loadingMessages: boolean;
  currentUserId: string;
  isRealtimeConnected?: boolean;
}

export function ChatDetail({
  order,
  messages,
  onSendMessage,
  newMessage,
  setNewMessage,
  sendingMessage,
  loadingMessages,
  currentUserId,
  isRealtimeConnected = true
}: ChatDetailProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(order);

  // Update currentOrder when order prop changes
  useEffect(() => {
    setCurrentOrder(order);
  }, [order]);

  const handlePaymentSubmitted = async (paymentId: string) => {
    if (currentUserId) {
      await OrderService.submitPaymentProof(order.id, paymentId, order.grand_total, order.currency);
      setShowPaymentModal(false);
      // Refresh the order
      const updatedOrder = await OrderService.getOrder(order.id);
      if (updatedOrder) {
        setCurrentOrder(updatedOrder);
      }
    }
  };

  const handleReceiptConfirmed = async (review: string, rating: number) => {
    if (currentUserId) {
      await OrderService.updateOrderStatus(order.id, 'completed', currentUserId, 'Item received and confirmed');
      setShowReceiptModal(false);
      // Refresh the order
      const updatedOrder = await OrderService.getOrder(order.id);
      if (updatedOrder) {
        setCurrentOrder(updatedOrder);
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      <ChatHeader order={currentOrder} currentUserId={currentUserId} />
      <ProductInfo order={currentOrder} currentUserId={currentUserId} />
      <OrderStatus 
        order={currentOrder} 
        currentUserId={currentUserId}
        onShowPaymentModal={() => setShowPaymentModal(true)}
        onShowReceiptModal={() => setShowReceiptModal(true)}
      />
      <MessageList 
        messages={messages} 
        currentUserId={currentUserId} 
        loadingMessages={loadingMessages} 
      />
      <MessageInput 
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        onSendMessage={onSendMessage}
        sendingMessage={sendingMessage}
        orderId={order.id}
        currentUserId={currentUserId}
        currentUsername={order.buyer_id === currentUserId ? order.buyer?.username || 'Buyer' : order.seller?.username || 'Seller'}
        otherUserId={order.buyer_id === currentUserId ? order.seller_id : order.buyer_id}
      />

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal 
          chat={currentOrder} 
          onClose={() => setShowPaymentModal(false)}
          onPaymentSubmitted={handlePaymentSubmitted}
        />
      )}

      {/* Receipt Confirmation Modal */}
      {showReceiptModal && (
        <ReceiptConfirmationModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          productTitle={currentOrder.product?.title || 'Product'}
          onConfirmReceipt={handleReceiptConfirmed}
        />
      )}
    </div>
  );
} 