import { supabase } from '../lib/supabase';

export function PingSupabase() {
  async function ping() {
    console.log('=== PINGING SUPABASE ===');
    const { data, error } = await supabase.from('profiles').select('id,email').limit(1);
    console.log('profiles ping data:', data, 'error:', error);
  }
  
  return (
    <button 
      onClick={ping}
      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
    >
      Ping Supabase
    </button>
  );
}