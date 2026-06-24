import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../shadcn/avatar';
import { Badge } from '../shadcn/badge';

interface ChatHeaderProps {
  order: any;
  currentUserId: string;
}

export function ChatHeader({ order, currentUserId }: ChatHeaderProps) {
  const isBuyer = currentUserId === order.buyer_id;
  const otherUser = isBuyer ? order.seller : order.buyer;

  return (
    <div className="bg-white border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherUser?.avatar_url} alt={otherUser?.full_name || otherUser?.username} />
              <AvatarFallback>
                {otherUser?.full_name?.charAt(0) || otherUser?.username?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>

          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900">
              {otherUser?.full_name || otherUser?.username || 'Unknown User'}
            </h3>
            <div className="flex items-center space-x-2">
             
              {order.status && (
                <Badge variant="secondary" className="text-xs">
                  {order.status}
                </Badge>
              )}

            </div>
          </div>
        </div>

        {/* <div className="flex items-center space-x-2">
          <Button size="sm" variant="ghost" className="text-gray-600 hover:text-gray-900">
            <Phone className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-gray-600 hover:text-gray-900">
            <Video className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-gray-600 hover:text-gray-900">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div> */}
      </div>
    </div>
  );
} 