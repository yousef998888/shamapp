import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  Menu,
  ShieldCheck,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { adminProfile, signOut, loading } = useAdminAuth();
  const displayName = adminProfile?.display_name?.trim() || adminProfile?.email || 'Admin';
  const email = adminProfile?.email ?? '';
  const initials = displayName
    .split(/\s+/)
    .map((segment) => segment.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const roleLabel = adminProfile?.role === 'super_admin' ? 'Super Admin' : 'Admin';

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 lg:px-6">
      {/* Mobile Menu Button */}
      <div className="flex items-center lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar />
          </SheetContent>
        </Sheet>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-md mx-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-10 pr-4"
          />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <Button variant="outline" size="icon" className="relative" disabled>
          <Bell className="h-5 w-5" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src="" alt={displayName} />
                <AvatarFallback>{initials || 'AD'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium leading-none">{displayName}</p>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                    {roleLabel}
                  </Badge>
                </div>
                <p className="text-xs leading-none text-muted-foreground">
                  {email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            {adminProfile?.role === 'super_admin' && (
              <DropdownMenuItem>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Super Admin
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={async (event) => {
                event.preventDefault();
                if (!loading) {
                  await signOut();
                }
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
