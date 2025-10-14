import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DashboardSkeleton } from './LoadingSkeleton';
import { PropertyEditModal } from './PropertyEditModal';
import { showNotification } from './Notification';
import {
  Home, Plus, Edit, Trash2, Eye, Copy, Search, RefreshCw,
  EyeOff, Power, Clock, MapPin, Bed, Bath, Square, Building2, Star, Zap,
  CheckCircle, TrendingUp, DollarSign, Filter, LayoutGrid, List, AlertCircle
} from 'lucide-react';

interface Property {
  id: string;
  title: string;
  description: string;
  property_type: string;
  listing_type: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  main_image_url?: string;
  image_urls?: string[];
  amenities?: string[];
  status: string;
  views_count: number;
  is_featured: boolean;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
}

export function AgentDashboard() {
  const { user, profile } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_high' | 'price_low' | 'views'>('newest');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const [stats, setStats] = useState({
    totalProperties: 0,
    activeListings: 0,
    pendingListings: 0,
    inactiveListings: 0,
    featuredCount: 0,
    totalViews: 0,
    listingCredits: 0,
    boostingCredits: 0
  });

  useEffect(() => {
    if (user) {
      loadProperties();
    }
  }, [user]);

  useEffect(() => {
    filterAndSortProperties();
  }, [properties, searchQuery, statusFilter, sortBy]);

  const loadProperties = async () => {
    try {
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('agent_id', user?.id)
        .order('created_at', { ascending: false });

      if (propertiesError) throw propertiesError;

      setProperties(propertiesData || []);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('listing_credits, boosting_credits')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;

      const activeCount = propertiesData?.filter(p => p.status === 'active').length || 0;
      const pendingCount = propertiesData?.filter(p => p.status === 'pending').length || 0;
      const inactiveCount = propertiesData?.filter(p => p.status === 'inactive').length || 0;
      const featuredCount = propertiesData?.filter(p => p.is_featured).length || 0;
      const totalViews = propertiesData?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0;

      setStats({
        totalProperties: propertiesData?.length || 0,
        activeListings: activeCount,
        pendingListings: pendingCount,
        inactiveListings: inactiveCount,
        featuredCount,
        totalViews,
        listingCredits: profileData?.listing_credits || 0,
        boostingCredits: profileData?.boosting_credits || 0
      });
    } catch (error: any) {
      console.error('Error loading properties:', error);
      showNotification('error', 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortProperties = () => {
    let filtered = [...properties];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.city.toLowerCase().includes(query) ||
        p.state.toLowerCase().includes(query) ||
        p.property_type.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'price_high':
          return b.price - a.price;
        case 'price_low':
          return a.price - b.price;
        case 'views':
          return (b.views_count || 0) - (a.views_count || 0);
        default:
          return 0;
      }
    });

    setFilteredProperties(filtered);
  };

  const handleRefresh = () => {
    setLoading(true);
    loadProperties();
    showNotification('success', 'Data refreshed successfully');
  };

  const handleAddProperty = () => {
    if (stats.listingCredits <= 0) {
      showNotification('warning', 'You need listing credits to create a property.');
      return;
    }
    setSelectedProperty(null);
    setShowEditModal(true);
  };

  const handleEditProperty = (property: Property) => {
    setSelectedProperty(property);
    setShowEditModal(true);
  };

  const handleDuplicateProperty = async (property: Property) => {
    if (stats.listingCredits <= 0) {
      showNotification('warning', 'You need listing credits to duplicate a property.');
      return;
    }

    setActionLoading(property.id);
    try {
      const { id, created_at, updated_at, ...propertyData } = property;
      const duplicateData = {
        ...propertyData,
        title: `${property.title} (Copy)`,
        status: 'pending',
        is_featured: false,
        views_count: 0
      };

      const { error } = await supabase.from('properties').insert([duplicateData]);
      if (error) throw error;

      showNotification('success', 'Property duplicated successfully!');
      loadProperties();
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to duplicate property');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBoostProperty = async (propertyId: string) => {
    if (stats.boostingCredits <= 0) {
      showNotification('warning', 'You need boosting credits to feature a property.');
      return;
    }

    setActionLoading(propertyId);
    try {
      const { error } = await supabase
        .from('properties')
        .update({ is_featured: true })
        .eq('id', propertyId);

      if (error) throw error;

      const { error: creditError } = await supabase
        .from('profiles')
        .update({ boosting_credits: stats.boostingCredits - 1 })
        .eq('id', user?.id);

      if (creditError) throw creditError;

      showNotification('success', 'Property featured successfully!');
      loadProperties();
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to boost property');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (property: Property) => {
    setActionLoading(property.id);
    try {
      const newStatus = property.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('properties')
        .update({ status: newStatus })
        .eq('id', property.id);

      if (error) throw error;

      showNotification('success', `Property ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
      loadProperties();
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to update property status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    setActionLoading(propertyId);
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);

      if (error) throw error;

      showNotification('success', 'Property deleted successfully!');
      loadProperties();
      setShowDeleteConfirm(null);
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to delete property');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-700 border-green-300',
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      inactive: 'bg-gray-100 text-gray-700 border-gray-300',
      draft: 'bg-blue-100 text-blue-700 border-blue-300'
    };
    return styles[status as keyof typeof styles] || styles.draft;
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Portfolio Dashboard</h1>
              <p className="text-gray-600 text-lg">Manage and optimize your property listings</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleRefresh}
                className="px-5 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold shadow-sm hover:shadow flex items-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Refresh
              </button>
              <button
                onClick={handleAddProperty}
                disabled={stats.listingCredits <= 0}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Property
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded text-sm">
                  {stats.listingCredits}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1 font-medium">Total</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalProperties}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-green-50 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1 font-medium">Active</p>
            <p className="text-3xl font-bold text-green-600">{stats.activeListings}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-yellow-50 rounded-xl">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1 font-medium">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.pendingListings}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-gray-50 rounded-xl">
                <EyeOff className="w-6 h-6 text-gray-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1 font-medium">Inactive</p>
            <p className="text-3xl font-bold text-gray-600">{stats.inactiveListings}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-orange-50 rounded-xl">
                <Star className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1 font-medium">Featured</p>
            <p className="text-3xl font-bold text-orange-600">{stats.featuredCount}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-purple-50 rounded-xl">
                <Eye className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1 font-medium">Views</p>
            <p className="text-3xl font-bold text-purple-600">{stats.totalViews}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-lg p-5 text-white hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-white/20 rounded-xl">
                <Home className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-sm text-blue-100 mb-1 font-medium">List Credits</p>
            <p className="text-3xl font-bold">{stats.listingCredits}</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl shadow-lg p-5 text-white hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-white/20 rounded-xl">
                <Zap className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-sm text-yellow-100 mb-1 font-medium">Boost Credits</p>
            <p className="text-3xl font-bold">{stats.boostingCredits}</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, location, or type..."
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold bg-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold bg-white"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price_high">Price: High to Low</option>
                <option value="price_low">Price: Low to High</option>
                <option value="views">Most Viewed</option>
              </select>

              <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                  }`}
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Properties List */}
        {filteredProperties.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {properties.length === 0 ? 'No properties yet' : 'No properties found'}
              </h3>
              <p className="text-gray-600 mb-8 text-lg">
                {properties.length === 0
                  ? 'Start building your portfolio by adding your first property listing'
                  : 'Try adjusting your filters or search terms'}
              </p>
              {properties.length === 0 && (
                <button
                  onClick={handleAddProperty}
                  disabled={stats.listingCredits <= 0}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-3"
                >
                  <Plus className="w-6 h-6" />
                  Add Your First Property
                </button>
              )}
            </div>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-4">
            {filteredProperties.map((property) => (
              <div
                key={property.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all overflow-hidden"
              >
                <div className="flex flex-col md:flex-row">
                  {/* Image */}
                  <div className="w-full md:w-72 h-48 flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                    {property.main_image_url ? (
                      <img
                        src={property.main_image_url}
                        alt={property.title}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                    {property.is_featured && (
                      <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-lg flex items-center gap-1.5">
                        <Star className="w-4 h-4 fill-current" />
                        Featured
                      </div>
                    )}
                    <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-lg text-sm font-bold border ${getStatusBadge(property.status)}`}>
                      {property.status.toUpperCase()}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0 pr-4">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">{property.title}</h3>
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                            <Building2 className="w-4 h-4" />
                            {property.property_type}
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium capitalize">
                            <DollarSign className="w-4 h-4" />
                            For {property.listing_type}
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                            <MapPin className="w-4 h-4" />
                            {property.city}, {property.state}
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                            <Eye className="w-4 h-4" />
                            {property.views_count || 0} views
                          </span>
                        </div>
                        <p className="text-gray-700 mb-4 line-clamp-2">{property.description}</p>
                        <div className="flex items-center gap-6 text-gray-600 mb-4">
                          <span className="flex items-center gap-2">
                            <Bed className="w-5 h-5" />
                            <span className="font-semibold">{property.bedrooms}</span>
                          </span>
                          <span className="flex items-center gap-2">
                            <Bath className="w-5 h-5" />
                            <span className="font-semibold">{property.bathrooms}</span>
                          </span>
                          <span className="flex items-center gap-2">
                            <Square className="w-5 h-5" />
                            <span className="font-semibold">{property.sqft.toLocaleString()} sqft</span>
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 mb-1">Price</p>
                        <p className="text-3xl font-bold text-blue-600">
                          RM {property.price.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          RM {(property.price / property.sqft).toFixed(0)}/sqft
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => handleEditProperty(property)}
                        disabled={actionLoading === property.id}
                        className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors font-semibold text-sm inline-flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDuplicateProperty(property)}
                        disabled={actionLoading === property.id || stats.listingCredits <= 0}
                        className="px-4 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors font-semibold text-sm inline-flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Duplicate
                      </button>
                      {property.status === 'active' && !property.is_featured && (
                        <button
                          onClick={() => handleBoostProperty(property.id)}
                          disabled={actionLoading === property.id || stats.boostingCredits <= 0}
                          className="px-4 py-2 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-lg transition-colors font-semibold text-sm inline-flex items-center gap-2"
                        >
                          <Zap className="w-4 h-4" />
                          Boost
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleStatus(property)}
                        disabled={actionLoading === property.id}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm inline-flex items-center gap-2 transition-colors ${
                          property.status === 'active'
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        <Power className="w-4 h-4" />
                        {property.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(property.id)}
                        disabled={actionLoading === property.id}
                        className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors font-semibold text-sm inline-flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <div
                key={property.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all overflow-hidden"
              >
                <div className="relative h-56 bg-gradient-to-br from-gray-100 to-gray-200">
                  {property.main_image_url ? (
                    <img
                      src={property.main_image_url}
                      alt={property.title}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  {property.is_featured && (
                    <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-lg flex items-center gap-1.5">
                      <Star className="w-4 h-4 fill-current" />
                      Featured
                    </div>
                  )}
                  <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-lg text-sm font-bold border ${getStatusBadge(property.status)}`}>
                    {property.status.toUpperCase()}
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">{property.title}</h3>
                  <div className="flex items-center gap-2 mb-3 text-sm">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">{property.city}, {property.state}</span>
                  </div>
                  <p className="text-gray-700 mb-4 line-clamp-2 text-sm">{property.description}</p>

                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-4 text-gray-600 text-sm">
                      <span className="flex items-center gap-1">
                        <Bed className="w-4 h-4" />
                        {property.bedrooms}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bath className="w-4 h-4" />
                        {property.bathrooms}
                      </span>
                      <span className="flex items-center gap-1">
                        <Square className="w-4 h-4" />
                        {property.sqft}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-2xl font-bold text-blue-600">
                      RM {property.price.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      RM {(property.price / property.sqft).toFixed(0)}/sqft
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditProperty(property)}
                      className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors font-semibold text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(property.id)}
                      className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors font-semibold text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <PropertyEditModal
          property={selectedProperty}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProperty(null);
          }}
          onSave={() => {
            loadProperties();
            setShowEditModal(false);
            setSelectedProperty(null);
          }}
          agentId={user?.id || ''}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">Delete Property?</h3>
            <p className="text-gray-600 mb-8 text-center">
              This action cannot be undone. Are you sure you want to delete this property?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProperty(showDeleteConfirm)}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
