import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, User, X } from 'lucide-react';
import { Input } from '@/components/shadcn/input';
import { Badge } from '@/components/shadcn/badge';
import { Order, OrderMessage } from '../../types/database';
import { Button } from '../shadcn/button';
import { ConnectionStatus } from './ConnectionStatus';

interface ChatSidebarProps {
  setShowSidebar?: (show: boolean) => void;
  orders: Order[];
  selectedOrder: Order | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOrderSelect: (order: Order) => void;
  currentUserId: string;
  isRealtimeConnected?: boolean;
}

export function ChatSidebar({
  setShowSidebar,
  orders,
  selectedOrder,
  searchQuery,
  onSearchChange,
  onOrderSelect,
  currentUserId,
  isRealtimeConnected = true
}: ChatSidebarProps) {
  const { t } = useTranslation();

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)} days ago`;
    } else {
      return `${Math.floor(diffInHours / 168)} weeks ago`;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return <Badge variant="destructive" className="text-xs">{t('chat.status.pendingPayment')}</Badge>;
      case 'payment_submitted':
        return <Badge variant="secondary" className="text-xs">{t('chat.status.paymentSubmitted')}</Badge>;
      case 'admin_approved':
        return <Badge variant="default" className="text-xs">{t('chat.status.adminApproved')}</Badge>;
      case 'shipped':
        return <Badge variant="default" className="text-xs">{t('chat.status.shipped')}</Badge>;
      case 'delivered':
        return <Badge variant="default" className="text-xs bg-green-600">{t('chat.status.delivered')}</Badge>;
      default:
        return null;
    }
  };

  const filteredOrders = orders.filter(order => 
    order.product?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.seller?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLastMessage = (order: Order) => {
    if (order.messages && order.messages.length > 0) {
      return order.messages[order.messages.length - 1];
    }
    return null;
  };

  return (
    <div className="w-80 border-r bg-white">
      <div className="p-4 border-b">
        <div className='flex items-center  justify-between'>
          <h1 className="text-xl font-semibold mb-4">{t('chat.inbox')}</h1>
          <Button className='md:hidden'  variant="ghost" onClick={() => setShowSidebar?.(false)}>
            <X className="h-4 w-4 text-gray-500" />
          </Button>
        </div>
        

        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t('chat.searchChats')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="overflow-y-auto h-[calc(100vh-320px)]">
        {filteredOrders.map((order) => {
          const lastMessage = getLastMessage(order);
          const isBuyer = currentUserId === order.buyer_id;
          const otherUser = isBuyer ? order.seller : order.buyer;
          
          return (
            <div
              key={order.id}
              className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedOrder?.id === order.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
              onClick={() => {
                onOrderSelect(order);
                setShowSidebar?.(false);
              }}
            >
              <div className="flex items-start gap-3">
  
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm truncate">
                      {otherUser?.username || otherUser?.full_name || 'Unknown User'}
                    </span>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {lastMessage ? formatTime(lastMessage.created_at) : formatTime(order.created_at)}
                    </span>
                  </div>
                  
 
                  
                  <p className="text-sm text-gray-600 truncate mb-2">
                    {order.product?.title || 'Product'}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 truncate flex-1 mr-2">
                      {lastMessage?.message || 'Order created'}
                    </span>
                    {getStatusBadge(order.status)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 