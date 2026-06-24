import React, { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../shadcn/avatar';
import { Badge } from '../shadcn/badge';
import { Check, CheckCheck, Clock } from 'lucide-react';
import { OrderMessage } from '../../types/database';

interface MessageListProps {
  messages: OrderMessage[];
  currentUserId: string;
  loadingMessages: boolean;
}

export function MessageList({ messages, currentUserId, loadingMessages }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleScroll = () => {
      const element = messagesEndRef.current?.parentElement;
      if (element) {
        const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
        setShowScrollButton(!isNearBottom);
      }
    };

    const element = messagesEndRef.current?.parentElement;
    if (element) {
      element.addEventListener('scroll', handleScroll);
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString();
  };

  const getMessageStatus = (message: OrderMessage) => {
    if (message.sender_id === currentUserId) {
      // This is our message - show delivery status
      if (message.is_read) {
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      } else {
        return <Check className="w-3 h-3 text-gray-400" />;
      }
    }
    return null;
  };

  const isSystemMessage = (message: OrderMessage) => {
    return message.message_type === 'system' || message.message_type === 'payment_status' || message.message_type === 'shipping_update';
  };

  if (loadingMessages) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium mb-2">No messages yet</p>
          <p className="text-sm">Start the conversation by sending a message!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
      {messages.map((message, index) => {
        const isOwnMessage = message.sender_id === currentUserId;
        const isFirstInGroup = index === 0 || messages[index - 1]?.sender_id !== message.sender_id;
        const isLastInGroup = index === messages.length - 1 || messages[index + 1]?.sender_id !== message.sender_id;

        return (
          <div
            key={message.id}
            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${
              isFirstInGroup ? 'mt-4' : 'mt-1'
            }`}
          >
            {!isOwnMessage && isFirstInGroup && (
              <Avatar className="h-8 w-8 mr-2 flex-shrink-0">
                <AvatarImage 
                  src={message.sender?.avatar_url} 
                  alt={message.sender?.full_name || message.sender?.username} 
                />
                <AvatarFallback>
                  {message.sender?.full_name?.charAt(0) || message.sender?.username?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            )}

            <div className={`flex flex-col ${!isOwnMessage && isFirstInGroup ? 'ml-10' : ''}`}>
              {!isOwnMessage && isFirstInGroup && (
                <span className="text-xs text-gray-500 mb-1">
                  {message.sender?.full_name || message.sender?.username || 'Unknown User'}
                </span>
              )}

              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  isSystemMessage(message)
                    ? 'bg-blue-50 text-blue-800 mx-auto text-center'
                    : isOwnMessage
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                } ${isLastInGroup ? 'rounded-br-lg' : 'rounded-br-2'} ${
                  isFirstInGroup ? 'rounded-tl-lg' : 'rounded-tl-2'
                }`}
              >
                <p className="text-sm break-words">{message.message}</p>
                
                {!isSystemMessage(message) && (
                  <div className={`flex items-center justify-between mt-1 ${
                    isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    <span className="text-xs">{formatTime(message.created_at)}</span>
                    {isOwnMessage && (
                      <div className="flex items-center ml-2">
                        {getMessageStatus(message)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <div ref={messagesEndRef} />

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
    </div>
  );
} 