import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Plus, Minus, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  credits: number;
  created_at: string;
  updated_at: string;
};

export function AdminPanel() {
  const { user, profile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin';

  const fetchProfiles = async () => {
    if (!user || !isAdmin) {
      setError('Admin access required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage('Loading profiles...');

      // Get the user's session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Call the admin backend endpoint
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-profiles`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setProfiles(data.profiles || []);
      setMessage(`Loaded ${data.profiles?.length || 0} profiles successfully`);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      setError(`Failed to load profiles: ${(error as Error).message}`);
      setMessage('');
    } finally {
      setLoading(false);
    }
  };

  const updateCredits = async (userId: string, creditChange: number) => {
    if (!user || !isAdmin) {
      setError('Admin access required');
      return;
    }

    setUpdating(userId);
    setError(null);
    
    try {
      // Get the user's session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Call the admin backend endpoint
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-profiles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_credits',
          p_user_id: userId,
          p_delta: creditChange,
          reason: `Admin adjustment: ${creditChange > 0 ? 'added' : 'removed'} ${Math.abs(creditChange)} credits`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setMessage(`Credits updated successfully. New balance: ${data.new_credits || 'unknown'}`);
      
      // Refresh the profiles list
      await fetchProfiles();
    } catch (error) {
      console.error('Error updating credits:', error);
      setError(`Failed to update credits: ${(error as Error).message}`);
    } finally {
      setUpdating(null);
    }
  };

  const pingSupabase = async () => {
    try {
      console.log('=== PINGING SUPABASE (User Profile) ===');
      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,credits')
        .eq('id', user?.id)
        .maybeSingle();
      
      console.log('User profile ping - data:', data, 'error:', error);
      
      if (error) {
        setMessage(`Ping error: ${error.message}`);
      } else {
        setMessage(`Ping successful: Found profile for ${data?.email || 'unknown'} with ${data?.credits || 0} credits`);
      }
    } catch (error) {
      console.error('Ping error:', error);
      setMessage(`Ping failed: ${(error as Error).message}`);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setError('Please sign in to access admin panel');
      return;
    }

    if (profile) {
      if (isAdmin) {
        fetchProfiles();
      } else {
        setLoading(false);
        setError('Admin access required to view this panel');
      }
    }
  }, [user, profile, isAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="w-6 h-6 text-yellow-600 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-yellow-800">Admin Access Required</h3>
              <p className="text-yellow-700 mt-1">
                You need admin privileges to access this panel. Current role: {profile?.role || 'user'}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={pingSupabase}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Test User Profile Access
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600 mt-2">Manage users and their credit balances</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={pingSupabase}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Test User Access
          </button>
          <button
            onClick={fetchProfiles}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center mb-4">
          <Users className="w-6 h-6 text-blue-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
        </div>
        <p className="text-gray-600">
          Total Users: {profiles.length}
        </p>
        <p className="text-sm text-green-600 mt-2">
          ✅ Full admin access via secure backend endpoint
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        </div>
      )}

      {message && !error && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 text-green-700 border border-green-200">
          {message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">User</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Role</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Credits</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Joined</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {profiles.map((userProfile) => (
                <tr key={userProfile.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{userProfile.email}</p>
                      <p className="text-xs text-gray-500">{userProfile.id.slice(0, 8)}...</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      userProfile.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {userProfile.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{userProfile.credits?.toLocaleString() || 0}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{new Date(userProfile.created_at).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => updateCredits(userProfile.id, 10)}
                        disabled={updating === userProfile.id}
                        className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add 10
                      </button>
                      <button
                        onClick={() => updateCredits(userProfile.id, -10)}
                        disabled={updating === userProfile.id || (userProfile.credits || 0) < 10}
                        className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        <Minus className="w-3 h-3 mr-1" />
                        Remove 10
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {profiles.length === 0 && !loading && !error && (
        <div className="text-center py-8 text-gray-500">
          No profiles found. Try refreshing or check your admin permissions.
        </div>
      )}
    </div>
  );
}