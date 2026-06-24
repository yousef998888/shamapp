import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Zap,
  FolderTree,
  Settings as SettingsIcon,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

const menuItems = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    to: '/',
  },
  {
    label: 'Categories',
    icon: FolderTree,
    to: '/categories',
  },
  {
    label: 'Attributes',
    icon: SettingsIcon,
    to: '/attributes',
  },
  {
    label: 'Locations',
    icon: MapPin,
    to: '/locations',
  },
  {
    label: 'Users',
    icon: Users,
    to: '/users',
  },
  {
    label: 'Admin Users',
    icon: ShieldCheck,
    to: '/admin-users',
    superOnly: true,
  },
  {
    label: 'Orders',
    icon: ShoppingCart,
    to: '/orders',
  },
  {
    label: 'Products',
    icon: Package,
    to: '/products',
  },
  {
    label: 'Analytics',
    icon: BarChart3,
    to: '/analytics',
  },
  {
    label: 'Settings',
    icon: Settings,
    to: '/settings',
  },
];

const bottomMenuItems = [
  {
    label: 'Help & Support',
    icon: HelpCircle,
    to: '/help',
  },
];

export function Sidebar({ className }: { className?: string }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = React.useState(false);
  const { adminProfile } = useAdminAuth();
  const isSuperAdmin = adminProfile?.role === 'super_admin';
  const visibleMenuItems = React.useMemo(
    () => menuItems.filter((item) => !item.superOnly || isSuperAdmin),
    [isSuperAdmin],
  );

  return (
    <div
      className={cn(
        'relative flex h-full flex-col border-r bg-background transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="h-4 w-4" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-lg">AdminFlow</span>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 hidden lg:flex"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="py-4">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.label}
                to={item.to}
                className={cn(
                  'flex items-center px-4 py-2 rounded-lg transition-colors mb-1',
                  isActive ? 'bg-accent text-accent-foreground font-semibold' : 'hover:bg-muted',
                  collapsed && 'justify-center px-2'
                )}
              >
                <Icon className="h-5 w-5 mr-3" />
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <Separator />

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {bottomMenuItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.label}
                to={item.to}
                className={cn(
                  'flex items-center px-4 py-2 rounded-lg transition-colors mb-1',
                  isActive ? 'bg-accent text-accent-foreground font-semibold' : 'hover:bg-muted',
                  collapsed && 'justify-center px-2'
                )}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {!collapsed && item.label}
              </Link>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
