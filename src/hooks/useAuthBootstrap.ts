import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  credits: number | null;
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
        setLoading(true);

        // Gate everything on the session.
        const { data: { session }, error: sErr } = await supabase.auth.getSession();
        if (sErr) throw sErr;

        if (!session) {
          setUser(null);
          setProfile(null);
          return;
        }

        // We have a session.
        const user = session.user;
        setUser(user);

        const { data: prof, error: pErr } = await supabase
          .from('profiles')
          .select('id,email,full_name,role,credits')
          .eq('id', user.id)
          .maybeSingle();

        if (pErr) throw pErr;

        setProfile(prof ?? null);
      } catch (e: any) {
        // Treat missing session as signed out rather than an error.
        if (e?.name === 'AuthSessionMissingError' || e?.__isAuthError) {
          setUser(null);
          setProfile(null);
        } else {
          console.error('Auth bootstrap error', e);
          setError(e?.message ?? String(e));
          setProfile(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user ?? null);
        // Reload profile when signed in
        load();
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, profile, loading, error };
}