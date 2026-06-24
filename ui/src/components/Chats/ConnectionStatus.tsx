import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface ConnectionStatusProps {
  isRealtimeConnected: boolean;
  className?: string;
}

export function ConnectionStatus({ 
  isRealtimeConnected, 
  className = '' 
}: ConnectionStatusProps) {
  return (
    <div className={`flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border ${className}`}>
      <div className="flex items-center gap-3">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {isRealtimeConnected ? (
            <Wifi className="h-4 w-4 text-green-500 animate-pulse" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <span className={`text-sm font-medium transition-colors duration-300 ${
            isRealtimeConnected ? 'text-green-600' : 'text-red-600'
          }`}>
            {isRealtimeConnected ? '🟢 Live Connection' : '🔴 Connection Lost'}
          </span>
        </div>
      </div>
    </div>
  );
} 