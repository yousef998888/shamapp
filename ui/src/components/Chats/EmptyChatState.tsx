import React from 'react';
import { User } from 'lucide-react';

export function EmptyChatState() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center text-gray-500">
        <User className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium text-gray-600 mb-2">Select a chat to start messaging</p>
        <p className="text-sm text-gray-400">Choose a conversation from the sidebar to begin</p>
      </div>
    </div>
  );
} 