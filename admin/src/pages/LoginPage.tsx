import { FormEvent, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Loader2, Shield } from 'lucide-react';

export function LoginPage() {
  const { user, adminProfile, authLoading, signInWithPassword, signUp } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | undefined)?.from?.pathname ?? '/';

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const checkBootstrapStatus = async () => {
      // Set timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        if (isMounted) {
          setCheckingAdmin(false);
        }
      }, 3000);

      try {
        const { supabase } = await import('@/lib/supabase');
        // Check if any admin exists by querying admin_users table
        const { count, error } = await supabase
          .from('admin_users')
          .select('id', { count: 'exact', head: true });
        
        clearTimeout(timeoutId);
        
        if (error) {
          // If RLS blocks, assume admin exists (allow login)
          console.warn('Failed to check admin status:', error);
          if (isMounted) {
            setCheckingAdmin(false);
          }
        } else {
          if (isMounted) {
            // If no admin exists, redirect to bootstrap page
            if ((count ?? 0) === 0) {
              navigate('/bootstrap', { replace: true });
            } else {
              setCheckingAdmin(false);
            }
          }
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        console.error('Failed to check admin bootstrap status', error);
        // On error, allow login attempt
        if (isMounted) {
          setCheckingAdmin(false);
        }
      }
    };

    checkBootstrapStatus();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError('Enter your email and password to continue.');
      return;
    }

    if (isSignUp && password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      if (isSignUp) {
        await signUp({ email, password, displayName: displayName.trim() || undefined });
        toast.success('Account created successfully! Please check your email to confirm, then sign in.');
        setIsSignUp(false);
        setDisplayName('');
        setPassword('');
      } else {
        await signInWithPassword({ email, password });
        // The auth context's onAuthStateChange will handle loading the profile
        // Wait a moment for it to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if profile was loaded by the auth context
        // ProtectedRoute will redirect if no profile
        toast.success('Signed in successfully');
      }
    } catch (error: any) {
      console.error(`Failed to ${isSignUp ? 'sign up' : 'sign in'}`, error);
      const message = error?.message ?? `Unable to ${isSignUp ? 'sign up' : 'sign in'}. Please try again.`;
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Early return must come AFTER all hooks
  if (user && adminProfile) {
    return <Navigate to={from} replace />;
  }

  if (checkingAdmin) {
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-950/60 backdrop-blur">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10">
            <Shield className="h-6 w-6 text-indigo-400" />
          </div>
          <CardTitle className="text-2xl text-white">Admin Console</CardTitle>
          <CardDescription className="text-slate-300">
            {isSignUp ? 'Create your admin account' : 'Sign in with your admin credentials to manage Sham.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="display-name" className="text-slate-200">
                  Display Name (optional)
                </Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Your name"
                  disabled={submitting || authLoading}
                  className="bg-slate-900/60 text-slate-100 placeholder:text-slate-500"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={submitting || authLoading}
                className="bg-slate-900/60 text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isSignUp ? "Minimum 8 characters" : "••••••••"}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                disabled={submitting || authLoading}
                className="bg-slate-900/60 text-slate-100 placeholder:text-slate-500"
              />
            </div>
            {formError && (
              <p className="text-sm text-rose-400">
                {formError}
              </p>
            )}
            <Button
              type="submit"
              disabled={submitting || authLoading}
              className={cn('w-full bg-indigo-500 hover:bg-indigo-400')}
            >
              {(submitting || authLoading) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSignUp ? 'Creating account...' : 'Signing in...'}
                </>
              ) : (
                isSignUp ? 'Create Account' : 'Sign in'
              )}
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setFormError(null);
                  setPassword('');
                  setDisplayName('');
                }}
                className="text-sm text-slate-400 hover:text-slate-300 underline"
                disabled={submitting || authLoading}
              >
                {isSignUp ? 'Already have an account? Sign in' : 'Invited? Create your account'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;
