import React, { useState, useEffect } from 'react';
import { MetricCard } from './MetricCard';
import { RecentActivity } from './RecentActivity';
import { QuickStats } from './QuickStats';
import { supabase } from '@/lib/supabase';
import {
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';

export function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    approvedOrders: 0,
    completedOrders: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch users count
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Fetch orders and calculate stats
      const { data: orders } = await supabase
        .from('orders')
        .select('*');

      if (orders) {
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.grand_total, 0);
        const pendingPayments = orders.filter(o => o.status === 'payment_submitted').length;
        const approvedOrders = orders.filter(o => o.status === 'admin_approved').length;
        const completedOrders = orders.filter(o => o.status === 'completed').length;

        setStats({
          totalUsers: usersCount || 0,
          totalOrders,
          totalRevenue,
          pendingPayments,
          approvedOrders,
          completedOrders
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const metrics = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      change: 'Active users',
      changeType: 'positive' as const,
      icon: Users,
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders.toLocaleString(),
      change: 'All time orders',
      changeType: 'positive' as const,
      icon: ShoppingCart,
    },
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toLocaleString()}`,
      change: 'Gross revenue',
      changeType: 'positive' as const,
      icon: DollarSign,
    },
    {
      title: 'Pending Approvals',
      value: stats.pendingPayments.toString(),
      change: 'Need admin review',
      changeType: 'negative' as const,
      icon: AlertCircle,
    },
  ];
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here's what's happening with your business today.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        <div>
          <QuickStats />
        </div>
      </div>
    </div>
  );
}