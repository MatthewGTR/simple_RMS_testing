import React, { useState, useEffect } from 'react';
import { supabase, UserProfile } from '../lib/supabase';
import { Users, Plus, Minus, RefreshCw, TestTube } from 'lucide-react';

export function AdminPanel() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const testDatabaseConnection = async () => {
    try {
      console.log('=== TESTING DATABASE CONNECTION ===');
      setMessage('Testing database connection...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email')
        .limit(1);

      console.log('Test query result:', { data, error });

      if (error) {
        console.error('Database test error:', error);
        setMessage(`Database error: ${error.message}`);
      } else {
        console.log('Database test successful');
        setMessage(`Database connection successful! Found ${data?.length || 0} profiles.`);
      }
    } catch (error) {
      console.error('Test connection error:', error);
      setMessage(`Connection test failed: ${(error as Error).message}`);
    }
  };

  const fetchUsers = async () => {
    try {
      console.log('=== FETCHING USERS ===');
      setLoading(true);
      setMessage('Loading users...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, credits, created_at, updated_at')
        .order('created_at', { ascending: false });

      console.log('Users query result:', { data, error });

      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }

      setUsers(data || []);
      setMessage(`Loaded ${data?.length || 0} users successfully`);
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage(`Error loading users: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateCredits = async (userId: string, creditChange: number) => {
    setUpdating(userId);
    setMessage('');

    try {
      console.log(`Updating credits for user ${userId} by ${creditChange}`);
      
      // Get current user credits
      const { data: currentUser, error: fetchError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('Error fetching current credits:', fetchError);
        throw fetchError;
      }

      const newCredits = Math.max(0, currentUser.credits + creditChange);
      console.log(`Updating credits from ${currentUser.credits} to ${newCredits}`);

      // Update credits
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating credits:', updateError);
        throw updateError;
      }

      setMessage(`Credits updated successfully`);
      await fetchUsers();
    } catch (error) {
      console.error('Error updating credits:', error);
      setMessage(`Error updating credits: ${(error as Error).message}`);
    } finally {
      setUpdating(null);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
            onClick={testDatabaseConnection}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <TestTube className="w-4 h-4 mr-2" />
            Test DB
          </button>
          <button
            onClick={fetchUsers}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center mb-4">
          <Users className="w-6 h-6 text-blue-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
        </div>
        <p className="text-gray-600">Total Users: {users.length}</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('Error') || message.includes('error')
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
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
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.email}</p>
                      <p className="text-xs text-gray-500">{user.id.slice(0, 8)}...</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{user.credits.toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{new Date(user.created_at).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => updateCredits(user.id, 10)}
                        disabled={updating === user.id}
                        className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add 10
                      </button>
                      <button
                        onClick={() => updateCredits(user.id, -10)}
                        disabled={updating === user.id || user.credits < 10}
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
    </div>
  );
}