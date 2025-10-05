import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Users, Download, Key, Search, Plus, Minus, Shield,
  RefreshCw, AlertCircle, CheckCircle, XCircle, Mail,
  FileText, BarChart2, Filter
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { exportUsersToCSV, exportTransactionsToCSV } from '../utils/csvExport';

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  credits: number;
  created_at: string;
  updated_at: string;
  user_type?: string | null;
  country?: string | null;
  phone?: string | null;
  ren_number?: string | null;
  agency_name?: string | null;
  agency_license?: string | null;
  years_experience?: number | null;
  date_of_birth?: string | null;
  occupation?: string | null;
  preferred_contact_method?: string | null;
}

interface Transaction {
  id: string;
  user_id: string;
  action_type: string;
  details: any;
  created_at: string;
  user_email?: string;
  performer_email?: string;
}

export function EnhancedAdminPanel() {
  const { user, profile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isSuperAdmin = profile?.role === 'super_admin';

  useEffect(() => {
    if (isAdmin) {
      fetchProfiles();
      if (isSuperAdmin) {
        fetchTransactions();
      }
    }
  }, [isAdmin, isSuperAdmin]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-profiles`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setProfiles(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!isSuperAdmin) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-profiles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'get-transactions' }),
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };

  const updateCredits = async (userId: string, delta: number) => {
    setUpdating(userId);
    setError(null);
    setMessage('');

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
          action: isSuperAdmin ? 'apply-credits' : 'request-credits',
          p_user_id: userId,
          p_delta: delta,
          p_reason: `Admin adjustment: ${delta > 0 ? 'added' : 'removed'} ${Math.abs(delta)} credits`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const targetUser = profiles.find(p => p.id === userId);
      setMessage(`Credits updated successfully for ${targetUser?.email}. Email notification sent.`);

      setCustomAmounts(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });

      await fetchProfiles();
      if (isSuperAdmin) await fetchTransactions();
    } catch (err: any) {
      setError(`Failed to update credits: ${err.message}`);
    } finally {
      setUpdating(null);
    }
  };

  const resetUserPassword = async (userId: string) => {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setUpdating(userId);
    setError(null);
    setMessage('');

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
          action: 'reset-password',
          p_user_id: userId,
          p_new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const targetUser = profiles.find(p => p.id === userId);
      setMessage(`Password reset successfully for ${targetUser?.email}. Email notification sent.`);
      setResetPasswordUserId(null);
      setNewPassword('');
    } catch (err: any) {
      setError(`Failed to reset password: ${err.message}`);
    } finally {
      setUpdating(null);
    }
  };

  const promoteUser = async (userId: string, newRole: 'admin' | 'user') => {
    if (!isSuperAdmin) {
      setError('Super admin access required');
      return;
    }

    setUpdating(userId);
    setError(null);
    setMessage('');

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

      const targetUser = profiles.find(p => p.id === userId);
      setMessage(`User ${newRole === 'admin' ? 'promoted to admin' : 'demoted to user'} successfully. Email sent to ${targetUser?.email}.`);
      await fetchProfiles();
    } catch (err: any) {
      setError(`Failed to update role: ${err.message}`);
    } finally {
      setUpdating(null);
    }
  };

  const handleExportUsers = () => {
    try {
      exportUsersToCSV(filteredProfiles);
      setMessage('Users exported successfully to CSV');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to export users');
    }
  };

  const handleExportTransactions = () => {
    try {
      if (transactions.length === 0) {
        setError('No transactions to export');
        return;
      }
      exportTransactionsToCSV(transactions);
      setMessage('Transactions exported successfully to CSV');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to export transactions');
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUsers(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredProfiles.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredProfiles.map(p => p.id)));
    }
  };

  const handleBulkCreditUpdate = async (delta: number) => {
    if (selectedUsers.size === 0) {
      setError('No users selected');
      return;
    }

    setUpdating('bulk');
    setError(null);
    setMessage(`Updating credits for ${selectedUsers.size} users...`);

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
          action: 'bulk-credits',
          user_ids: Array.from(selectedUsers),
          p_delta: delta,
          p_reason: `Bulk credit ${delta > 0 ? 'addition' : 'deduction'}`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      const { summary } = result;

      setMessage(`Bulk update complete: ${summary.succeeded} succeeded, ${summary.failed} failed. Email notifications sent.`);

      if (summary.failed > 0) {
        const failedUsers = result.results.failed.map((f: any) => f.user_id.slice(0, 8)).join(', ');
        setError(`Some updates failed for users: ${failedUsers}`);
      }

      setSelectedUsers(new Set());
      setShowBulkActions(false);
      await fetchProfiles();
    } catch (err: any) {
      setError(`Bulk update failed: ${err.message}`);
    } finally {
      setUpdating(null);
    }
  };

  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = !searchQuery ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = filterRole === 'all' || p.role === filterRole;

    return matchesSearch && matchesRole;
  });

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <AlertCircle className="w-5 h-5 inline mr-2" />
          Admin access required
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Enhanced Admin Panel</h1>
        <p className="text-gray-600">Comprehensive user and credit management for property advertising</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      {message && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center">
          <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          {message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
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
            <div className="relative">
              <Filter className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Roles</option>
                <option value="user">Users</option>
                <option value="admin">Admins</option>
                <option value="super_admin">Super Admins</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportUsers}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Users
            </button>
            {isSuperAdmin && (
              <button
                onClick={handleExportTransactions}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <FileText className="w-4 h-4 mr-2" />
                Export Transactions
              </button>
            )}
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              <Shield className="w-4 h-4 mr-2" />
              {showBulkActions ? 'Hide' : 'Bulk Actions'}
            </button>
            <button
              onClick={fetchProfiles}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors text-sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Showing <span className="font-semibold">{filteredProfiles.length}</span> of{' '}
            <span className="font-semibold">{profiles.length}</span> users
            {showBulkActions && selectedUsers.size > 0 && (
              <span className="ml-2">
                | Selected: <span className="font-semibold text-blue-600">{selectedUsers.size}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {showBulkActions && selectedUsers.size > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Bulk Actions ({selectedUsers.size} users selected)</h3>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkCreditUpdate(10)}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add 10 Credits to All
            </button>
            <button
              onClick={() => handleBulkCreditUpdate(-10)}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Minus className="w-4 h-4 mr-2" />
              Remove 10 Credits from All
            </button>
            <button
              onClick={() => setSelectedUsers(new Set())}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Clear Selection
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {showBulkActions && (
                  <th className="px-4 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === filteredProfiles.length && filteredProfiles.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                    />
                  </th>
                )}
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">User</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Type</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Role</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Credits</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Joined</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProfiles.map((userProfile) => (
                <tr key={userProfile.id} className="hover:bg-gray-50 transition-colors">
                  {showBulkActions && (
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(userProfile.id)}
                        onChange={() => toggleUserSelection(userProfile.id)}
                        className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{userProfile.email}</p>
                      <p className="text-xs text-gray-500">{userProfile.id.slice(0, 8)}...</p>
                      {userProfile.full_name && (
                        <p className="text-xs text-gray-500 mt-1">{userProfile.full_name}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {userProfile.user_type ? (
                      <div>
                        <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                          userProfile.user_type === 'agent' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {userProfile.user_type === 'agent' ? 'Agent' : 'Consumer'}
                        </span>
                        {userProfile.user_type === 'agent' && userProfile.ren_number && (
                          <p className="text-xs text-gray-500 mt-1">REN: {userProfile.ren_number}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Not set</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                      userProfile.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                      userProfile.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {userProfile.role === 'super_admin' ? 'Super Admin' :
                       userProfile.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-gray-900">{userProfile.credits || 0}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {new Date(userProfile.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col space-y-2">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => updateCredits(userProfile.id, 10)}
                          disabled={updating === userProfile.id}
                          className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          +10
                        </button>
                        <button
                          onClick={() => updateCredits(userProfile.id, -10)}
                          disabled={updating === userProfile.id || (userProfile.credits || 0) < 10}
                          className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 text-xs"
                        >
                          <Minus className="w-3 h-3 mr-1" />
                          -10
                        </button>
                        <button
                          onClick={() => setResetPasswordUserId(resetPasswordUserId === userProfile.id ? null : userProfile.id)}
                          className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 text-xs"
                          title="Reset Password"
                        >
                          <Key className="w-3 h-3" />
                        </button>
                        {isSuperAdmin && userProfile.role !== 'super_admin' && (
                          <button
                            onClick={() => promoteUser(userProfile.id, userProfile.role === 'admin' ? 'user' : 'admin')}
                            disabled={updating === userProfile.id}
                            className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 text-xs"
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            {userProfile.role === 'admin' ? 'Demote' : 'Promote'}
                          </button>
                        )}
                      </div>

                      {resetPasswordUserId === userProfile.id && (
                        <div className="flex gap-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                          <input
                            type="password"
                            placeholder="New password (min 6 chars)"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={updating === userProfile.id}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                          />
                          <button
                            onClick={() => resetUserPassword(userProfile.id)}
                            disabled={updating === userProfile.id || !newPassword || newPassword.length < 6}
                            className="inline-flex items-center px-3 py-1 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 text-sm"
                          >
                            Reset
                          </button>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Custom amount"
                          value={customAmounts[userProfile.id] || ''}
                          onChange={(e) => setCustomAmounts(prev => ({ ...prev, [userProfile.id]: e.target.value }))}
                          disabled={updating === userProfile.id}
                          className="w-32 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => {
                            const amount = parseInt(customAmounts[userProfile.id] || '0');
                            if (amount !== 0 && !isNaN(amount)) {
                              updateCredits(userProfile.id, amount);
                            }
                          }}
                          disabled={updating === userProfile.id || !customAmounts[userProfile.id]}
                          className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
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

      {filteredProfiles.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          {searchQuery || filterRole !== 'all'
            ? 'No users match your filters'
            : 'No users found. Try refreshing.'}
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <strong>📧 Email Notifications:</strong> All admin actions trigger email notifications.
        Configure RESEND_API_KEY in Supabase to send actual emails.
      </div>
    </div>
  );
}