import { UserDashboardLayout } from '@/components/UserDashboard/Layout';
import { EmptyState } from '@/components/UserDashboard/EmptyState';

export default function DashboardPage() {
  return (
    <UserDashboardLayout>
      <EmptyState />
    </UserDashboardLayout>
  );
}