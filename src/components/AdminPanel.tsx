import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Plus, Minus, RefreshCw, AlertCircle, UserPlus, UserMinus, CheckCircle, XCircle, Search, ArrowUpDown, History } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { TransactionHistory } from './TransactionHistory';

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  credits: number;
  created_at: string;
  updated_at: string;
};

type PendingCredit = {
  id: number;
  user_email: string;
  delta: number;
  reason: string;
  status: string;
  requested_by_email: string;
  requested_at: string;
  reviewed_by_email: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
};

export function AdminPanel() {
  const { user, profile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pendingCredits, setPendingCredits] = useState<PendingCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [showPendingApprovals, setShowPendingApprovals] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof Profile>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<{ id: string; email: string } | null>(null);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isSuperAdmin = profile?.role === 'super_admin';

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
      setProfiles(Array.isArray(data) ? data : []);
      setMessage(`Loaded ${Array.isArray(data) ? data.length : 0} profiles successfully`);
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const endpoint = isSuperAdmin ? 'apply-credits' : 'request-credits';
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-profiles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: endpoint,
          p_user_id: userId,
          p_delta: creditChange,
          p_reason: `${isSuperAdmin ? 'Super admin' : 'Admin'} adjustment: ${creditChange > 0 ? 'added' : 'removed'} ${Math.abs(creditChange)} credits`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (isSuperAdmin) {
        setMessage(`Credits updated successfully`);
      } else {
        setMessage(`Credit change request submitted for approval`);
      }

      setCustomAmounts(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });

      await fetchProfiles();
      if (!isSuperAdmin) {
        await fetchPendingCredits();
      }
    } catch (error) {
      console.error('Error updating credits:', error);
      setError(`Failed to update credits: ${(error as Error).message}`);
    } finally {
      setUpdating(null);
    }
  };

  const fetchPendingCredits = async () => {
    if (!user || !isSuperAdmin) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-profiles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'list-pending' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setPendingCredits(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching pending credits:', error);
    }
  };

  const promoteUser = async (userId: string, newRole: 'admin' | 'user') => {
    if (!isSuperAdmin) {
      setError('Super admin access required');
      return;
    }

    setUpdating(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-profiles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'promote',
          p_user_id: userId,
          p_new_role: newRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      setMessage(`User ${newRole === 'admin' ? 'promoted to admin' : 'demoted to user'} successfully`);
      await fetchProfiles();
    } catch (error) {
      console.error('Error promoting user:', error);
      setError(`Failed to update role: ${(error as Error).message}`);
    } finally {
      setUpdating(null);
    }
  };

  const handleSort = (field: keyof Profile) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedProfiles = useMemo(() => {
    let filtered = profiles;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = profiles.filter(p =>
        p.email?.toLowerCase().includes(query) ||
        p.full_name?.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query) ||
        p.role.toLowerCase().includes(query)
      );
    }

    const roleOrder = { 'super_admin': 0, 'admin': 1, 'user': 2 };

    const sorted = [...filtered].sort((a, b) => {
      if (sortField === 'role') {
        const aOrder = roleOrder[a.role as keyof typeof roleOrder] ?? 999;
        const bOrder = roleOrder[b.role as keyof typeof roleOrder] ?? 999;
        return sortDirection === 'asc' ? aOrder - bOrder : bOrder - aOrder;
      }

      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return sorted;
  }, [profiles, searchQuery, sortField, sortDirection]);

  const handleApproval = async (requestId: number, approve: boolean, notes?: string) => {
    if (!isSuperAdmin) {
      setError('Super admin access required');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-profiles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: approve ? 'approve' : 'reject',
          p_request_id: requestId,
          p_review_notes: notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      setMessage(`Credit request ${approve ? 'approved' : 'rejected'} successfully`);
      await fetchPendingCredits();
      await fetchProfiles();
    } catch (error) {
      console.error('Error handling approval:', error);
      setError(`Failed to ${approve ? 'approve' : 'reject'} request: ${(error as Error).message}`);
    }
  };

  const pingSupabase = async () => {
    if (!user) {
      setMessage('No user session - please sign in first');
      return;
    }

    try {
      setMessage('Testing user profile access...');
      console.log('=== PINGING SUPABASE (User Profile) ===');
      console.log('Current user ID:', user.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,full_name,role,credits,created_at,updated_at')
        .eq('id', user?.id)
        .single();
      
      console.log('User profile ping - data:', data, 'error:', error);
      
      if (error) {
        setMessage(`❌ Ping error: ${error.message}`);
        setError(`Profile access failed: ${error.message}`);
      } else {
        if (data) {
          setMessage(`✅ Ping successful: Found profile for ${data.email || 'unknown'} with ${data.credits || 0} credits`);
          setError(null);
        } else {
          setMessage(`⚠️ Ping successful but no profile found for user ${user.email}`);
          setError('Profile not found - may need to be created');
        }
      }
      console.log('Profile refreshed:', data);
      console.log('User role from database:', data?.role);
      
      // Force a page reload to refresh auth context if role changed
      if (data?.role !== profile?.role) {
        console.log('Role changed, reloading page...');
        window.location.reload();
      }
    } catch (error) {
      console.error('Ping error:', error);
      setMessage(`❌ Ping failed: ${(error as Error).message}`);
      setError(`Unexpected error: ${(error as Error).message}`);
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
        if (isSuperAdmin) {
          fetchPendingCredits();
        }
      } else {
        setLoading(false);
        setError('Admin access required to view this panel');
      }
    }
  }, [user, profile, isAdmin, isSuperAdmin]);

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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Users className="w-6 h-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
          </div>
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
          </div>
        </div>
        <p className="text-gray-600">
          Total Users: {profiles.length} {searchQuery && `(${filteredAndSortedProfiles.length} shown)`}
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

      {isSuperAdmin && pendingCredits.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-orange-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">
                Pending Credit Approvals ({pendingCredits.filter(p => p.status === 'pending').length})
              </h3>
            </div>
            <button
              onClick={() => setShowPendingApprovals(!showPendingApprovals)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showPendingApprovals ? 'Hide' : 'Show'}
            </button>
          </div>

          {showPendingApprovals && (
            <div className="space-y-3">
              {pendingCredits.filter(p => p.status === 'pending').map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900">{request.user_email}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                        request.delta > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {request.delta > 0 ? '+' : ''}{request.delta} credits
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{request.reason}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Requested by {request.requested_by_email} on {new Date(request.requested_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleApproval(request.id, true)}
                      className="inline-flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                      title="Approve"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleApproval(request.id, false)}
                      className="inline-flex items-center px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      title="Reject"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => handleSort('email')}
                  className="px-6 py-4 text-left text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>User</span>
                    <ArrowUpDown className="w-4 h-4" />
                    {sortField === 'email' && (
                      <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('role')}
                  className="px-6 py-4 text-left text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Role</span>
                    <ArrowUpDown className="w-4 h-4" />
                    {sortField === 'role' && (
                      <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('credits')}
                  className="px-6 py-4 text-left text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Credits</span>
                    <ArrowUpDown className="w-4 h-4" />
                    {sortField === 'credits' && (
                      <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('created_at')}
                  className="px-6 py-4 text-left text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Joined</span>
                    <ArrowUpDown className="w-4 h-4" />
                    {sortField === 'created_at' && (
                      <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAndSortedProfiles.map((userProfile) => (
                <tr key={userProfile.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{userProfile.email}</p>
                      <p className="text-xs text-gray-500">{userProfile.id.slice(0, 8)}...</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        userProfile.role === 'super_admin'
                          ? 'bg-yellow-100 text-yellow-800'
                          : userProfile.role === 'admin'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {userProfile.role === 'super_admin' ? 'Super Admin' : userProfile.role}
                      </span>
                      {isSuperAdmin && userProfile.id !== user?.id && userProfile.role !== 'super_admin' && (
                        <div className="flex space-x-1">
                          {userProfile.role === 'user' ? (
                            <button
                              onClick={() => promoteUser(userProfile.id, 'admin')}
                              disabled={updating === userProfile.id}
                              className="p-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 transition-colors"
                              title="Promote to Admin"
                            >
                              <UserPlus className="w-3 h-3" />
                            </button>
                          ) : (
                            <button
                              onClick={() => promoteUser(userProfile.id, 'user')}
                              disabled={updating === userProfile.id}
                              className="p-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
                              title="Demote to User"
                            >
                              <UserMinus className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{userProfile.credits?.toLocaleString() || 0}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{new Date(userProfile.created_at).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col space-y-2">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => updateCredits(userProfile.id, 10)}
                          disabled={updating === userProfile.id}
                          className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          +10
                        </button>
                        <button
                          onClick={() => updateCredits(userProfile.id, -10)}
                          disabled={updating === userProfile.id || (userProfile.credits || 0) < 10}
                          className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                        >
                          <Minus className="w-3 h-3 mr-1" />
                          -10
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => setSelectedUserForHistory({ id: userProfile.id, email: userProfile.email || 'Unknown' })}
                            className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                            title="View Transaction History"
                          >
                            <History className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <input
                          type="number"
                          placeholder="Amount"
                          value={customAmounts[userProfile.id] || ''}
                          onChange={(e) => setCustomAmounts(prev => ({ ...prev, [userProfile.id]: e.target.value }))}
                          disabled={updating === userProfile.id}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                        />
                        <button
                          onClick={() => {
                            const amount = parseInt(customAmounts[userProfile.id] || '0');
                            if (amount !== 0 && !isNaN(amount)) {
                              updateCredits(userProfile.id, amount);
                            }
                          }}
                          disabled={updating === userProfile.id || !customAmounts[userProfile.id] || parseInt(customAmounts[userProfile.id]) === 0}
                          className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredAndSortedProfiles.length === 0 && !loading && !error && (
        <div className="text-center py-8 text-gray-500">
          {searchQuery
            ? `No users found matching "${searchQuery}"`
            : 'No profiles found. Try refreshing or check your admin permissions.'}
        </div>
      )}

      {selectedUserForHistory && (
        <TransactionHistory
          userId={selectedUserForHistory.id}
          userEmail={selectedUserForHistory.email}
          onClose={() => setSelectedUserForHistory(null)}
        />
      )}
    </div>
  );
}