import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PingSupabaseProps {
  className?: string;
}

export function PingSupabase({ className = '' }: PingSupabaseProps) {
  const { user } = useAuth();

  async function ping() {
    if (!user) {
      console.log('No user session - cannot ping profiles');
      return;
    }

    console.log('=== PINGING SUPABASE ===');
    
    try {
      // Test 1: Basic connection
      console.log('Testing basic connection...');
      const { data, error } = await supabase.from('profiles').select('id,email').limit(1);
      console.log('Basic ping - data:', data, 'error:', error);
      
      // Test 2: Current user profile
      console.log('Testing current user profile...');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id,email,role,credits')
          .eq('id', user.id)
          .maybeSingle();
        console.log('User profile - data:', profile, 'error:', profileError);
      } else {
        console.log('No authenticated user');
      }
      
      // Test 3: Network verification
      console.log('Check Network tab for requests to:', import.meta.env.VITE_SUPABASE_URL);
      
    } catch (error) {
      console.error('Ping failed:', error);
    }
  }
  
  return (
    <button 
      onClick={ping}
      disabled={!user}
      className={`px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      Ping Supabase
    </button>
  );
}