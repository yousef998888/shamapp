import React, { useState, useEffect } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { ChatService } from "@/services/ChatService";
import { Badge } from "@/components/shadcn/badge";
import { Bell } from "lucide-react";

interface ChatNotificationProps {
  className?: string;
}

export function ChatNotification({ className }: ChatNotificationProps) {
  const { user } = useAuthContext();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadUnreadCount();
      // Refresh unread count every 30 seconds
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadUnreadCount = async () => {
    if (!user) return;

    try {
      const count = await ChatService.getUnreadCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  if (!user)
    return (
      <div className={`relative ${className}`}>
        <Bell className="h-5 w-5" />
      </div>
    );

  return (
    <div className={`relative ${className}`}>
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </div>
  );
}
