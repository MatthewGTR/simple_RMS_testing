import { createClient } from '@supabase/supabase-js';

console.log('=== SUPABASE CLIENT INIT ===');
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  credits: number;
  created_at: string;
  updated_at: string;
};