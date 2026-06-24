import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { CategoriesPage } from '@/pages/CategoriesPage';
import { TagsPage } from '@/pages/TagsPage';
import { AttributesPage } from '@/pages/AttributesPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { LocationsPage } from '@/pages/LocationsPage';
import { Toaster } from '@/components/ui/sonner';
import BulkAttributeAssignmentPage from '@/pages/BulkAttributeAssignmentPage';
import { UsersPage } from '@/pages/UsersPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';
import LoginPage from '@/pages/LoginPage';
import BootstrapPage from '@/pages/BootstrapPage';
import AdminUsersPage from '@/pages/AdminUsersPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ProductsPage } from '@/pages/ProductsPage';

function CategoryDetailPage() {
  // Placeholder for category detail
  return <div>Category Details</div>;
}

function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/bootstrap" element={<BootstrapPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/tags" element={<TagsPage />} />
              <Route path="/attributes" element={<AttributesPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/locations" element={<LocationsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/cat/:categoryId" element={<CategoryDetailPage />} />
              <Route path="/bulk-attribute-assignment" element={<BulkAttributeAssignmentPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route element={<ProtectedRoute requireSuperAdmin />}>
                <Route path="/admin-users" element={<AdminUsersPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
        <Toaster />
      </AdminAuthProvider>
    </BrowserRouter>
  );
}

export default App;
