import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { supabase, type AdminUser } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Shield,
  ShieldCheck,
  UserX,
} from 'lucide-react';

type Role = 'admin' | 'super_admin';

interface AdminUserRecord extends AdminUser {
  invited_by_name?: string | null;
}

export function AdminUsersPage() {
  const { session, adminProfile } = useAdminAuth();
  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [form, setForm] = useState<{ email: string; displayName: string; role: Role }>({
    email: '',
    displayName: '',
    role: 'admin',
  });

  const isSuperAdmin = adminProfile?.role === 'super_admin';

  const fetchAdminUsers = useCallback(async () => {
    if (!session) {
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Fetch admin users with invited_by info
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      // Fetch invited_by names for enrichment
      const invitedByIds = [...new Set((data ?? []).map((row) => row.invited_by).filter(Boolean))] as string[];
      let invitedByLookup: Record<string, { display_name: string | null; email: string }> = {};

      if (invitedByIds.length > 0) {
        const { data: inviters, error: invitersError } = await supabase
          .from('admin_users')
          .select('user_id, display_name, email')
          .in('user_id', invitedByIds);

        if (!invitersError && inviters) {
          invitedByLookup = inviters.reduce((acc, inviter) => {
            acc[inviter.user_id] = {
              display_name: inviter.display_name,
              email: inviter.email,
            };
            return acc;
          }, {} as Record<string, { display_name: string | null; email: string }>);
        }
      }

      const enriched = (data ?? []).map((row) => ({
        ...row,
        invited_by_name: row.invited_by ? invitedByLookup[row.invited_by]?.display_name ?? invitedByLookup[row.invited_by]?.email ?? null : null,
      })) as AdminUserRecord[];

      setAdminUsers(enriched);
    } catch (err: any) {
      console.error('Failed to load admin users', err);
      const message = err?.message ?? 'Failed to load admin users';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchAdminUsers();
    }
  }, [session, fetchAdminUsers]);

  const filteredAdminUsers = useMemo(() => {
    if (roleFilter === 'all') {
      return adminUsers;
    }
    return adminUsers.filter((admin) => admin.role === roleFilter);
  }, [adminUsers, roleFilter]);

  const handleCreateAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session || !adminProfile) {
      toast.error('You must be signed in to invite admins.');
      return;
    }
    if (!form.email.trim()) {
      toast.error('Email is required.');
      return;
    }

    setCreating(true);
    try {
      const email = form.email.trim().toLowerCase();

      // Check if admin already exists
      const { data: existingAdmin } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (existingAdmin?.is_active) {
        throw new Error('An admin with this email already exists.');
      }

      // Insert or update admin_users record
      // Note: user_id will be set when they sign up (via trigger or manual update)
      // For now, we create the record with null user_id and they can sign up
      const adminInsertPayload = {
        user_id: null, // Will be set when user signs up
        email,
        role: form.role,
        display_name: form.displayName.trim() || null,
        invited_by: adminProfile.id, // Use admin_users.id, not user_id
        invite_accepted_at: null, // Will be set when they sign up
        last_sign_in_at: null,
        is_active: true,
      };

      const { error: upsertError } = await supabase
        .from('admin_users')
        .upsert(adminInsertPayload, { onConflict: 'email' });

      if (upsertError) {
        throw upsertError;
      }

      toast.success('Admin record created. User can now sign up with this email to activate their admin access.');
      setForm({ email: '', displayName: '', role: 'admin' });
      await fetchAdminUsers();
    } catch (err: any) {
      console.error('Failed to create admin user', err);
      const message = err?.message ?? 'Failed to create admin user';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (adminId: string, role: Role) => {
    if (!session || !adminProfile) {
      toast.error('You must be signed in to update admin roles.');
      return;
    }
    if (role !== 'super_admin' && adminProfile.id === adminId) {
      toast.error('You cannot revoke your own super admin access.');
      return;
    }
    setUpdatingId(adminId);
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ role })
        .eq('id', adminId);

      if (error) {
        throw error;
      }

      toast.success('Admin role updated');
      await fetchAdminUsers();
    } catch (err: any) {
      console.error('Failed to update admin role', err);
      const message = err?.message ?? 'Failed to update admin role';
      toast.error(message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleActive = async (adminId: string, isActive: boolean) => {
    if (!session || !adminProfile) {
      toast.error('You must be signed in to update admin status.');
      return;
    }
    if (!isActive && adminProfile.id === adminId) {
      toast.error('You cannot deactivate your own account.');
      return;
    }
    setUpdatingId(adminId);
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: isActive })
        .eq('id', adminId);

      if (error) {
        throw error;
      }

      toast.success(`Admin ${isActive ? 'reactivated' : 'deactivated'}`);
      await fetchAdminUsers();
    } catch (err: any) {
      console.error('Failed to update admin status', err);
      const message = err?.message ?? 'Failed to update admin status';
      toast.error(message);
    } finally {
      setUpdatingId(null);
    }
  };

  const isSelf = useCallback((admin: AdminUserRecord) => admin.user_id === adminProfile?.user_id, [adminProfile?.user_id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Access Control</h1>
          <p className="text-sm text-muted-foreground">
            Manage super admins and administrators with access to the back office.
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={fetchAdminUsers}
          disabled={loading}
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px,1fr] lg:items-start">
        <Card className="border-primary/20 shadow-md shadow-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-primary" />
              <span>Invite an admin</span>
            </CardTitle>
            <CardDescription>
              Send an invitation email to onboard a new administrator. Only super admins can invite.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCreateAdmin}>
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email address</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@example.com"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  required
                  disabled={!isSuperAdmin || creating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-name">Display name (optional)</Label>
                <Input
                  id="admin-name"
                  placeholder="Name shown in the console"
                  value={form.displayName}
                  onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
                  disabled={!isSuperAdmin || creating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-role">Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(value: Role) => setForm((prev) => ({ ...prev, role: value }))}
                  disabled={!isSuperAdmin || creating}
                >
                  <SelectTrigger id="admin-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={!isSuperAdmin || creating}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending invitation...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Invite admin
                  </>
                )}
              </Button>
            </form>
            {!isSuperAdmin && (
              <p className="mt-4 text-xs text-muted-foreground">
                You need super admin access to invite new administrators.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Current admin users</CardTitle>
                <CardDescription>
                  Review roles, invitation status, and deactivate admin accounts.
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="role-filter" className="text-xs uppercase text-muted-foreground">
                  Filter
                </Label>
                <Select value={roleFilter} onValueChange={(value: 'all' | Role) => setRoleFilter(value)}>
                  <SelectTrigger id="role-filter" className="h-9 w-36">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="super_admin">Super admins</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invited by</TableHead>
                    <TableHead>Last active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Loading admin users...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredAdminUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-20 text-center text-sm text-muted-foreground">
                        No admin users found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAdminUsers.map((admin) => {
                      const lastActive = admin.last_sign_in_at
                        ? format(new Date(admin.last_sign_in_at), 'dd MMM yyyy, HH:mm')
                        : admin.invite_accepted_at
                          ? `Invited, pending acceptance`
                          : '—';

                      return (
                        <TableRow key={admin.id}>
                          <TableCell className="max-w-[220px] truncate font-medium">
                            <div className="flex flex-col">
                              <span>{admin.email}</span>
                              {admin.display_name && (
                                <span className="text-xs text-muted-foreground">{admin.display_name}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={admin.role}
                              onValueChange={(value: Role) => handleRoleChange(admin.id, value)}
                              disabled={!isSuperAdmin || updatingId === admin.id || isSelf(admin)}
                            >
                              <SelectTrigger className="h-8 w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="super_admin">Super admin</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {admin.is_active ? (
                                <Badge variant="outline" className="border-green-500/60 text-green-600">
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-amber-500/60 text-amber-600">
                                  <Mail className="mr-1 h-3 w-3" />
                                  Inactive
                                </Badge>
                              )}
                              {admin.role === 'super_admin' && (
                                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20">
                                  <ShieldCheck className="mr-1 h-3 w-3" />
                                  Super
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {admin.invited_by_name ? (
                              <span className="text-sm text-muted-foreground">{admin.invited_by_name}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{lastActive}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleActive(admin.id, !admin.is_active)}
                                disabled={!isSuperAdmin || updatingId === admin.id || isSelf(admin)}
                              >
                                {updatingId === admin.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : admin.is_active ? (
                                  <>
                                    <UserX className="mr-1 h-3.5 w-3.5" />
                                    Disable
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="mr-1 h-3.5 w-3.5" />
                                    Activate
                                  </>
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <Card className="bg-muted/40">
        <CardHeader>
          <CardTitle>How admin invitations work</CardTitle>
          <CardDescription>
            Super admins can invite new administrators. Invitations are delivered by email via Supabase Auth.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p className="flex items-start space-x-2">
            <CheckCircle className="mt-0.5 h-4 w-4 text-primary" />
            <span>For new emails we send a Supabase invitation. Existing auth users are promoted immediately.</span>
          </p>
          <p className="flex items-start space-x-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
            <span>Only super admins can create or promote other super admins.</span>
          </p>
          <p className="flex items-start space-x-2">
            <Mail className="mt-0.5 h-4 w-4 text-primary" />
            <span>Deactivated admins keep their auth account but lose console access.</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminUsersPage;
