import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const stats = [
  {
    title: 'Server Status',
    value: 'Online',
    progress: 98,
    color: 'bg-green-500',
  },
  {
    title: 'Storage Used',
    value: '64.2 GB',
    progress: 64,
    color: 'bg-blue-500',
  },
  {
    title: 'Memory Usage',
    value: '8.1 GB',
    progress: 81,
    color: 'bg-yellow-500',
  },
  {
    title: 'CPU Usage',
    value: '23%',
    progress: 23,
    color: 'bg-purple-500',
  },
];

export function QuickStats() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {stats.map((stat, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{stat.title}</span>
              <span className="text-sm text-muted-foreground">{stat.value}</span>
            </div>
            <Progress value={stat.progress} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}