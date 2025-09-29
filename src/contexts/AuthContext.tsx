import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Simplified UserProfile type
export type UserProfile = {
  id: string
  email: string
  role: 'user' | 'admin'
  credits: number
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
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

  useEffect(() => {
    console.log('=== AUTH PROVIDER INITIALIZING ===');
    
    let mounted = true;

    const initAuth = async () => {
      try {
        console.log('Getting session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
        }

        if (mounted) {
          if (session?.user) {
            console.log('User found:', session.user.email);
            setUser(session.user);
            
            // Create a mock profile for now to bypass database issues
            const mockProfile: UserProfile = {
              id: session.user.id,
              email: session.user.email || '',
              role: session.user.email === 'admin@test.com' ? 'admin' : 'user',
              credits: 100,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            console.log('Setting mock profile:', mockProfile);
            setProfile(mockProfile);
          } else {
            console.log('No user session found');
            setUser(null);
            setProfile(null);
          }
          
          console.log('Setting loading to false');
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          
          // Create mock profile
          const mockProfile: UserProfile = {
            id: session.user.id,
            email: session.user.email || '',
            role: session.user.email === 'admin@test.com' ? 'admin' : 'user',
            credits: 100,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          setProfile(mockProfile);
        } else {
          setUser(null);
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      console.log('Cleaning up auth provider');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    console.log('Signing up:', email);
    return supabase.auth.signUp({ email, password });
  };

  const signIn = async (email: string, password: string) => {
    console.log('Signing in:', email);
    return supabase.auth.signInWithPassword({ email, password });
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
  };

  console.log('Auth context value:', { user: !!user, profile: !!profile, loading });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}