import React from 'react';

interface ChatLoadingProps {
  message?: string;
}

export function ChatLoading({ message = "Loading..." }: ChatLoadingProps) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-gray-600">{message}</p>
      </div>
    </div>
  );
} 