import { useState, useEffect, useRef } from 'react';
import {  Session } from '@supabase/supabase-js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import AuthService from '@/services/AuthService';

export function useAuth() {
  const queryClient = useQueryClient();
  const authListenerRef = useRef<any>(null);

  // Query for current session
  const {
    data: session,
    isLoading: isSessionLoading,
    error: sessionError,
    refetch: refetchSession,
  } = useQuery<Session | null>({
    queryKey: ['authSession'],
    queryFn: AuthService.getCurrentSession
  });

  // Safely access user from session
  const user = session?.user || null;

  // Query for user profile
  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['userProfile', session?.user?.id],
    queryFn: () => {
      if (!session?.user?.id) {
        throw new Error('No user ID available');
      }
      return AuthService.fetchUserProfile(session.user.id);
    },
    enabled: !!session?.user?.id, // Only run when we have a user

  });

  // Sign up with email mutation
  const signUpWithEmailMutation = useMutation({
    mutationFn: AuthService.signUpWithEmailMutationFn,
    onSuccess: (data) => {
      if (data.user) {
        toast.success("Check your email to confirm your account!");
        // Invalidate and refetch session and profile
        queryClient.invalidateQueries({ queryKey: ['authSession'] });
        queryClient.invalidateQueries({ queryKey: ['userProfile', data.user.id] });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Sign up with Google mutation
  const signUpWithGoogleMutation = useMutation({
    mutationFn: AuthService.signUpWithGoogleMutationFn,
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Sign in with email mutation
  const signInWithEmailMutation = useMutation({
    mutationFn: AuthService.signInWithEmailMutationFn,
    onSuccess: (data) => {
      if (data.user) {
        toast.success("Welcome back!");
        // Invalidate and refetch session and profile
        queryClient.invalidateQueries({ queryKey: ['authSession'] });
        queryClient.invalidateQueries({ queryKey: ['userProfile', data.user.id] });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Sign in with Google mutation
  const signInWithGoogleMutation = useMutation({
    mutationFn: AuthService.signInWithGoogleMutationFn,
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Sign out mutation
  const signOutMutation = useMutation({
    mutationFn: AuthService.signOutMutationFn,
    onSuccess: () => {
      // Clear all auth-related queries
      queryClient.removeQueries({ queryKey: ['authSession'] });
      queryClient.removeQueries({ queryKey: ['userProfile'] });
      toast.success("Signed out successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Set up auth state change listener - only once
  useEffect(() => {
    // Clean up any existing listener
    if (authListenerRef.current) {
      authListenerRef.current.unsubscribe();
      authListenerRef.current = null;
    }

    let debounceTimer: NodeJS.Timeout;
    
    const { data } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state changed:', event, newSession?.user?.id);
      
      // Clear any existing debounce timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      // Debounce the auth state change to prevent rapid successive calls
      debounceTimer = setTimeout(async () => {
        // Invalidate and refetch session and profile queries
        await queryClient.invalidateQueries({ queryKey: ['authSession'] });
        if (newSession?.user) {
          await queryClient.invalidateQueries({ queryKey: ['userProfile', newSession.user.id] });
        } else {
          // Clear profile data when user signs out
          queryClient.removeQueries({ queryKey: ['userProfile'] });
        }
      }, 100); // 100ms debounce
    });
    
    authListenerRef.current = data.subscription;

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      if (authListenerRef.current) {
        authListenerRef.current.unsubscribe();
        authListenerRef.current = null;
      }
    };
  }, []); // Remove queryClient dependency to prevent multiple listeners

  // Helper functions
  const signUpWithEmail = (email: string, password: string) => {
    signUpWithEmailMutation.mutate({ email, password });
  };

  const signUpWithGoogle = () => {
    signUpWithGoogleMutation.mutate();
  };

  const signInWithEmail = (email: string, password: string) => {
    signInWithEmailMutation.mutate({ email, password });
  };

  const signInWithGoogle = () => {
    signInWithGoogleMutation.mutate();
  };

  const signOut = () => {
    signOutMutation.mutate();
  };

  const refreshProfile = () => {
    if (session?.user?.id) {
      refetchProfile();
    }
  };

  // Add a timeout for loading state to prevent infinite loading
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  useEffect(() => {
    if (isSessionLoading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 5000); // 5 second timeout
      
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [isSessionLoading]);

  return {
    user: user,
    profile: profile || null,
    loading: (isSessionLoading || isProfileLoading) && !loadingTimeout,
    signUpLoading: signUpWithEmailMutation.isPending,
    signUpError: signUpWithEmailMutation.error?.message || null,
    signInLoading: signInWithEmailMutation.isPending,
    signInError: signInWithEmailMutation.error?.message || null,
    signUpWithEmail,
    signUpWithGoogle,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    refreshProfile,
    refetchSession,
    authSubscription: authListenerRef.current, 
    isAuthenticated: !!session?.user,
    sessionError: sessionError?.message,
    profileError: profileError?.message,
  };
}