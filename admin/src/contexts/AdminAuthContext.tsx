import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseAuth, type AdminUser } from '@/lib/supabase';

interface AdminAuthContextValue {
  session: Session | null;
  user: User | null;
  adminProfile: AdminUser | null;
  loading: boolean;
  authLoading: boolean;
  signInWithPassword: (params: { email: string; password: string }) => Promise<void>;
  signUp: (params: { email: string; password: string; displayName?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAdminProfile: () => Promise<AdminUser | null>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  const loadAdminProfile = useCallback(async (nextUser: User | null): Promise<AdminUser | null> => {
    if (!nextUser) {
      setAdminProfile(null);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', nextUser.id)
        .maybeSingle();

      if (error) {
        console.error('Failed to load admin profile', error);
        setAdminProfile(null);
        return null;
      }

      if (!data || !data.is_active) {
        setAdminProfile(null);
        return null;
      }

      const profile = data as AdminUser;
      setAdminProfile(profile);
      return profile;
    } catch (err) {
      console.error('Unexpected error loading admin profile', err);
      setAdminProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        console.log('🔐 Initializing admin auth...');
        
        // Try to get session, but set a timeout fallback
        // The auth state change listener will handle the actual session loading
        let sessionLoaded = false;
        
        const sessionPromise = supabaseAuth.auth.getSession().then((result) => {
          sessionLoaded = true;
          return result;
        });
        
        // Race between session check and timeout
        const timeoutId = setTimeout(() => {
          if (!sessionLoaded && isMounted) {
            console.log('⏱️ Session check taking too long, relying on auth state change');
          }
        }, 1000);
        
        try {
          const { data, error } = await sessionPromise;
          clearTimeout(timeoutId);
          
          if (error) {
            console.error('Error getting session:', error);
          }
          
          if (!isMounted) {
            return;
          }

          if (data?.session) {
            setSession(data.session);
            const nextUser = data.session.user ?? null;
            setUser(nextUser);
            
            if (nextUser) {
              console.log('👤 User found from getSession, loading admin profile...');
              await loadAdminProfile(nextUser);
            }
          } else {
            console.log('👤 No session found, waiting for auth state change');
          }
        } catch (err) {
          clearTimeout(timeoutId);
          console.warn('Session check failed, will rely on auth state change:', err);
        }
      } catch (err: any) {
        console.error('Failed to initialize admin auth state', err);
        // Don't clear state here - let auth state change handle it
      } finally {
        // Don't set loading to false here - let auth state change handle it
        // This ensures we wait for the actual auth state
      }
    };

    init();

    const { data: listener } = supabaseAuth.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!isMounted) {
        return;
      }

      console.log('🔄 Auth state changed:', _event, nextSession?.user?.email);
      setSession(nextSession);
      const nextUser = nextSession?.user ?? null;
      setUser(nextUser);
      
      if (nextUser) {
        console.log('👤 Loading admin profile for user:', nextUser.email);
        await loadAdminProfile(nextUser);
      } else {
        console.log('👤 No user, clearing admin profile');
        setAdminProfile(null);
      }
      
      // Always set loading to false when auth state changes
      // This ensures the UI updates even if getSession() timed out
      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadAdminProfile]);

  const signInWithPassword = useCallback(async ({ email, password }: { email: string; password: string }) => {
    setAuthLoading(true);
    try {
      const { error } = await supabaseAuth.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signUp = useCallback(async ({ email, password, displayName }: { email: string; password: string; displayName?: string }) => {
    setAuthLoading(true);
    try {
      // Check if there's an admin_users record waiting for this email
      const { data: existingAdmin, error: checkError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(`Failed to check admin invitation: ${checkError.message}`);
      }

      if (!existingAdmin) {
        throw new Error('No admin invitation found for this email. Please contact a super admin to be invited.');
      }

      if (existingAdmin.user_id) {
        throw new Error('This email is already registered. Please sign in instead.');
      }

      // Create the auth account
      const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            display_name: displayName?.trim() || null,
          },
          emailRedirectTo: window.location.origin + '/login',
        },
      });

      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
          throw new Error('This email is already registered. Please sign in instead.');
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create account. Please try again.');
      }

      // Wait a moment for the session to be established
      await new Promise(resolve => setTimeout(resolve, 500));

      // Link the auth user to the admin_users record
      // Use a security definer function to bypass RLS for this update
      const { error: updateError } = await supabase.rpc('link_admin_user', {
        admin_user_id: existingAdmin.id,
        auth_user_id: authData.user.id,
        admin_email: email.trim().toLowerCase()
      });

      if (updateError) {
        console.error('Failed to link admin account:', updateError);
        // Fallback: try direct update (might work if RLS allows)
        const { error: directUpdateError } = await supabase
          .from('admin_users')
          .update({
            user_id: authData.user.id,
            invite_accepted_at: authData.user.email_confirmed_at || new Date().toISOString(),
          })
          .eq('id', existingAdmin.id)
          .eq('email', email.trim().toLowerCase())
          .is('user_id', null);

        if (directUpdateError) {
          throw new Error('Account created but failed to link admin access. Please contact support.');
        }
      }
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      const { error } = await supabaseAuth.auth.signOut();
      if (error) {
        throw error;
      }
      setSession(null);
      setUser(null);
      setAdminProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAdminProfile = useCallback(async (): Promise<AdminUser | null> => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Failed to fetch current auth user', error);
        setUser(null);
        await loadAdminProfile(null);
        return null;
      }

      const currentUser = data.user ?? null;
      setUser(currentUser);
      return await loadAdminProfile(currentUser);
    } catch (err) {
      console.error('Unexpected error refreshing admin profile', err);
      return null;
    }
  }, [loadAdminProfile]);

  const value = useMemo<AdminAuthContextValue>(() => ({
    session,
    user,
    adminProfile,
    loading,
    authLoading,
    signInWithPassword,
    signUp,
    signOut,
    refreshAdminProfile,
  }), [session, user, adminProfile, loading, authLoading, signInWithPassword, signUp, signOut, refreshAdminProfile]);

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
