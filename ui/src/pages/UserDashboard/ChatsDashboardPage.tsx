import React from 'react';
import { ChatsPage } from '../ChatsPage';
import { UserDashboardLayout } from '@/components/UserDashboard/Layout';

export default function ChatsDashboardPage() {
  return (
    <UserDashboardLayout>
      <ChatsPage />
    </UserDashboardLayout>
  );
} 