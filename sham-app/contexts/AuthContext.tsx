import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User } from '@supabase/supabase-js';
import { UserProfile } from '../types/database';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signUpLoading: boolean;
  signUpError: string | null;
  signInLoading: boolean;
  signInError: string | null;
  signUpWithEmail: (email: string, password: string) => void;
  signUpWithGoogle: () => void;
  signInWithEmail: (email: string, password: string) => void;
  signInWithGoogle: () => void;
  signOut: () => void;
  refreshProfile: () => void;
  isAuthenticated: boolean;
  sessionError?: string;
  profileError?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
