import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DashboardSkeleton } from './LoadingSkeleton';
import { PropertyEditModal } from './PropertyEditModal';
import { showNotification } from './Notification';
import {
  Home, Plus, Edit, Trash2, Eye, Copy, Search, RefreshCw,
  EyeOff, Power, Clock, MapPin, Bed, Bath, Square, Building2, Star, Zap,
  CheckCircle, TrendingUp, DollarSign, Info, Download
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

  const [stats, setStats] = useState({
    totalProperties: 0,
    activeListings: 0,
    pendingListings: 0,
    inactiveListings: 0,
    soldListings: 0,
    totalViews: 0,
    avgViews: 0,
    featuredCount: 0,
    listingCredits: 0,
    boostingCredits: 0
  });

  useEffect(() => {
    if (user) {
      loadProperties();
      loadCredits();
    }
  }, [user]);

  useEffect(() => {
    filterAndSortProperties();
  }, [properties, searchQuery, statusFilter, sortBy]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('agent_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProperties(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
      showNotification('error', 'Failed to load properties. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const loadCredits = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('listing_credits, boosting_credits')
        .eq('id', user?.id)
        .maybeSingle();

      if (data) {
        setStats(prev => ({
          ...prev,
          listingCredits: data.listing_credits || 0,
          boostingCredits: data.boosting_credits || 0
        }));
      }
    } catch (error) {
      console.error('Error loading credits:', error);
    }
  };

  const calculateStats = (props: Property[]) => {
    const totalViews = props.reduce((sum, p) => sum + (p.views_count || 0), 0);
    const active = props.filter(p => p.status === 'active').length;
    const pending = props.filter(p => p.status === 'pending').length;
    const inactive = props.filter(p => p.status === 'inactive').length;
    const sold = props.filter(p => p.status === 'sold').length;
    const featured = props.filter(p => p.is_featured).length;
    const avgViews = props.length > 0 ? Math.round(totalViews / props.length) : 0;

    setStats(prev => ({
      ...prev,
      totalProperties: props.length,
      activeListings: active,
      pendingListings: pending,
      inactiveListings: inactive,
      soldListings: sold,
      totalViews,
      avgViews,
      featuredCount: featured
    }));
  };

  const filterAndSortProperties = () => {
    let filtered = [...properties];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.city.toLowerCase().includes(query) ||
        p.property_type.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query)
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
      const { title, description, property_type, listing_type, price, bedrooms, bathrooms, sqft, address, city, state, postal_code, main_image_url, image_urls, amenities } = property;

      const newProperty = {
        title: `${title} (Copy)`,
        description,
        property_type,
        listing_type,
        price,
        bedrooms,
        bathrooms,
        sqft,
        address,
        city,
        state,
        postal_code,
        main_image_url,
        image_urls,
        amenities,
        agent_id: user?.id,
        status: 'pending',
        views_count: 0,
        is_featured: false,
        is_premium: false
      };

      const { error: insertError } = await supabase
        .from('properties')
        .insert([newProperty]);

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ listing_credits: stats.listingCredits - 1 })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      showNotification('success', 'Property duplicated successfully!');
      await loadProperties();
      await loadCredits();
    } catch (error: any) {
      console.error('Error duplicating property:', error);
      showNotification('error', error.message || 'Failed to duplicate property');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteProperty = async (id: string) => {
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showNotification('success', 'Property deleted successfully!');
      setShowDeleteConfirm(null);
      await loadProperties();
    } catch (error: any) {
      console.error('Error deleting property:', error);
      showNotification('error', error.message || 'Failed to delete property');
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
      const { error: updateError } = await supabase
        .from('properties')
        .update({ is_featured: true })
        .eq('id', propertyId);

      if (updateError) throw updateError;

      const { error: creditError } = await supabase
        .from('profiles')
        .update({ boosting_credits: stats.boostingCredits - 1 })
        .eq('id', user?.id);

      if (creditError) throw creditError;

      showNotification('success', 'Property boosted! It will appear as featured.');
      await loadProperties();
      await loadCredits();
    } catch (error: any) {
      console.error('Error boosting property:', error);
      showNotification('error', error.message || 'Failed to boost property');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (property: Property) => {
    const newStatus = property.status === 'active' ? 'inactive' : 'active';
    setActionLoading(property.id);

    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: newStatus })
        .eq('id', property.id);

      if (error) throw error;

      showNotification('success', `Property ${newStatus === 'active' ? 'activated' : 'deactivated'}!`);
      await loadProperties();
    } catch (error: any) {
      console.error('Error updating status:', error);
      showNotification('error', error.message || 'Failed to update property status');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'sold':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'inactive':
        return <EyeOff className="w-4 h-4" />;
      case 'sold':
        return <DollarSign className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="h-8 w-64 bg-gray-200 rounded shimmer mb-2"></div>
          <div className="h-4 w-96 bg-gray-200 rounded shimmer"></div>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Property Management Dashboard</h1>
          <p className="text-lg text-gray-600">Manage your portfolio, track performance metrics, and optimize your listings</p>
          <p className="text-sm text-gray-500 mt-1">Last updated: {new Date().toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
            title="Refresh data"
          >
            <RefreshCw className="w-5 h-5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleAddProperty}
            disabled={stats.listingCredits <= 0}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-xl transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            title={stats.listingCredits <= 0 ? 'No listing credits available' : 'Create new property listing'}
          >
            <Plus className="w-5 h-5" />
            <span>Add Property</span>
            <span className="hidden lg:inline text-xs opacity-90">({stats.listingCredits} credits)</span>
          </button>
        </div>
      </div>

      {/* Stats Grid - Enhanced with descriptions */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-100 p-4 hover:shadow-lg transition-all group cursor-help" title="Total number of properties in your portfolio">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-100 rounded-lg group-hover:scale-110 transition-transform">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-xs font-semibold text-gray-600 mb-1">Total Properties</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalProperties}</p>
          <p className="text-xs text-gray-500 mt-1">All listings</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-100 p-4 hover:shadow-lg transition-all group cursor-help" title="Properties currently visible to buyers">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-lg group-hover:scale-110 transition-transform">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-xs font-semibold text-gray-600 mb-1">Active Listings</p>
          <p className="text-2xl font-bold text-gray-900">{stats.activeListings}</p>
          <p className="text-xs text-green-600 mt-1">Live now</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-100 p-4 hover:shadow-lg transition-all group cursor-help" title="Properties awaiting admin approval before going live">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
          <p className="text-xs font-semibold text-gray-600 mb-1">Pending Review</p>
          <p className="text-2xl font-bold text-gray-900">{stats.pendingListings}</p>
          <p className="text-xs text-yellow-600 mt-1">In review</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-100 p-4 hover:shadow-lg transition-all group cursor-help" title="Properties temporarily hidden from public view">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-gray-100 rounded-lg group-hover:scale-110 transition-transform">
              <EyeOff className="w-5 h-5 text-gray-600" />
            </div>
          </div>
          <p className="text-xs font-semibold text-gray-600 mb-1">Inactive</p>
          <p className="text-2xl font-bold text-gray-900">{stats.inactiveListings}</p>
          <p className="text-xs text-gray-500 mt-1">Not visible</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-100 p-4 hover:shadow-lg transition-all group cursor-help" title="Premium listings shown at top of search results">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-100 rounded-lg group-hover:scale-110 transition-transform">
              <Star className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <p className="text-xs font-semibold text-gray-600 mb-1">Featured</p>
          <p className="text-2xl font-bold text-gray-900">{stats.featuredCount}</p>
          <p className="text-xs text-orange-600 mt-1">Boosted</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-100 p-4 hover:shadow-lg transition-all group cursor-help" title="Total number of times your properties have been viewed">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-100 rounded-lg group-hover:scale-110 transition-transform">
              <Eye className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-xs font-semibold text-gray-600 mb-1">Total Views</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalViews}</p>
          <p className="text-xs text-purple-600 mt-1">All time</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-xl p-4 text-white hover:shadow-2xl transition-all group cursor-help" title="Credits available for creating new property listings">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
              <Home className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-xs font-semibold text-blue-100 mb-1">Listing Credits</p>
          <p className="text-2xl font-bold">{stats.listingCredits}</p>
          <p className="text-xs text-blue-100 mt-1">Available</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl shadow-xl p-4 text-white hover:shadow-2xl transition-all group cursor-help" title="Credits available for featuring/boosting properties">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-xs font-semibold text-yellow-100 mb-1">Boosting Credits</p>
          <p className="text-2xl font-bold">{stats.boostingCredits}</p>
          <p className="text-xs text-yellow-100 mt-1">Available</p>
        </div>
      </div>

      {/* Quick Actions Info Banner */}
      {(stats.listingCredits === 0 || stats.boostingCredits === 0) && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Info className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-blue-900 mb-2">Need Credits?</h3>
              <p className="text-blue-700">
                {stats.listingCredits === 0 && 'You need listing credits to post new properties. '}
                {stats.boostingCredits === 0 && 'You need boosting credits to feature your listings. '}
                Contact an administrator to purchase more credits.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-100">
        <div className="p-6 border-b-2 border-gray-100">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, location, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-6 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium min-w-[160px]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
              <option value="sold">Sold</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-6 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium min-w-[180px]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price_high">Price: High → Low</option>
              <option value="price_low">Price: Low → High</option>
              <option value="views">Most Viewed</option>
            </select>

            <button
              onClick={() => { loadProperties(); loadCredits(); }}
              className="px-6 py-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Properties List */}
        <div className="p-6">
          {filteredProperties.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {properties.length === 0 ? 'No properties yet' : 'No properties found'}
              </h3>
              <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">
                {properties.length === 0
                  ? 'Start growing your real estate portfolio by adding your first property listing'
                  : 'Try adjusting your search or filters to find what you\'re looking for'}
              </p>
              {properties.length === 0 && (
                <button
                  onClick={handleAddProperty}
                  disabled={stats.listingCredits <= 0}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-xl transition-all font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-6 h-6" />
                  Add Your First Property
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredProperties.map((property, index) => (
                <div
                  key={property.id}
                  className="group border-2 border-gray-200 rounded-2xl p-6 hover:border-blue-300 hover:shadow-xl transition-all duration-300 animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Property Image */}
                    <div className="w-full lg:w-64 h-48 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                      {property.main_image_url ? (
                        <img
                          src={property.main_image_url}
                          alt={property.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Building2 className="w-16 h-16 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Property Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-3 mb-3 flex-wrap">
                            <h3 className="text-2xl font-bold text-gray-900">
                              {property.title}
                            </h3>
                            {property.is_featured && (
                              <span className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-full text-sm font-bold shadow-lg">
                                <Star className="w-4 h-4 fill-current" />
                                Featured
                              </span>
                            )}
                            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border-2 ${getStatusColor(property.status)}`}>
                              {getStatusIcon(property.status)}
                              {property.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3 flex-wrap">
                            <span className="flex items-center gap-1.5 capitalize font-medium bg-gray-100 px-2 py-1 rounded">
                              <Building2 className="w-4 h-4" />
                              {property.property_type}
                            </span>
                            <span className="flex items-center gap-1.5 font-medium capitalize bg-purple-100 text-purple-700 px-2 py-1 rounded">
                              <DollarSign className="w-4 h-4" />
                              For {property.listing_type}
                            </span>
                            <span className="flex items-center gap-1.5 font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              <MapPin className="w-4 h-4" />
                              {property.city}, {property.state}
                            </span>
                            <span className="flex items-center gap-1.5 font-medium bg-green-100 text-green-700 px-2 py-1 rounded" title="Total views">
                              <Eye className="w-4 h-4" />
                              {property.views_count || 0} views
                            </span>
                          </div>
                          <p className="text-gray-700 text-base mb-3 line-clamp-2">
                            {property.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                            <span title="Created date">
                              Created: {new Date(property.created_at).toLocaleDateString()}
                            </span>
                            <span>•</span>
                            <span title="Last updated">
                              Updated: {new Date(property.updated_at).toLocaleDateString()}
                            </span>
                            {property.updated_at !== property.created_at && (
                              <span className="text-blue-600 font-semibold">Recently modified</span>
                            )}
                          </div>
                          <div className="flex items-center gap-6 text-sm text-gray-600">
                            <span className="flex items-center gap-2" title="Bedrooms">
                              <Bed className="w-5 h-5" />
                              <span className="font-semibold">{property.bedrooms} beds</span>
                            </span>
                            <span className="flex items-center gap-2" title="Bathrooms">
                              <Bath className="w-5 h-5" />
                              <span className="font-semibold">{property.bathrooms} baths</span>
                            </span>
                            <span className="flex items-center gap-2" title="Square footage">
                              <Square className="w-5 h-5" />
                              <span className="font-semibold">{property.sqft.toLocaleString()} sqft</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t-2 border-gray-100 gap-4">
                        <div className="flex-1">
                          <div className="flex items-baseline gap-3 mb-2">
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Listed Price</p>
                              <p className="text-3xl font-bold text-blue-600">
                                RM {property.price.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-sm text-gray-500">
                              <span className="font-semibold">RM {(property.price / property.sqft).toFixed(0)}</span> per sqft
                            </div>
                          </div>
                          {property.status === 'active' && property.views_count > 0 && (
                            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded inline-flex">
                              <TrendingUp className="w-3 h-3" />
                              <span className="font-semibold">Active listing performing well</span>
                            </div>
                          )}
                          {property.status === 'pending' && (
                            <div className="flex items-center gap-2 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded inline-flex">
                              <Clock className="w-3 h-3" />
                              <span className="font-semibold">Awaiting admin approval</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleEditProperty(property)}
                            disabled={actionLoading === property.id}
                            className="flex items-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors font-semibold disabled:opacity-50 text-sm"
                            title="Edit property details, images, and pricing"
                          >
                            <Edit className="w-4 h-4" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleDuplicateProperty(property)}
                            disabled={actionLoading === property.id || stats.listingCredits <= 0}
                            className="flex items-center gap-2 px-3 py-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors font-semibold disabled:opacity-50 text-sm"
                            title={stats.listingCredits <= 0 ? 'No listing credits available' : 'Create a copy of this property (uses 1 credit)'}
                          >
                            <Copy className="w-4 h-4" />
                            <span>Duplicate</span>
                          </button>

                          {property.status === 'active' && !property.is_featured && (
                            <button
                              onClick={() => handleBoostProperty(property.id)}
                              disabled={actionLoading === property.id || stats.boostingCredits <= 0}
                              className="flex items-center gap-2 px-3 py-2 text-yellow-600 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors font-semibold disabled:opacity-50 text-sm"
                              title={stats.boostingCredits <= 0 ? 'No boosting credits available' : 'Feature this property at top of search (uses 1 credit)'}
                            >
                              <Zap className="w-4 h-4" />
                              <span>Boost</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleToggleStatus(property)}
                            disabled={actionLoading === property.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 text-sm ${
                              property.status === 'active'
                                ? 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                                : 'text-green-700 bg-green-100 hover:bg-green-200'
                            }`}
                            title={property.status === 'active' ? 'Hide property from public view' : 'Make property visible to buyers'}
                          >
                            <Power className="w-4 h-4" />
                            <span>{property.status === 'active' ? 'Deactivate' : 'Activate'}</span>
                          </button>

                          <button
                            onClick={() => setShowDeleteConfirm(property.id)}
                            disabled={actionLoading === property.id}
                            className="flex items-center gap-2 px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors font-semibold disabled:opacity-50 text-sm"
                            title="Permanently delete this property listing"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Property Edit Modal */}
      {showEditModal && (
        <PropertyEditModal
          property={selectedProperty}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            loadProperties();
            loadCredits();
            setShowEditModal(false);
          }}
          agentId={user?.id || ''}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full animate-scale-in">
            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Delete Property?</h3>
              <p className="text-gray-600 mb-8 text-lg">
                This action cannot be undone. The property listing will be permanently removed.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  disabled={actionLoading !== null}
                  className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteProperty(showDeleteConfirm)}
                  disabled={actionLoading !== null}
                  className="flex-1 px-6 py-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-bold disabled:opacity-50"
                >
                  {actionLoading === showDeleteConfirm ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
