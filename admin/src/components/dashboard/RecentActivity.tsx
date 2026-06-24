import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const activities = [
  {
    id: 1,
    user: 'Alice Johnson',
    avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop',
    action: 'Created new order',
    target: '#12345',
    time: '2 minutes ago',
    status: 'success',
  },
  {
    id: 2,
    user: 'Bob Smith',
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop',
    action: 'Updated product',
    target: 'iPhone 15 Pro',
    time: '5 minutes ago',
    status: 'info',
  },
  {
    id: 3,
    user: 'Carol Davis',
    avatar: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop',
    action: 'Cancelled order',
    target: '#12340',
    time: '10 minutes ago',
    status: 'warning',
  },
  {
    id: 4,
    user: 'David Wilson',
    avatar: 'https://images.pexels.com/photos/927022/pexels-photo-927022.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop',
    action: 'Added new user',
    target: 'sarah@example.com',
    time: '15 minutes ago',
    status: 'success',
  },
];

export function RecentActivity() {
  const getStatusBadge = (status: string) => {
    const variants = {
      success: 'bg-green-100 text-green-800',
      info: 'bg-blue-100 text-blue-800',
      warning: 'bg-yellow-100 text-yellow-800',
    };
    return variants[status as keyof typeof variants] || variants.info;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-center space-x-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={activity.avatar} alt={activity.user} />
                <AvatarFallback>
                  {activity.user.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">{activity.user}</p>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${getStatusBadge(activity.status)}`}
                  >
                    {activity.action}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {activity.target} • {activity.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}