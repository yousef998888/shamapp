import React from 'react';
import { UserDashboardLayout } from '@/components/UserDashboard/Layout';
import { EditProductForm } from '../../../components/Products/EditProductForm';

export function EditSellingPage() {
  return (
    <UserDashboardLayout>
      <div className="p-6">
        <EditProductForm />
      </div>
    </UserDashboardLayout>
  );
} 