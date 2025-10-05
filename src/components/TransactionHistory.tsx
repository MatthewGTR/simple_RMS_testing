import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Clock, TrendingUp, TrendingDown, UserCog, CheckCircle, XCircle } from 'lucide-react';

type Transaction = {
  id: string;
  user_id: string;
  action_type: string;
  details: Record<string, any>;
  performed_by: string | null;
  created_at: string;
  performer_email?: string;
};

type TransactionHistoryProps = {
  userId: string;
  userEmail: string;
  onClose: () => void;
};

export function TransactionHistory({ userId, userEmail, onClose }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, [userId]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch transactions
      const { data: transactionData, error: fetchError } = await supabase
        .from('transaction_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (!transactionData || transactionData.length === 0) {
        setTransactions([]);
        return;
      }

      // Get unique performer IDs
      const performerIds = [...new Set(transactionData.map(t => t.performed_by).filter(Boolean))];

      // Fetch performer profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', performerIds);

      // Create a map of performer ID to email
      const performerMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

      // Combine the data
      const formattedData = transactionData.map(t => ({
        ...t,
        performer_email: t.performed_by ? (performerMap.get(t.performed_by) || 'Unknown') : 'System'
      }));

      setTransactions(formattedData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'credit_add':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'credit_deduct':
        return <TrendingDown className="w-5 h-5 text-red-600" />;
      case 'role_change':
        return <UserCog className="w-5 h-5 text-blue-600" />;
      case 'credit_request_approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'credit_request_rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'credit_add':
        return 'Credits Added';
      case 'credit_deduct':
        return 'Credits Deducted';
      case 'role_change':
        return 'Role Changed';
      case 'credit_request_approved':
        return 'Credit Request Approved';
      case 'credit_request_rejected':
        return 'Credit Request Rejected';
      default:
        return actionType;
    }
  };

  const formatDetails = (actionType: string, details: Record<string, any>) => {
    switch (actionType) {
      case 'credit_add':
      case 'credit_deduct':
        return (
          <div className="text-sm text-gray-600">
            <p><span className="font-medium">Change:</span> {details.delta > 0 ? '+' : ''}{details.delta} credits</p>
            <p><span className="font-medium">Before:</span> {details.old_credits} credits</p>
            <p><span className="font-medium">After:</span> {details.new_credits} credits</p>
            {details.reason && <p><span className="font-medium">Reason:</span> {details.reason}</p>}
          </div>
        );
      case 'role_change':
        return (
          <div className="text-sm text-gray-600">
            <p><span className="font-medium">From:</span> {details.old_role}</p>
            <p><span className="font-medium">To:</span> {details.new_role}</p>
          </div>
        );
      case 'credit_request_approved':
        return (
          <div className="text-sm text-gray-600">
            <p><span className="font-medium">Change:</span> {details.delta > 0 ? '+' : ''}{details.delta} credits</p>
            <p><span className="font-medium">Before:</span> {details.old_credits} credits</p>
            <p><span className="font-medium">After:</span> {details.new_credits} credits</p>
            {details.reason && <p><span className="font-medium">Request Reason:</span> {details.reason}</p>}
            {details.notes && <p><span className="font-medium">Review Notes:</span> {details.notes}</p>}
          </div>
        );
      case 'credit_request_rejected':
        return (
          <div className="text-sm text-gray-600">
            <p><span className="font-medium">Requested:</span> {details.delta > 0 ? '+' : ''}{details.delta} credits</p>
            {details.reason && <p><span className="font-medium">Request Reason:</span> {details.reason}</p>}
            {details.notes && <p><span className="font-medium">Review Notes:</span> {details.notes}</p>}
          </div>
        );
      default:
        return <pre className="text-xs text-gray-600">{JSON.stringify(details, null, 2)}</pre>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Transaction History</h2>
            <p className="text-sm text-gray-600 mt-1">{userEmail}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading transactions...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          {!loading && !error && transactions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No transactions found for this user.
            </div>
          )}

          {!loading && !error && transactions.length > 0 && (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5">
                      {getActionIcon(transaction.action_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {getActionLabel(transaction.action_type)}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {new Date(transaction.created_at).toLocaleString()}
                        </span>
                      </div>
                      {formatDetails(transaction.action_type, transaction.details)}
                      <p className="text-xs text-gray-500 mt-2">
                        Performed by: {transaction.performer_email}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
