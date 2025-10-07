import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Users, Download, Key, Search, Plus, Minus, Shield,
  RefreshCw, AlertCircle, CheckCircle, XCircle, Mail,
  FileText, BarChart2, Filter, History, ChevronDown, ChevronUp,
  TrendingUp, Activity, Zap, Clock, X, Eye, Calendar, Phone, MapPin, Briefcase, Award,
  ArrowUpDown, ArrowUp, ArrowDown
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
  const [historyModalUserId, setHistoryModalUserId] = useState<string | null>(null);
  const [userTransactions, setUserTransactions] = useState<Record<string, Transaction[]>>({});
  const [loadingUserHistory, setLoadingUserHistory] = useState<boolean>(false);

  const [userDetailsModalId, setUserDetailsModalId] = useState<string | null>(null);

  const [sortField, setSortField] = useState<keyof Profile | null>('role');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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

  const fetchUserTransactions = async (userId: string) => {
    if (!isAdmin) return;

    setLoadingUserHistory(true);
    try {
      const { data: txData, error } = await supabase
        .from('transaction_history')
        .select(`
          id,
          user_id,
          action_type,
          details,
          created_at,
          performed_by,
          performer:profiles!transaction_history_performed_by_fkey(email)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (txData || []).map((t: any) => ({
        id: t.id,
        user_id: t.user_id,
        action_type: t.action_type,
        details: t.details,
        created_at: t.created_at,
        performer_email: t.performer?.email || 'System'
      }));

      setUserTransactions(prev => ({ ...prev, [userId]: formatted }));
    } catch (err) {
      console.error('Error fetching user transactions:', err);
      setError('Failed to load user transaction history');
    } finally {
      setLoadingUserHistory(false);
    }
  };

  const openHistoryModal = async (userId: string) => {
    setHistoryModalUserId(userId);
    await fetchUserTransactions(userId);
  };

  const closeHistoryModal = () => {
    setHistoryModalUserId(null);
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
      if (historyModalUserId === userId) {
        await fetchUserTransactions(userId);
      }
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
      if (historyModalUserId === userId) {
        await fetchUserTransactions(userId);
      }
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
      if (isSuperAdmin) await fetchTransactions();
      if (historyModalUserId === userId) {
        await fetchUserTransactions(userId);
      }
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

  const handleSort = (field: keyof Profile) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredProfiles = profiles
    .filter(p => {
      const matchesSearch = !searchQuery ||
        p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = filterRole === 'all' || p.role === filterRole;

      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      if (!sortField) return 0;

      let aValue = a[sortField];
      let bValue = b[sortField];

      // Special handling for role field to rank super_admin > admin > user
      if (sortField === 'role') {
        const roleRank = (role: string) => {
          switch (role) {
            case 'super_admin': return 3;
            case 'admin': return 2;
            case 'user': return 1;
            default: return 0;
          }
        };

        const aRank = roleRank(String(aValue));
        const bRank = roleRank(String(bValue));

        if (sortDirection === 'asc') {
          return aRank - bRank;
        } else {
          return bRank - aRank;
        }
      }

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      // Convert to strings for comparison if needed
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (sortDirection === 'asc') {
        return aStr > bStr ? 1 : aStr < bStr ? -1 : 0;
      } else {
        return aStr < bStr ? 1 : aStr > bStr ? -1 : 0;
      }
    });

  const stats = {
    totalUsers: profiles.length,
    totalCredits: profiles.reduce((sum, p) => sum + (p.credits || 0), 0),
    avgCredits: profiles.length > 0 ? Math.round(profiles.reduce((sum, p) => sum + (p.credits || 0), 0) / profiles.length) : 0,
    activeUsers: profiles.filter(p => p.role === 'user').length
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border border-red-200">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Access Denied</h2>
          <p className="text-gray-600 text-center">Admin privileges required to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <Users className="w-8 h-8 text-white" />
                </div>
                User Management
              </h1>
              <p className="text-gray-600 text-lg">Manage users, credits, and permissions across your platform</p>
            </div>
            <button
              onClick={fetchProfiles}
              disabled={loading}
              className="inline-flex items-center px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50 transition-all shadow-sm font-medium"
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Credits</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalCredits}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Avg Credits</p>
                <p className="text-3xl font-bold text-gray-900">{stats.avgCredits}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-xl">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Active Users</p>
                <p className="text-3xl font-bold text-gray-900">{stats.activeUsers}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-xl">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl text-red-800 flex items-center shadow-sm">
            <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-xl text-green-800 flex items-center shadow-sm">
            <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />
            <span className="font-medium">{message}</span>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by email, name, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full transition-all"
                />
              </div>
              <div className="relative">
                <Filter className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="pl-12 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white cursor-pointer transition-all font-medium"
                >
                  <option value="all">All Roles</option>
                  <option value="user">Users</option>
                  <option value="admin">Admins</option>
                  <option value="super_admin">Super Admins</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportUsers}
                className="inline-flex items-center px-5 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-sm font-medium"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Users
              </button>
              {isSuperAdmin && (
                <button
                  onClick={handleExportTransactions}
                  className="inline-flex items-center px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm font-medium"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Export Logs
                </button>
              )}
              {isSuperAdmin && (
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className={`inline-flex items-center px-5 py-3 rounded-xl transition-all shadow-sm font-medium ${
                    showBulkActions
                      ? 'bg-orange-600 text-white hover:bg-orange-700'
                      : 'bg-gray-700 text-white hover:bg-gray-800'
                  }`}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  {showBulkActions ? 'Hide Bulk' : 'Bulk Actions'}
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <p className="text-gray-600">
              Showing <span className="font-semibold text-gray-900">{filteredProfiles.length}</span> of{' '}
              <span className="font-semibold text-gray-900">{profiles.length}</span> users
              {showBulkActions && selectedUsers.size > 0 && (
                <span className="ml-3 text-blue-600 font-semibold">
                  {selectedUsers.size} selected
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Bulk Actions Panel */}
        {showBulkActions && selectedUsers.size > 0 && (
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-200 rounded-2xl p-6 mb-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center text-lg">
              <Shield className="w-5 h-5 mr-2 text-orange-600" />
              Bulk Actions ({selectedUsers.size} users selected)
            </h3>
            <div className="flex gap-3">
              <button
                onClick={() => handleBulkCreditUpdate(10)}
                disabled={updating === 'bulk'}
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-all shadow-sm font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add 10 Credits
              </button>
              <button
                onClick={() => handleBulkCreditUpdate(-10)}
                disabled={updating === 'bulk'}
                className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all shadow-sm font-medium"
              >
                <Minus className="w-4 h-4 mr-2" />
                Remove 10 Credits
              </button>
              <button
                onClick={() => setSelectedUsers(new Set())}
                className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all shadow-sm font-medium"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-slate-50 border-b-2 border-gray-200">
                <tr>
                  {showBulkActions && (
                    <th className="px-6 py-5">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size === filteredProfiles.length && filteredProfiles.length > 0}
                        onChange={toggleSelectAll}
                        className="w-5 h-5 rounded-lg border-gray-300 cursor-pointer text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                  )}
                  <th
                    className="px-6 py-5 text-left text-sm font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center gap-2">
                      User
                      {sortField === 'email' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      ) : (
                        <ArrowUpDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-5 text-left text-sm font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('user_type')}
                  >
                    <div className="flex items-center gap-2">
                      Type
                      {sortField === 'user_type' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      ) : (
                        <ArrowUpDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-5 text-left text-sm font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('role')}
                  >
                    <div className="flex items-center gap-2">
                      Role
                      {sortField === 'role' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      ) : (
                        <ArrowUpDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-5 text-left text-sm font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('credits')}
                  >
                    <div className="flex items-center gap-2">
                      Credits
                      {sortField === 'credits' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      ) : (
                        <ArrowUpDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-5 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProfiles.map((userProfile, index) => (
                  <React.Fragment key={userProfile.id}>
                    <tr className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      {showBulkActions && (
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(userProfile.id)}
                            onChange={() => toggleUserSelection(userProfile.id)}
                            className="w-5 h-5 rounded-lg border-gray-300 cursor-pointer text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                            {(userProfile.email?.[0] || 'U').toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{userProfile.email}</p>
                            {userProfile.full_name && (
                              <p className="text-xs text-gray-500">{userProfile.full_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {userProfile.user_type ? (
                          <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-lg ${
                            userProfile.user_type === 'agent'
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}>
                            {userProfile.user_type === 'agent' ? 'Agent' : 'Consumer'}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Not set</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-lg ${
                          userProfile.role === 'super_admin'
                            ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border border-purple-200'
                            : userProfile.role === 'admin'
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {userProfile.role === 'super_admin' ? 'Super Admin' :
                           userProfile.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg font-bold text-sm border border-yellow-200">
                          <Zap className="w-3.5 h-3.5 mr-1.5" />
                          {userProfile.credits || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => updateCredits(userProfile.id, 10)}
                            disabled={updating === userProfile.id}
                            className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 text-xs font-semibold transition-all border border-green-200"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            +10
                          </button>
                          <button
                            onClick={() => updateCredits(userProfile.id, -10)}
                            disabled={updating === userProfile.id || (userProfile.credits || 0) < 10}
                            className="inline-flex items-center px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 text-xs font-semibold transition-all border border-red-200"
                          >
                            <Minus className="w-3.5 h-3.5 mr-1" />
                            -10
                          </button>
                          {isSuperAdmin && userProfile.role !== 'super_admin' && (
                            <button
                              onClick={() => promoteUser(userProfile.id, userProfile.role === 'admin' ? 'user' : 'admin')}
                              disabled={updating === userProfile.id}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 text-xs font-semibold transition-all border border-blue-200"
                            >
                              <Shield className="w-3.5 h-3.5 mr-1" />
                              {userProfile.role === 'admin' ? 'Demote' : 'Promote'}
                            </button>
                          )}
                          <button
                            onClick={() => setUserDetailsModalId(userProfile.id)}
                            className="inline-flex items-center px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-xs font-semibold transition-all border border-purple-200"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View
                          </button>
                          <button
                            onClick={() => openHistoryModal(userProfile.id)}
                            className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs font-semibold transition-all border border-gray-200"
                          >
                            <History className="w-3.5 h-3.5 mr-1" />
                            History
                          </button>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {filteredProfiles.length === 0 && !loading && (
            <div className="text-center py-16 px-4">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600 font-medium text-lg">
                {searchQuery || filterRole !== 'all'
                  ? 'No users match your filters'
                  : 'No users found'}
              </p>
              <p className="text-sm text-gray-500 mt-2">Try adjusting your search criteria or refresh the page</p>
            </div>
          )}
        </div>

        {/* Transaction History Modal */}
        {historyModalUserId && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={closeHistoryModal}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                    <History className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Transaction History</h2>
                    <p className="text-blue-100 text-sm">
                      {profiles.find(p => p.id === historyModalUserId)?.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeHistoryModal}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {loadingUserHistory ? (
                  <div className="text-center py-16">
                    <RefreshCw className="w-12 h-12 animate-spin mx-auto text-blue-500 mb-4" />
                    <p className="text-gray-600 font-medium">Loading transaction history...</p>
                  </div>
                ) : userTransactions[historyModalUserId] && userTransactions[historyModalUserId].length > 0 ? (
                  <div className="space-y-4">
                    {userTransactions[historyModalUserId].map((tx) => {
                      const getActionIcon = () => {
                        switch (tx.action_type) {
                          case 'credit_add': return <Plus className="w-6 h-6 text-green-600" />;
                          case 'credit_deduct': return <Minus className="w-6 h-6 text-red-600" />;
                          case 'role_change': return <Shield className="w-6 h-6 text-blue-600" />;
                          case 'password_reset': return <Key className="w-6 h-6 text-yellow-600" />;
                          case 'credit_used': return <Zap className="w-6 h-6 text-orange-600" />;
                          default: return <Activity className="w-6 h-6 text-gray-600" />;
                        }
                      };

                      const getActionColor = () => {
                        switch (tx.action_type) {
                          case 'credit_add': return 'bg-green-100 border-green-200';
                          case 'credit_deduct': return 'bg-red-100 border-red-200';
                          case 'role_change': return 'bg-blue-100 border-blue-200';
                          case 'password_reset': return 'bg-yellow-100 border-yellow-200';
                          case 'credit_used': return 'bg-orange-100 border-orange-200';
                          default: return 'bg-gray-100 border-gray-200';
                        }
                      };

                      const getActionLabel = () => {
                        switch (tx.action_type) {
                          case 'credit_add': return 'Credits Added';
                          case 'credit_deduct': return 'Credits Deducted';
                          case 'role_change': return 'Role Changed';
                          case 'password_reset': return 'Password Reset';
                          case 'credit_used': return 'Credits Used';
                          case 'credit_request_approved': return 'Credit Request Approved';
                          case 'credit_request_rejected': return 'Credit Request Rejected';
                          default: return tx.action_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        }
                      };

                      const getBadgeColor = () => {
                        switch (tx.action_type) {
                          case 'credit_add': return 'bg-green-100 text-green-700';
                          case 'credit_deduct': return 'bg-red-100 text-red-700';
                          case 'role_change': return 'bg-blue-100 text-blue-700';
                          case 'password_reset': return 'bg-yellow-100 text-yellow-700';
                          case 'credit_used': return 'bg-orange-100 text-orange-700';
                          default: return 'bg-gray-100 text-gray-700';
                        }
                      };

                      return (
                        <div
                          key={tx.id}
                          className={`border-2 rounded-xl p-5 hover:shadow-md transition-all ${getActionColor()}`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-white rounded-xl shadow-sm">
                              {getActionIcon()}
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <span className={`inline-flex px-3 py-1.5 text-sm font-bold rounded-lg ${getBadgeColor()}`}>
                                  {getActionLabel()}
                                </span>
                                <span className="text-sm text-gray-600 flex items-center">
                                  <Clock className="w-4 h-4 mr-1.5" />
                                  {new Date(tx.created_at).toLocaleString()}
                                </span>
                              </div>

                              {/* Role Change Details */}
                              {tx.action_type === 'role_change' && tx.details && (
                                <div className="bg-white rounded-lg p-3 mb-3">
                                  <p className="text-sm text-gray-700 font-semibold mb-1">Role Update:</p>
                                  <p className="text-base font-bold text-gray-900">
                                    <span className="text-blue-600">{tx.details.old_role}</span>
                                    {' → '}
                                    <span className="text-green-600">{tx.details.new_role}</span>
                                  </p>
                                </div>
                              )}

                              {/* Credit Add/Deduct Details */}
                              {(tx.action_type === 'credit_add' || tx.action_type === 'credit_deduct') && tx.details && (
                                <div className="bg-white rounded-lg p-3 mb-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className={`text-lg font-bold ${tx.details.delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {tx.details.delta > 0 ? '+' : ''}{tx.details.delta} credits
                                    </p>
                                  </div>
                                  {tx.details.old_credits !== undefined && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <span>Balance:</span>
                                      <span className="font-semibold">{tx.details.old_credits}</span>
                                      <span>→</span>
                                      <span className="font-semibold text-blue-600">{tx.details.new_credits}</span>
                                    </div>
                                  )}
                                  {tx.details.reason && (
                                    <p className="text-sm text-gray-600 mt-2 italic border-t border-gray-200 pt-2">
                                      <strong>Reason:</strong> {tx.details.reason}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Credit Used Details */}
                              {tx.action_type === 'credit_used' && tx.details && (
                                <div className="bg-white rounded-lg p-3 mb-3">
                                  <p className="text-lg font-bold text-orange-600">
                                    -{Math.abs(tx.details.delta || tx.details.amount || 0)} credits used
                                  </p>
                                </div>
                              )}

                              {/* Password Reset */}
                              {tx.action_type === 'password_reset' && (
                                <div className="bg-white rounded-lg p-3 mb-3">
                                  <p className="text-sm text-gray-700">
                                    User password was reset by an administrator
                                  </p>
                                </div>
                              )}

                              {/* Credit Request Approved/Rejected */}
                              {(tx.action_type === 'credit_request_approved' || tx.action_type === 'credit_request_rejected') && tx.details && (
                                <div className="bg-white rounded-lg p-3 mb-3">
                                  <p className="text-sm text-gray-700">
                                    Request #{tx.details.request_id}: {tx.details.delta} credits
                                  </p>
                                  {tx.details.notes && (
                                    <p className="text-xs text-gray-600 mt-1 italic">{tx.details.notes}</p>
                                  )}
                                </div>
                              )}

                              {/* Performer Info */}
                              <div className="flex items-center gap-2 text-sm text-gray-600 bg-white rounded-lg px-3 py-2">
                                <span className="font-medium">Performed by:</span>
                                <span className="font-bold text-gray-900">{tx.performer_email}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-12 h-12 text-gray-300" />
                    </div>
                    <p className="text-gray-600 font-semibold text-lg mb-2">No Transaction History</p>
                    <p className="text-gray-500">
                      Transactions will appear here once actions are performed on this account
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* User Details Modal */}
        {userDetailsModalId && (() => {
          const userProfile = profiles.find(p => p.id === userDetailsModalId);
          if (!userProfile) return null;

          return (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setUserDetailsModalId(null)}
            >
              <div
                className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                      <Eye className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">User Details</h2>
                      <p className="text-purple-100 text-sm">{userProfile.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setUserDetailsModalId(null)}
                    className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <Users className="w-5 h-5 mr-2 text-blue-600" />
                        Basic Information
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Full Name</label>
                          <p className="text-base font-medium text-gray-900 mt-1">{userProfile.full_name || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</label>
                          <p className="text-base font-medium text-gray-900 mt-1">{userProfile.email}</p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">User Type</label>
                          <p className="text-base font-medium text-gray-900 mt-1 capitalize">
                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-lg ${
                              userProfile.user_type === 'agent'
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : 'bg-blue-100 text-blue-700 border border-blue-200'
                            }`}>
                              {userProfile.user_type || 'Consumer'}
                            </span>
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Role</label>
                          <p className="text-base font-medium text-gray-900 mt-1">
                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-lg ${
                              userProfile.role === 'super_admin'
                                ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border border-purple-200'
                                : userProfile.role === 'admin'
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}>
                              {userProfile.role === 'super_admin' ? 'Super Admin' :
                               userProfile.role === 'admin' ? 'Admin' : 'User'}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Account Information */}
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <Zap className="w-5 h-5 mr-2 text-green-600" />
                        Account Information
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Credits</label>
                          <p className="text-2xl font-bold text-green-700 mt-1 flex items-center">
                            <Zap className="w-5 h-5 mr-1" />
                            {userProfile.credits || 0}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            Joined Date
                          </label>
                          <p className="text-base font-medium text-gray-900 mt-1">
                            {new Date(userProfile.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Last Updated</label>
                          <p className="text-base font-medium text-gray-900 mt-1">
                            {new Date(userProfile.updated_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border border-orange-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <Phone className="w-5 h-5 mr-2 text-orange-600" />
                        Contact Information
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center">
                            <Phone className="w-4 h-4 mr-1" />
                            Phone
                          </label>
                          <p className="text-base font-medium text-gray-900 mt-1">{userProfile.phone || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            Country
                          </label>
                          <p className="text-base font-medium text-gray-900 mt-1">{userProfile.country || 'Not provided'}</p>
                        </div>
                        {userProfile.user_type === 'consumer' && (
                          <div>
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Preferred Contact</label>
                            <p className="text-base font-medium text-gray-900 mt-1 capitalize">
                              {userProfile.preferred_contact_method || 'Email'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Agent-specific Information */}
                    {userProfile.user_type === 'agent' && (
                      <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-5 border border-teal-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                          <Briefcase className="w-5 h-5 mr-2 text-teal-600" />
                          Agent Information
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center">
                              <Award className="w-4 h-4 mr-1" />
                              REN Number
                            </label>
                            <p className="text-base font-medium text-gray-900 mt-1">{userProfile.ren_number || 'Not provided'}</p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Agency Name</label>
                            <p className="text-base font-medium text-gray-900 mt-1">{userProfile.agency_name || 'Not provided'}</p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Agency License</label>
                            <p className="text-base font-medium text-gray-900 mt-1">{userProfile.agency_license || 'Not provided'}</p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Experience</label>
                            <p className="text-base font-medium text-gray-900 mt-1">
                              {userProfile.years_experience ? `${userProfile.years_experience} years` : 'Not provided'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Consumer-specific Information */}
                    {userProfile.user_type === 'consumer' && (
                      <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-5 border border-pink-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                          <Users className="w-5 h-5 mr-2 text-pink-600" />
                          Consumer Information
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              Date of Birth
                            </label>
                            <p className="text-base font-medium text-gray-900 mt-1">
                              {userProfile.date_of_birth
                                ? new Date(userProfile.date_of_birth).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })
                                : 'Not provided'}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center">
                              <Briefcase className="w-4 h-4 mr-1" />
                              Occupation
                            </label>
                            <p className="text-base font-medium text-gray-900 mt-1">{userProfile.occupation || 'Not provided'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
