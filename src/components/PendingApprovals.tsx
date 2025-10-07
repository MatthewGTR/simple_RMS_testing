import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';

interface PendingCredit {
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
}

export default function PendingApprovals() {
  const [pendingRequests, setPendingRequests] = useState<PendingCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('list_pending_credits');

      if (rpcError) throw rpcError;

      setPendingRequests(data || []);
    } catch (err) {
      console.error('Error fetching pending approvals:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pending approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const handleApprove = async (requestId: number) => {
    try {
      setProcessing(requestId);
      setError(null);
      setMessage(null);

      const notes = reviewNotes[requestId] || null;

      const { error: rpcError } = await supabase.rpc('approve_credit_change', {
        p_request_id: requestId,
        p_review_notes: notes,
      });

      if (rpcError) throw rpcError;

      setMessage('Credit change approved successfully');
      await fetchPendingApprovals();

      setReviewNotes((prev) => {
        const newNotes = { ...prev };
        delete newNotes[requestId];
        return newNotes;
      });
    } catch (err) {
      console.error('Error approving request:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve request');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      setProcessing(requestId);
      setError(null);
      setMessage(null);

      const notes = reviewNotes[requestId] || null;

      const { error: rpcError } = await supabase.rpc('reject_credit_change', {
        p_request_id: requestId,
        p_review_notes: notes,
      });

      if (rpcError) throw rpcError;

      setMessage('Credit change rejected');
      await fetchPendingApprovals();

      setReviewNotes((prev) => {
        const newNotes = { ...prev };
        delete newNotes[requestId];
        return newNotes;
      });
    } catch (err) {
      console.error('Error rejecting request:', err);
      setError(err instanceof Error ? err.message : 'Failed to reject request');
    } finally {
      setProcessing(null);
    }
  };

  const pendingCount = pendingRequests.filter((req) => req.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pending Approvals</h2>
          <p className="text-gray-600 mt-1">Review and approve credit change requests from admins</p>
        </div>
        <button
          onClick={fetchPendingApprovals}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-semibold shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl text-red-800 flex items-center shadow-sm">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {message && (
        <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-xl text-green-800 flex items-center shadow-sm">
          <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <span className="font-medium">{message}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">
            Pending Requests ({pendingCount})
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-gray-600">Loading pending approvals...</p>
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600 text-lg font-medium">No pending approvals</p>
            <p className="text-gray-500 text-sm mt-1">All credit requests have been reviewed</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className={`border rounded-xl p-5 transition-all ${
                  request.status === 'pending'
                    ? 'border-yellow-200 bg-yellow-50'
                    : request.status === 'approved'
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold ${
                          request.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                            : request.status === 'approved'
                            ? 'bg-green-100 text-green-700 border border-green-300'
                            : 'bg-red-100 text-red-700 border border-red-300'
                        }`}
                      >
                        {request.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                        {request.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {request.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                        {request.status.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(request.requested_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">User</p>
                        <p className="text-sm font-semibold text-gray-900">{request.user_email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Requested By</p>
                        <p className="text-sm font-semibold text-gray-900">{request.requested_by_email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Credit Change</p>
                        <p
                          className={`text-sm font-bold ${
                            request.delta > 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {request.delta > 0 ? '+' : ''}
                          {request.delta}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Reason</p>
                        <p className="text-sm text-gray-900">{request.reason}</p>
                      </div>
                    </div>

                    {request.status !== 'pending' && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">
                          Reviewed by {request.reviewed_by_email} on{' '}
                          {request.reviewed_at ? new Date(request.reviewed_at).toLocaleString() : 'N/A'}
                        </p>
                        {request.review_notes && (
                          <p className="text-sm text-gray-700 mt-2">
                            <span className="font-semibold">Notes:</span> {request.review_notes}
                          </p>
                        )}
                      </div>
                    )}

                    {request.status === 'pending' && (
                      <div className="mt-3">
                        <textarea
                          placeholder="Add review notes (optional)..."
                          value={reviewNotes[request.id] || ''}
                          onChange={(e) =>
                            setReviewNotes((prev) => ({
                              ...prev,
                              [request.id]: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          rows={2}
                        />
                      </div>
                    )}
                  </div>

                  {request.status === 'pending' && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleApprove(request.id)}
                        disabled={processing === request.id}
                        className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-semibold shadow-sm text-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={processing === request.id}
                        className="flex items-center gap-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-semibold shadow-sm text-sm"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
