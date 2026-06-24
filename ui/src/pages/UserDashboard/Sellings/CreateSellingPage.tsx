import { UserDashboardLayout } from '@/components/UserDashboard/Layout';
import { CreateProductForm } from '@/components/Products/CreateProductForm';

export default function CreateSellingPage() {
  return (
    <UserDashboardLayout>
      <div className="p-6">
        <CreateProductForm />
      </div>
    </UserDashboardLayout>
  );
}
