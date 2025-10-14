import React, { createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthBootstrap } from '../hooks/useAuthBootstrap';

interface AuthContextType {
  user: any;
  profile: any;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, error } = useAuthBootstrap();

  const signUp = async (email: string, password: string) => {
    console.log('Signing up:', email);
    const result = await supabase.auth.signUp({ email, password });
    console.log('Sign up result:', result.error ? 'error' : 'success');
    return result;
  };

  const signIn = async (email: string, password: string) => {
    console.log('Signing in:', email);
    const result = await supabase.auth.signInWithPassword({ email, password });
    console.log('Sign in result:', result.error ? 'error' : 'success');
    return result;
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut(); // local scope is fine by default
    } catch (e: any) {
      if (e?.name !== 'AuthSessionMissingError') {
        console.error('signOut error', e);
      }
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,full_name,role,credits,user_type,ren_number,listing_credits,boosting_credits,created_at,updated_at')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      // Note: We can't update profile state here since it's managed by useAuthBootstrap
      console.log('Profile refreshed:', data);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  const value = {
    user,
    profile,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}