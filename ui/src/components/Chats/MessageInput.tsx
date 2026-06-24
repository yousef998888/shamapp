import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../shadcn/button';
import { Input } from '../shadcn/input';
import { Send, AlertCircle } from 'lucide-react';
import { ChatService } from '../../services/ChatService';

interface MessageInputProps {
  newMessage: string;
  setNewMessage: (message: string) => void;
  onSendMessage: () => void;
  sendingMessage: boolean;
  orderId: string;
  currentUserId: string;
  currentUsername: string;
  otherUserId: string;
}

export function MessageInput({ 
  newMessage, 
  setNewMessage, 
  onSendMessage, 
  sendingMessage,
  orderId,
  currentUserId,
  currentUsername,
  otherUserId
}: MessageInputProps) {
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [otherUserTypingName, setOtherUserTypingName] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const typingSubscriptionRef = useRef<any>(null);

  useEffect(() => {
    // Subscribe to typing indicators
    if (orderId) {
      typingSubscriptionRef.current = ChatService.subscribeToTyping(orderId, (typingData) => {
        if (typingData.userId !== currentUserId) {
          setOtherUserTyping(typingData.isTyping);
          setOtherUserTypingName(typingData.username);
        }
      });

      return () => {
        if (typingSubscriptionRef.current) {
          typingSubscriptionRef.current.unsubscribe();
        }
      };
    }
  }, [orderId, currentUserId]);

  const handleTyping = (value: string) => {
    setNewMessage(value);
    
    // Send typing indicator
    if (!isTyping) {
      setIsTyping(true);
      ChatService.sendTypingIndicator(orderId, currentUserId, currentUsername, true);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      ChatService.sendTypingIndicator(orderId, currentUserId, currentUsername, false);
    }, 1000);
  };

  const handleSend = () => {
    // Stop typing indicator
    setIsTyping(false);
    ChatService.sendTypingIndicator(orderId, currentUserId, currentUsername, false);
    
    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    onSendMessage();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-white p-4">
      {/* Typing indicator */}
      {otherUserTyping && (
        <div className="mb-2 flex items-center text-sm text-gray-500">
          <div className="flex space-x-1 mr-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span>{otherUserTypingName} is typing...</span>
        </div>
      )}

      {/* Message input */}
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <Input
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="pr-12 resize-none"
            disabled={sendingMessage}
          />
          {isTyping && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          )}
        </div>
        <Button
          onClick={handleSend}
          disabled={!newMessage.trim() || sendingMessage}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          {sendingMessage ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Safety tip */}
      <div className="mt-3 flex items-center text-xs text-gray-500">
        <AlertCircle className="w-3 h-3 mr-1" />
        <span>Never share personal information or payment details in chat</span>
      </div>
    </div>
  );
}

