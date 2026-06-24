import { Loader2 } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

interface ProtectedRouteProps {
  requireSuperAdmin?: boolean;
}

export function ProtectedRoute({ requireSuperAdmin = false }: ProtectedRouteProps) {
  const location = useLocation();
  const { loading, user, adminProfile } = useAdminAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !adminProfile) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireSuperAdmin && adminProfile.role !== 'super_admin') {
    if (location.pathname === '/') {
      return <Outlet />;
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
