import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Users, Download, Key, Activity, BarChart3,
  Shield, RefreshCw, TrendingUp, AlertCircle, TrendingDown,
  Clock, DollarSign, Zap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { exportToCSV } from '../utils/csvExport';

interface AdminStats {
  totalUsers: number;
  totalCredits: number;
  transactionsToday: number;
  activeUsers: number;
}

interface CreditConsumption {
  user_id: string;
  user_email: string;
  total_consumed: number;
  last_consumed: string;
  current_credits: number;
}

interface CreditActivity {
  date: string;
  credits_added: number;
  credits_consumed: number;
  net_change: number;
}

interface AdminDashboardProps {
  onNavigate?: (view: 'dashboard' | 'admin-dashboard' | 'enhanced-admin') => void;
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalCredits: 0,
    transactionsToday: 0,
    activeUsers: 0
  });
  const [creditConsumption, setCreditConsumption] = useState<CreditConsumption[]>([]);
  const [creditActivity, setCreditActivity] = useState<CreditActivity[]>([]);
  const [totalCreditsConsumed, setTotalCreditsConsumed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'user-management'>('dashboard');

  const isSuperAdmin = profile?.role === 'super_admin';
  const isAdmin = profile?.role === 'admin' || isSuperAdmin;

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      fetchCreditConsumption();
      fetchCreditActivity();
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

  const fetchCreditConsumption = async () => {
    try {
      const { data: transactions } = await supabase
        .from('transaction_history')
        .select(`
          user_id,
          action_type,
          details,
          created_at,
          profiles!transaction_history_user_id_fkey(email, credits)
        `)
        .in('action_type', ['credit_used', 'credit_deduct'])
        .order('created_at', { ascending: false })
        .limit(100);

      if (transactions) {
        const userConsumption: Record<string, CreditConsumption> = {};

        transactions.forEach((tx: any) => {
          const userId = tx.user_id;
          const email = tx.profiles?.email || 'Unknown';
          const consumed = Math.abs(tx.details?.delta || tx.details?.amount || 1);

          if (!userConsumption[userId]) {
            userConsumption[userId] = {
              user_id: userId,
              user_email: email,
              total_consumed: 0,
              last_consumed: tx.created_at,
              current_credits: tx.profiles?.credits || 0
            };
          }

          userConsumption[userId].total_consumed += consumed;
          if (new Date(tx.created_at) > new Date(userConsumption[userId].last_consumed)) {
            userConsumption[userId].last_consumed = tx.created_at;
          }
        });

        const consumptionArray = Object.values(userConsumption)
          .sort((a, b) => b.total_consumed - a.total_consumed)
          .slice(0, 10);

        setCreditConsumption(consumptionArray);
        setTotalCreditsConsumed(consumptionArray.reduce((sum, c) => sum + c.total_consumed, 0));
      }
    } catch (err) {
      console.error('Error fetching credit consumption:', err);
    }
  };

  const fetchCreditActivity = async () => {
    try {
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);

      const { data: transactions } = await supabase
        .from('transaction_history')
        .select('action_type, details, created_at')
        .gte('created_at', last7Days.toISOString())
        .order('created_at', { ascending: true });

      if (transactions) {
        const dailyActivity: Record<string, CreditActivity> = {};

        transactions.forEach((tx: any) => {
          const date = new Date(tx.created_at).toLocaleDateString();
          if (!dailyActivity[date]) {
            dailyActivity[date] = {
              date,
              credits_added: 0,
              credits_consumed: 0,
              net_change: 0
            };
          }

          const delta = tx.details?.delta || tx.details?.amount || 0;

          if (tx.action_type === 'credit_add' || delta > 0) {
            dailyActivity[date].credits_added += Math.abs(delta);
          } else if (tx.action_type === 'credit_used' || tx.action_type === 'credit_deduct' || delta < 0) {
            dailyActivity[date].credits_consumed += Math.abs(delta);
          }

          dailyActivity[date].net_change = dailyActivity[date].credits_added - dailyActivity[date].credits_consumed;
        });

        setCreditActivity(Object.values(dailyActivity));
      }
    } catch (err) {
      console.error('Error fetching credit activity:', err);
    }
  };

  const handleExportUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, role, credits, user_type, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!profiles || profiles.length === 0) {
        setError('No users to export');
        return;
      }

      const csvData = profiles.map(p => ({
        'User ID': p.id,
        'Email': p.email,
        'Role': p.role,
        'Credits': p.credits,
        'User Type': p.user_type || 'consumer',
        'Created At': new Date(p.created_at).toLocaleString()
      }));

      exportToCSV(csvData, `users-export-${new Date().toISOString().split('T')[0]}.csv`);
      setSuccessMessage('Users exported successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(`Export failed: ${err.message}`);
    }
  };

  const handleExportTransactions = async () => {
    try {
      const { data: transactions, error } = await supabase
        .from('transaction_history')
        .select(`
          id,
          user_id,
          action_type,
          details,
          created_at,
          profiles!transaction_history_user_id_fkey(email)
        `)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      if (!transactions || transactions.length === 0) {
        setError('No transactions to export');
        return;
      }

      const csvData = transactions.map((t: any) => ({
        'Transaction ID': t.id,
        'User Email': t.profiles?.email || 'Unknown',
        'Action Type': t.action_type,
        'Amount': t.details?.delta || t.details?.amount || 0,
        'Reason': t.details?.reason || '',
        'Date': new Date(t.created_at).toLocaleString()
      }));

      exportToCSV(csvData, `transactions-export-${new Date().toISOString().split('T')[0]}.csv`);
      setSuccessMessage('Transactions exported successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(`Export failed: ${err.message}`);
    }
  };

  const handleExportCreditActivity = async () => {
    try {
      if (creditActivity.length === 0) {
        setError('No credit activity to export');
        return;
      }

      const csvData = creditActivity.map(a => ({
        'Date': a.date,
        'Credits Added': a.credits_added,
        'Credits Consumed': a.credits_consumed,
        'Net Change': a.net_change
      }));

      exportToCSV(csvData, `credit-activity-${new Date().toISOString().split('T')[0]}.csv`);
      setSuccessMessage('Credit activity exported successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(`Export failed: ${err.message}`);
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
            onClick={() => {
              fetchStats();
              fetchCreditConsumption();
              fetchCreditActivity();
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh All Data
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5 inline mr-2" />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <AlertCircle className="w-5 h-5 inline mr-2" />
          {successMessage}
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
            <button
              onClick={() => onNavigate?.('enhanced-admin')}
              className="w-full text-left px-4 py-3 bg-white rounded-lg hover:bg-blue-50 transition-colors border border-gray-200"
            >
              <span className="font-medium text-gray-900">User & Credit Management</span>
              <p className="text-sm text-gray-600">Manage users, roles, permissions, and credits</p>
            </button>
            <button
              onClick={() => {
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
              }}
              className="w-full text-left px-4 py-3 bg-white rounded-lg hover:bg-blue-50 transition-colors border border-gray-200"
            >
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
            <button
              onClick={handleExportUsers}
              className="w-full text-left px-4 py-3 bg-white rounded-lg hover:bg-green-50 transition-colors border border-gray-200"
            >
              <span className="font-medium text-gray-900">Export Users</span>
              <p className="text-sm text-gray-600">Download user list as CSV</p>
            </button>
            <button
              onClick={handleExportTransactions}
              className="w-full text-left px-4 py-3 bg-white rounded-lg hover:bg-green-50 transition-colors border border-gray-200"
            >
              <span className="font-medium text-gray-900">Export Transactions</span>
              <p className="text-sm text-gray-600">Download transaction history</p>
            </button>
            <button
              onClick={handleExportCreditActivity}
              className="w-full text-left px-4 py-3 bg-white rounded-lg hover:bg-green-50 transition-colors border border-gray-200"
            >
              <span className="font-medium text-gray-900">Export Credit Activity</span>
              <p className="text-sm text-gray-600">Download 7-day credit activity report</p>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Zap className="w-6 h-6 text-orange-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Top Credit Consumers</h3>
            </div>
            <span className="text-sm text-gray-500">Last 100 transactions</span>
          </div>

          {creditConsumption.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Zap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No credit consumption data yet</p>
              <p className="text-sm mt-1">Users will appear here once they start using credits</p>
            </div>
          ) : (
            <>
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Total Credits Consumed (Top 10)</span>
                  <span className="text-lg font-bold text-orange-600">{totalCreditsConsumed}</span>
                </div>
              </div>

              <div className="space-y-3">
                {creditConsumption.map((item, index) => (
                  <div key={item.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-600 rounded-full font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.user_email}</p>
                        <p className="text-xs text-gray-500">
                          Last used: {new Date(item.last_consumed).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{item.total_consumed} credits</p>
                      <p className="text-xs text-gray-500">{item.current_credits} remaining</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Activity className="w-6 h-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Credit Activity (7 Days)</h3>
            </div>
          </div>

          {creditActivity.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No activity data available</p>
              <p className="text-sm mt-1">Activity will be tracked here over the next 7 days</p>
            </div>
          ) : (
            <div className="space-y-4">
              {creditActivity.map((activity) => (
                <div key={activity.date} className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900">{activity.date}</p>
                    <span className={`text-sm font-semibold ${
                      activity.net_change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {activity.net_change >= 0 ? '+' : ''}{activity.net_change}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-600">
                    <div className="flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1 text-green-600" />
                      <span>Added: {activity.credits_added}</span>
                    </div>
                    <div className="flex items-center">
                      <TrendingDown className="w-3 h-3 mr-1 text-red-600" />
                      <span>Used: {activity.credits_consumed}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <strong>Property Advertising Platform:</strong> This system manages user accounts, listing credits,
        and transactions for your property advertising business. Monitor credit consumption patterns to identify
        your most active users and track daily credit flow.
      </div>
    </div>
  );
}
