import { FormEvent, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Loader2, ShieldPlus } from 'lucide-react';

export function BootstrapPage() {
  const { user, adminProfile, signInWithPassword, refreshAdminProfile, signOut } = useAdminAuth();
  const navigate = useNavigate();

  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const [setupEmail, setSetupEmail] = useState('');
  const [setupName, setSetupName] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupPasswordConfirm, setSetupPasswordConfirm] = useState('');
  const [creatingSuperAdmin, setCreatingSuperAdmin] = useState(false);

  // If already logged in, redirect to dashboard
  if (user && adminProfile) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const fetchBootstrapStatus = async () => {
      setBootstrapLoading(true);
      
      // Set a timeout to show the form even if query is slow
      timeoutId = setTimeout(() => {
        if (isMounted) {
          setBootstrapLoading(false);
          setAdminExists(false);
          setBootstrapError('Status check is taking longer than expected. You can still create the first super admin.');
        }
      }, 5000); // 5 second timeout

      try {
        // Check if any admin exists by querying admin_users table
        const { count, error } = await supabase
          .from('admin_users')
          .select('id', { count: 'exact', head: true });
        
        clearTimeout(timeoutId);
        
        if (error) {
          // If RLS blocks the query, assume no admin exists (safer for first setup)
          console.warn('Failed to check admin status (RLS may be blocking):', error);
          if (isMounted) {
            setAdminExists(false);
            setBootstrapError('Unable to verify admin status. You can still create the first super admin.');
          }
        } else {
          const exists = (count ?? 0) > 0;
          if (isMounted) {
            setAdminExists(exists);
            setBootstrapError(null);
            // If admin already exists, redirect to login
            if (exists) {
              navigate('/login', { replace: true });
            }
          }
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        console.error('Failed to check admin bootstrap status', error);
        if (isMounted) {
          // On error, assume no admin exists and allow bootstrap (safer for first setup)
          setAdminExists(false);
          setBootstrapError('Unable to verify admin status. You can still create the first super admin.');
        }
      } finally {
        if (isMounted) {
          setBootstrapLoading(false);
        }
      }
    };

    fetchBootstrapStatus();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [navigate]);

  const handleCreateSuperAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBootstrapError(null);

    if (!setupEmail || !setupPassword) {
      setBootstrapError('Email and password are required.');
      return;
    }

    if (setupPassword.length < 8) {
      setBootstrapError('Password must be at least 8 characters long.');
      return;
    }

    if (setupPassword !== setupPasswordConfirm) {
      setBootstrapError('Passwords do not match.');
      return;
    }

    setCreatingSuperAdmin(true);
    try {
      const email = setupEmail.trim().toLowerCase();
      
      // First, double-check that no admin exists
      const { count: existingCount } = await supabase
        .from('admin_users')
        .select('id', { count: 'exact', head: true });
      
      if ((existingCount ?? 0) > 0) {
        throw new Error('A super admin already exists. Please sign in instead.');
      }

      // Create the user account via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: setupPassword,
        options: {
          data: {
            display_name: setupName.trim() || null,
          },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
          throw new Error('This email is already registered. Please sign in or use a different email.');
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create user account. Please try again.');
      }

      // Insert into admin_users table
      const { error: insertError } = await supabase
        .from('admin_users')
        .insert({
          user_id: authData.user.id,
          email,
          role: 'super_admin',
          display_name: setupName.trim() || null,
          invited_by: null,
          invite_accepted_at: authData.user.email_confirmed_at || new Date().toISOString(),
          last_sign_in_at: authData.user.last_sign_in_at || null,
          is_active: true,
        });

      if (insertError) {
        // If insert fails, try to clean up the auth user
        console.error('Failed to create admin record:', insertError);
        throw new Error('Failed to create admin account. Please try again.');
      }

      toast.success('Super admin created successfully. Signing you in...');
      setAdminExists(true);
      setBootstrapError(null);

      // Automatically sign in the newly created super admin
      try {
        await signInWithPassword({
          email: setupEmail.trim(),
          password: setupPassword,
        });
        const profile = await refreshAdminProfile();

        if (!profile) {
          await signOut();
          setBootstrapError('Your account was created but admin access could not be verified. Please try signing in manually.');
          toast.error('Admin access verification failed');
          setCreatingSuperAdmin(false);
          navigate('/login', { replace: true });
          return;
        }

        toast.success('Signed in successfully');
        // Clear bootstrap form fields
        setSetupEmail('');
        setSetupName('');
        setSetupPassword('');
        setSetupPasswordConfirm('');
        setCreatingSuperAdmin(false);
        // Redirect to dashboard
        navigate('/', { replace: true });
      } catch (signInError: any) {
        console.error('Failed to auto-sign in after bootstrap', signInError);
        toast.info('Super admin created. Please sign in manually.');
        setCreatingSuperAdmin(false);
        navigate('/login', { replace: true });
      }
    } catch (error: any) {
      console.error('Failed to create super admin', error);
      const message = error?.message ?? 'Failed to create super admin. Please try again.';
      setBootstrapError(message);
      toast.error(message);
      setCreatingSuperAdmin(false);
    }
  };

  if (bootstrapLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
        <Card className="w-full max-w-md border-slate-800 bg-slate-950/60 backdrop-blur">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
            </div>
            <CardTitle className="text-2xl text-white">Checking access</CardTitle>
            <CardDescription className="text-slate-300">
              One moment while we verify the admin setup.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // If admin exists, show a message (redirect happens in useEffect)
  if (adminExists === true) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
        <Card className="w-full max-w-md border-slate-800 bg-slate-950/60 backdrop-blur">
          <CardHeader className="space-y-3 text-center">
            <CardTitle className="text-2xl text-white">Admin already exists</CardTitle>
            <CardDescription className="text-slate-300">
              Redirecting to login page...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
      <Card className="w-full max-w-lg border-slate-800 bg-slate-950/60 backdrop-blur">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <ShieldPlus className="h-6 w-6 text-emerald-400" />
          </div>
          <CardTitle className="text-2xl text-white">Create the first super admin</CardTitle>
          <CardDescription className="text-slate-300">
            No admin account exists yet. Create the first super admin to secure the console.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleCreateSuperAdmin}>
            <div className="space-y-2">
              <Label htmlFor="setup-name" className="text-slate-200">
                Display name (optional)
              </Label>
              <Input
                id="setup-name"
                value={setupName}
                onChange={(event) => setSetupName(event.target.value)}
                placeholder="e.g. Sham Admin"
                disabled={creatingSuperAdmin}
                className="bg-slate-900/60 text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-email" className="text-slate-200">
                Email
              </Label>
              <Input
                id="setup-email"
                type="email"
                value={setupEmail}
                onChange={(event) => setSetupEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={creatingSuperAdmin}
                className="bg-slate-900/60 text-slate-100 placeholder:text-slate-500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-password" className="text-slate-200">
                Password
              </Label>
              <Input
                id="setup-password"
                type="password"
                value={setupPassword}
                onChange={(event) => setSetupPassword(event.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                disabled={creatingSuperAdmin}
                className="bg-slate-900/60 text-slate-100 placeholder:text-slate-500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-password-confirm" className="text-slate-200">
                Confirm password
              </Label>
              <Input
                id="setup-password-confirm"
                type="password"
                value={setupPasswordConfirm}
                onChange={(event) => setSetupPasswordConfirm(event.target.value)}
                placeholder="Re-type your password"
                autoComplete="new-password"
                disabled={creatingSuperAdmin}
                className="bg-slate-900/60 text-slate-100 placeholder:text-slate-500"
                required
              />
            </div>
            {bootstrapError && (
              <p className="text-sm text-rose-400">
                {bootstrapError}
              </p>
            )}
            <Button
              type="submit"
              disabled={creatingSuperAdmin}
              className="w-full bg-emerald-500 hover:bg-emerald-400"
            >
              {creatingSuperAdmin ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating super admin...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Create super admin
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default BootstrapPage;

