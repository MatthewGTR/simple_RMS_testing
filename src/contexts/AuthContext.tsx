import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, UserProfile } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
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
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async () => {
    console.log('=== LOADING USER PROFILE ===');
    setLoading(true);
    
    try {
      // Get current user
      console.log('Getting current user...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('User error:', userError);
        throw userError;
      }

      console.log('Current user:', user?.email || 'none');

      if (!user) {
        console.log('No user found, clearing state');
        setUser(null);
        setProfile(null);
        return;
      }

      setUser(user);

      // Fetch user profile from profiles table
      console.log('Fetching profile for user ID:', user.id);
      console.log('Making request to profiles table...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, credits, created_at, updated_at')
        .eq('id', user.id)
        .maybeSingle();

      console.log('Profile query completed');
      console.log('Profile data:', data);
      console.log('Profile error:', error);

      if (error) {
        console.error('Profile fetch error:', error);
        throw error;
      }

      if (data) {
        console.log('Profile found for:', data.email);
        setProfile(data);
      } else {
        console.log('No profile found for user, this might be expected for new users');
        setProfile(null);
      }

    } catch (error) {
      console.error('Bootstrap error:', error);
      setUser(null);
      setProfile(null);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, credits, created_at, updated_at')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  useEffect(() => {
    console.log('=== AUTH PROVIDER INITIALIZING ===');
    
    // Load initial session
    loadUserProfile();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email || 'no user');
        await loadUserProfile();
      }
    );

    return () => {
      console.log('Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

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
    console.log('Signing out');
    await supabase.auth.signOut();
  };

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}