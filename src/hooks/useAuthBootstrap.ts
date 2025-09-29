import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

type Profile = { 
  id: string; 
  email: string | null; 
  full_name: string | null; 
  role: string;
  credits: number;
  created_at: string;
  updated_at: string;
};

export function useAuthBootstrap() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        console.log('=== LOADING USER PROFILE ===');
        setLoading(true);
        setError(null);

        const { data: { user }, error: uerr } = await supabase.auth.getUser();
        if (uerr) {
          console.error('Auth error:', uerr);
          throw uerr;
        }

        console.log('Current user:', user?.email || 'none');

        if (!user) {
          console.log('No user found, clearing state');
          setUser(null);
          setProfile(null);
          return;
        }

        setUser(user);

        console.log('Fetching profile for user ID:', user.id);
        const { data, error } = await supabase
          .from('profiles')
          .select('id,email,full_name,role,credits,created_at,updated_at')
          .eq('id', user.id)
          .maybeSingle();

        console.log('Profile query result - data:', data, 'error:', error);

        if (error) {
          console.error('Profile fetch error:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          throw error;
        }

        setProfile(data ?? null);
        console.log('Profile set:', data?.email || 'none', 'role:', data?.role || 'none');
      } catch (e: any) {
        console.error('Auth bootstrap error:', {
          message: e?.message,
          code: e?.code,
          details: e?.details,
          hint: e?.hint
        });
        setError(e?.message ?? String(e));
        setProfile(null);
      } finally {
        if (!cancelled) {
          console.log('Setting loading to false');
          setLoading(false);
        }
      }
    }

    load();
    
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email || 'no user');
      load();
    });
    
    return () => { 
      cancelled = true; 
      sub.subscription.unsubscribe(); 
    };
  }, []);

  return { user, profile, loading, error };
}