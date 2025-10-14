import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Home, Plus, Edit, Trash2, Eye, TrendingUp, DollarSign,
  MessageSquare, BarChart3, AlertCircle, CheckCircle
} from 'lucide-react';
import { PropertySubmission } from './PropertySubmission';

interface Property {
  id: string;
  title: string;
  price: number;
  city: string;
  status: string;
  views_count: number;
  created_at: string;
}

interface Inquiry {
  id: string;
  property_id: string;
  inquirer_name: string;
  inquirer_email: string;
  inquirer_phone: string | null;
  message: string;
  inquiry_type: string;
  status: string;
  created_at: string;
  properties?: {
    title: string;
  };
}

export function AgentDashboard() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'properties' | 'inquiries' | 'submit'>('overview');
  const [properties, setProperties] = useState<Property[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [stats, setStats] = useState({
    totalProperties: 0,
    activeListings: 0,
    totalViews: 0,
    pendingInquiries: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAgentData();
    }
  }, [user]);

  const loadAgentData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const [propertiesRes, inquiriesRes] = await Promise.all([
        supabase
          .from('properties')
          .select('*')
          .eq('agent_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('inquiries')
          .select(`
            *,
            properties:property_id (
              title
            )
          `)
          .in('property_id',
            supabase.from('properties').select('id').eq('agent_id', user.id)
          )
          .order('created_at', { ascending: false })
      ]);

      if (propertiesRes.error) throw propertiesRes.error;
      if (inquiriesRes.error) throw inquiriesRes.error;

      const props = propertiesRes.data || [];
      const inqs = inquiriesRes.data || [];

      setProperties(props);
      setInquiries(inqs);

      setStats({
        totalProperties: props.length,
        activeListings: props.filter(p => p.status === 'active').length,
        totalViews: props.reduce((sum, p) => sum + (p.views_count || 0), 0),
        pendingInquiries: inqs.filter(i => i.status === 'new').length
      });
    } catch (err) {
      console.error('Error loading agent data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    if (!confirm('Are you sure you want to delete this property?')) return;

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);

      if (error) throw error;
      loadAgentData();
    } catch (err: any) {
      console.error('Error deleting property:', err);
    }
  };

  const handleUpdateInquiryStatus = async (inquiryId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('inquiries')
        .update({ status })
        .eq('id', inquiryId);

      if (error) throw error;
      loadAgentData();
    } catch (err: any) {
      console.error('Error updating inquiry:', err);
    }
  };

  const handleBoostProperty = async (propertyId: string) => {
    if (!user || !profile) return;

    const boostingCredits = profile.boosting_credits || 0;
    const BOOST_COST = 3;

    if (boostingCredits < BOOST_COST) {
      alert(`Insufficient boosting credits. You need ${BOOST_COST} boosting credits. You have ${boostingCredits}.`);
      return;
    }

    if (!confirm(`Boost this property for ${BOOST_COST} boosting credits? It will be featured for 7 days.`)) return;

    try {
      const { error: propertyError } = await supabase
        .from('properties')
        .update({
          is_featured: true,
          featured_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          boost_count: supabase.rpc('increment_boost_count', { property_id: propertyId })
        })
        .eq('id', propertyId);

      if (propertyError) throw propertyError;

      const { error: creditError } = await supabase
        .from('profiles')
        .update({ boosting_credits: boostingCredits - BOOST_COST })
        .eq('id', user.id);

      if (creditError) throw creditError;

      await supabase.from('transaction_history').insert({
        user_id: user.id,
        transaction_type: 'deduction',
        amount: BOOST_COST,
        credit_type: 'boosting',
        description: `Boosted property listing`,
        admin_id: null
      });

      alert('Property boosted successfully! It will be featured for 7 days.');
      loadAgentData();
    } catch (err: any) {
      console.error('Error boosting property:', err);
      alert('Failed to boost property');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Agent Dashboard</h1>
        <p className="text-gray-600">Manage your properties and inquiries</p>
      </div>

      <div className="mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 px-6 py-3 font-semibold rounded-xl transition-all ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Overview
              </div>
            </button>
            <button
              onClick={() => setActiveTab('properties')}
              className={`flex-1 px-6 py-3 font-semibold rounded-xl transition-all ${
                activeTab === 'properties'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Home className="w-5 h-5" />
                My Properties
              </div>
            </button>
            <button
              onClick={() => setActiveTab('inquiries')}
              className={`flex-1 px-6 py-3 font-semibold rounded-xl transition-all ${
                activeTab === 'inquiries'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Inquiries
                {stats.pendingInquiries > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {stats.pendingInquiries}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('submit')}
              className={`flex-1 px-6 py-3 font-semibold rounded-xl transition-all ${
                activeTab === 'submit'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />
                Submit Property
              </div>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="bg-blue-100 rounded-lg p-3">
                  <Home className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Properties</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalProperties}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="bg-green-100 rounded-lg p-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Listings</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeListings}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="bg-purple-100 rounded-lg p-3">
                  <Eye className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Views</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalViews}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="bg-orange-100 rounded-lg p-3">
                  <MessageSquare className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">New Inquiries</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingInquiries}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Credits Balance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-blue-800">Listing Credits</p>
                  <Home className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-4xl font-bold text-blue-600">{profile?.listing_credits || 0}</p>
                <p className="text-xs text-blue-700 mt-2">Used for posting new properties (5 per listing)</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-green-800">Boosting Credits</p>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-4xl font-bold text-green-600">{profile?.boosting_credits || 0}</p>
                <p className="text-xs text-green-700 mt-2">Used for featuring properties (3 per boost)</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Getting Started</h3>
                <p className="text-blue-800 text-sm mb-3">
                  Start posting your properties to reach thousands of potential buyers and renters.
                </p>
                <button
                  onClick={() => setActiveTab('submit')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Submit Your First Property
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'properties' && (
        <div>
          {properties.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Home className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">You haven't posted any properties yet</p>
              <button
                onClick={() => setActiveTab('submit')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Post Your First Property
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {properties.map((property) => (
                <div key={property.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{property.title}</h3>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          property.status === 'active' ? 'bg-green-100 text-green-800' :
                          property.status === 'sold' || property.status === 'rented' ? 'bg-blue-100 text-blue-800' :
                          property.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {property.status}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">{property.city}</p>
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          RM {property.price.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {property.views_count} views
                        </div>
                        <div className="text-xs">
                          Posted {new Date(property.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleBoostProperty(property.id)}
                        className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all font-medium flex items-center gap-2"
                        title="Boost Property"
                      >
                        <TrendingUp className="w-4 h-4" />
                        Boost
                      </button>
                      <button
                        onClick={() => handleDeleteProperty(property.id)}
                        className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'inquiries' && (
        <div>
          {inquiries.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No inquiries yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {inquiries.map((inquiry) => (
                <div key={inquiry.id} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{inquiry.inquirer_name}</h3>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          inquiry.status === 'new' ? 'bg-orange-100 text-orange-800' :
                          inquiry.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {inquiry.status}
                        </span>
                        <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full capitalize">
                          {inquiry.inquiry_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Property: {inquiry.properties?.title || 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        Email: {inquiry.inquirer_email}
                      </p>
                      {inquiry.inquirer_phone && (
                        <p className="text-sm text-gray-600 mb-2">
                          Phone: {inquiry.inquirer_phone}
                        </p>
                      )}
                      <p className="text-gray-700 mt-3">{inquiry.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(inquiry.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {inquiry.status === 'new' && (
                    <div className="flex gap-2 pt-4 border-t">
                      <button
                        onClick={() => handleUpdateInquiryStatus(inquiry.id, 'contacted')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Mark as Contacted
                      </button>
                      <button
                        onClick={() => handleUpdateInquiryStatus(inquiry.id, 'closed')}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'submit' && (
        <PropertySubmission />
      )}
    </div>
  );
}
