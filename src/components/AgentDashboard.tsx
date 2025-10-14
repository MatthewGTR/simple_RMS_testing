import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DashboardSkeleton } from './LoadingSkeleton';
import { PropertyEditModal } from './PropertyEditModal';
import { showNotification } from './Notification';
import {
  Home, Plus, Edit, Trash2, Eye, Search, RefreshCw, MapPin, Bed, Bath, Square,
  Building2, Star, Zap, CheckCircle, Clock, EyeOff, MoreVertical, Copy, Power,
  TrendingUp, Filter, X, ChevronRight, Package
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
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

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
    showNotification('success', 'Data refreshed');
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
    setActiveMenu(null);
  };

  const handleDuplicateProperty = async (property: Property) => {
    if (stats.listingCredits <= 0) {
      showNotification('warning', 'You need listing credits to duplicate a property.');
      return;
    }

    setActionLoading(property.id);
    setActiveMenu(null);
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

      showNotification('success', 'Property duplicated successfully');
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
    setActiveMenu(null);
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

      showNotification('success', 'Property featured successfully');
      loadProperties();
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to boost property');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (property: Property) => {
    setActionLoading(property.id);
    setActiveMenu(null);
    try {
      const newStatus = property.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('properties')
        .update({ status: newStatus })
        .eq('id', property.id);

      if (error) throw error;

      showNotification('success', `Property ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
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

      showNotification('success', 'Property deleted successfully');
      loadProperties();
      setShowDeleteConfirm(null);
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to delete property');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1800px] mx-auto">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
                <p className="text-sm text-gray-500 mt-0.5">{stats.totalProperties} total properties</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <button
                  onClick={handleAddProperty}
                  disabled={stats.listingCredits <= 0}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-5 h-5" />
                  Add Listing
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 p-6">
          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
            {/* Stats Cards */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Overview</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Active</p>
                      <p className="text-lg font-bold text-gray-900">{stats.activeListings}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Pending</p>
                      <p className="text-lg font-bold text-gray-900">{stats.pendingListings}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                      <EyeOff className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Inactive</p>
                      <p className="text-lg font-bold text-gray-900">{stats.inactiveListings}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                      <Star className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Featured</p>
                      <p className="text-lg font-bold text-gray-900">{stats.featuredCount}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Eye className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total Views</p>
                      <p className="text-lg font-bold text-gray-900">{stats.totalViews.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Credits */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Credits</h3>
              <div className="space-y-3">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-blue-700 font-medium">Listing Credits</p>
                    <Package className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-3xl font-bold text-blue-900">{stats.listingCredits}</p>
                  <p className="text-xs text-blue-600 mt-1">Available for new listings</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-yellow-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-orange-700 font-medium">Boost Credits</p>
                    <Zap className="w-4 h-4 text-orange-600" />
                  </div>
                  <p className="text-3xl font-bold text-orange-900">{stats.boostingCredits}</p>
                  <p className="text-xs text-orange-600 mt-1">Feature your properties</p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Filters</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="views">Most Viewed</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-12 lg:col-span-9">
            {/* Search Bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, location, or property type..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Properties Grid */}
            {filteredProperties.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {properties.length === 0 ? 'No properties yet' : 'No properties found'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {properties.length === 0
                    ? 'Create your first listing to get started'
                    : 'Try adjusting your filters or search terms'}
                </p>
                {properties.length === 0 && (
                  <button
                    onClick={handleAddProperty}
                    disabled={stats.listingCredits <= 0}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-5 h-5" />
                    Create First Listing
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredProperties.map((property) => (
                  <div
                    key={property.id}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group"
                  >
                    {/* Image */}
                    <div className="relative h-52 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                      {property.main_image_url ? (
                        <img
                          src={property.main_image_url}
                          alt={property.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Building2 className="w-12 h-12 text-gray-400" />
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className="absolute top-3 left-3">
                        {property.status === 'active' && (
                          <span className="px-2.5 py-1 bg-green-500 text-white text-xs font-semibold rounded-md">
                            Active
                          </span>
                        )}
                        {property.status === 'pending' && (
                          <span className="px-2.5 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-md">
                            Pending
                          </span>
                        )}
                        {property.status === 'inactive' && (
                          <span className="px-2.5 py-1 bg-gray-500 text-white text-xs font-semibold rounded-md">
                            Inactive
                          </span>
                        )}
                      </div>

                      {/* Featured Badge */}
                      {property.is_featured && (
                        <div className="absolute top-3 right-3">
                          <span className="px-2.5 py-1 bg-orange-500 text-white text-xs font-semibold rounded-md flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            Featured
                          </span>
                        </div>
                      )}

                      {/* Menu Button */}
                      <div className="absolute bottom-3 right-3">
                        <button
                          onClick={() => setActiveMenu(activeMenu === property.id ? null : property.id)}
                          className="w-8 h-8 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-700" />
                        </button>

                        {/* Dropdown Menu */}
                        {activeMenu === property.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-10">
                            <button
                              onClick={() => handleEditProperty(property)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Edit Details
                            </button>
                            <button
                              onClick={() => handleDuplicateProperty(property)}
                              disabled={stats.listingCredits <= 0}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Copy className="w-4 h-4" />
                              Duplicate
                            </button>
                            {property.status === 'active' && !property.is_featured && (
                              <button
                                onClick={() => handleBoostProperty(property.id)}
                                disabled={stats.boostingCredits <= 0}
                                className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Zap className="w-4 h-4" />
                                Feature Listing
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleStatus(property)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Power className="w-4 h-4" />
                              {property.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <div className="border-t border-gray-200 my-1"></div>
                            <button
                              onClick={() => setShowDeleteConfirm(property.id)}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="mb-3">
                        <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">
                          {property.title}
                        </h3>
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin className="w-4 h-4 mr-1" />
                          {property.city}, {property.state}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Bed className="w-4 h-4" />
                          <span>{property.bedrooms}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Bath className="w-4 h-4" />
                          <span>{property.bathrooms}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Square className="w-4 h-4" />
                          <span>{property.sqft.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div>
                          <p className="text-xl font-bold text-gray-900">
                            RM {property.price.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            RM {(property.price / property.sqft).toFixed(0)}/sqft
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Eye className="w-4 h-4" />
                          <span>{property.views_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Delete Property?</h3>
            <p className="text-gray-600 mb-6 text-center text-sm">
              This action cannot be undone. The property will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProperty(showDeleteConfirm)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
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
