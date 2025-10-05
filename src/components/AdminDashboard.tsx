import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Users, Download, Key, Activity, BarChart3,
  Shield, RefreshCw, TrendingUp, AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AdminStats {
  totalUsers: number;
  totalCredits: number;
  transactionsToday: number;
  activeUsers: number;
}

export function AdminDashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalCredits: 0,
    transactionsToday: 0,
    activeUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = profile?.role === 'super_admin';
  const isAdmin = profile?.role === 'admin' || isSuperAdmin;

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('credits');

      const { data: transactions } = await supabase
        .from('transaction_history')
        .select('created_at')
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

      const totalUsers = profiles?.length || 0;
      const totalCredits = profiles?.reduce((sum, p) => sum + (p.credits || 0), 0) || 0;
      const transactionsToday = transactions?.length || 0;

      setStats({
        totalUsers,
        totalCredits,
        transactionsToday,
        activeUsers: totalUsers
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Property Advertising Management System</p>
          </div>
          <button
            onClick={fetchStats}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5 inline mr-2" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-green-600">
            <TrendingUp className="w-4 h-4 mr-1" />
            Active clients
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Credits</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalCredits}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            Listing credits available
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Today's Activity</p>
              <p className="text-3xl font-bold text-gray-900">{stats.transactionsToday}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Activity className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            Transactions today
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Admin Level</p>
              <p className="text-2xl font-bold text-gray-900">
                {isSuperAdmin ? 'Super Admin' : 'Admin'}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            {isSuperAdmin ? 'Full access' : 'Limited access'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-6">
          <div className="flex items-center mb-4">
            <Key className="w-6 h-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-white rounded-lg hover:bg-blue-50 transition-colors border border-gray-200">
              <span className="font-medium text-gray-900">User Management</span>
              <p className="text-sm text-gray-600">Manage users, roles, and permissions</p>
            </button>
            <button className="w-full text-left px-4 py-3 bg-white rounded-lg hover:bg-blue-50 transition-colors border border-gray-200">
              <span className="font-medium text-gray-900">Credit Management</span>
              <p className="text-sm text-gray-600">Allocate and track listing credits</p>
            </button>
            <button className="w-full text-left px-4 py-3 bg-white rounded-lg hover:bg-blue-50 transition-colors border border-gray-200">
              <span className="font-medium text-gray-900">Reports & Analytics</span>
              <p className="text-sm text-gray-600">View usage reports and export data</p>
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm border border-green-200 p-6">
          <div className="flex items-center mb-4">
            <Download className="w-6 h-6 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Export Options</h3>
          </div>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-white rounded-lg hover:bg-green-50 transition-colors border border-gray-200">
              <span className="font-medium text-gray-900">Export Users</span>
              <p className="text-sm text-gray-600">Download user list as CSV</p>
            </button>
            <button className="w-full text-left px-4 py-3 bg-white rounded-lg hover:bg-green-50 transition-colors border border-gray-200">
              <span className="font-medium text-gray-900">Export Transactions</span>
              <p className="text-sm text-gray-600">Download transaction history</p>
            </button>
            <button className="w-full text-left px-4 py-3 bg-white rounded-lg hover:bg-green-50 transition-colors border border-gray-200">
              <span className="font-medium text-gray-900">Export Property Listings</span>
              <p className="text-sm text-gray-600">Download all property data</p>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <strong>Property Advertising Platform:</strong> This system manages user accounts, listing credits,
        and transactions for your property advertising business. Use the admin panel to control user access,
        allocate credits for property listings, and monitor system activity.
      </div>
    </div>
  );
}
