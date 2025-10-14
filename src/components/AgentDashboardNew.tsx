import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DashboardSkeleton } from './LoadingSkeleton';
import { PropertyEditModal } from './PropertyEditModal';
import {
  Home, Plus, Edit, Trash2, Eye, TrendingUp, DollarSign, Copy,
  MessageSquare, BarChart3, AlertCircle, CheckCircle, Search, Filter,
  ChevronDown, Building2, Star, Zap, MoreVertical, RefreshCw, X
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

export function AgentDashboardNew() {
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

  const [stats, setStats] = useState({
    totalProperties: 0,
    activeListings: 0,
    pendingListings: 0,
    totalViews: 0,
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
        .single();

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

    setStats(prev => ({
      ...prev,
      totalProperties: props.length,
      activeListings: active,
      pendingListings: pending,
      totalViews
    }));
  };

  const filterAndSortProperties = () => {
    let filtered = [...properties];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.city.toLowerCase().includes(query) ||
        p.property_type.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Sort
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

  const handleAddProperty = () => {
    setSelectedProperty(null);
    setShowEditModal(true);
  };

  const handleEditProperty = (property: Property) => {
    setSelectedProperty(property);
    setShowEditModal(true);
  };

  const handleDuplicateProperty = async (property: Property) => {
    if (stats.listingCredits <= 0) {
      alert('You need listing credits to create a new property. Please contact admin.');
      return;
    }

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

      const { error } = await supabase
        .from('properties')
        .insert([newProperty]);

      if (error) throw error;

      // Deduct listing credit
      await supabase
        .from('profiles')
        .update({ listing_credits: stats.listingCredits - 1 })
        .eq('id', user?.id);

      alert('Property duplicated successfully!');
      loadProperties();
      loadCredits();
    } catch (error) {
      console.error('Error duplicating property:', error);
      alert('Failed to duplicate property');
    }
  };

  const handleDeleteProperty = async (id: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Property deleted successfully!');
      setShowDeleteConfirm(null);
      loadProperties();
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Failed to delete property');
    }
  };

  const handleBoostProperty = async (propertyId: string) => {
    if (stats.boostingCredits <= 0) {
      alert('You need boosting credits to boost a property. Please contact admin.');
      return;
    }

    try {
      const { error } = await supabase
        .from('properties')
        .update({ is_featured: true })
        .eq('id', propertyId);

      if (error) throw error;

      // Deduct boosting credit
      await supabase
        .from('profiles')
        .update({ boosting_credits: stats.boostingCredits - 1 })
        .eq('id', user?.id);

      alert('Property boosted successfully!');
      loadProperties();
      loadCredits();
    } catch (error) {
      console.error('Error boosting property:', error);
      alert('Failed to boost property');
    }
  };

  const handleToggleStatus = async (property: Property) => {
    const newStatus = property.status === 'active' ? 'inactive' : 'active';

    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: newStatus })
        .eq('id', property.id);

      if (error) throw error;

      loadProperties();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update property status');
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
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Property Management</h1>
          <p className="text-gray-600 mt-1">Manage your property listings and track performance</p>
        </div>
        <button
          onClick={handleAddProperty}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
        >
          <Plus className="w-5 h-5" />
          Add Property
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-2">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Properties</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalProperties}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Active Listings</p>
          <p className="text-2xl font-bold text-gray-900">{stats.activeListings}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Pending</p>
          <p className="text-2xl font-bold text-gray-900">{stats.pendingListings}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-2">
            <Eye className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Views</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalViews}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Home className="w-8 h-8" />
          </div>
          <p className="text-sm text-blue-100 mb-1">Listing Credits</p>
          <p className="text-2xl font-bold">{stats.listingCredits}</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-8 h-8" />
          </div>
          <p className="text-sm text-yellow-100 mb-1">Boost Credits</p>
          <p className="text-2xl font-bold">{stats.boostingCredits}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search properties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price_high">Price: High to Low</option>
              <option value="price_low">Price: Low to High</option>
              <option value="views">Most Viewed</option>
            </select>

            <button
              onClick={loadProperties}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {filteredProperties.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No properties found</h3>
              <p className="text-gray-600 mb-6">
                {properties.length === 0
                  ? "You haven't added any properties yet"
                  : 'Try adjusting your search or filters'}
              </p>
              {properties.length === 0 && (
                <button
                  onClick={handleAddProperty}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  Add Your First Property
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProperties.map((property) => (
                <div
                  key={property.id}
                  className="group border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-lg transition-all"
                >
                  <div className="flex gap-6">
                    <div className="w-48 h-36 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      {property.main_image_url ? (
                        <img
                          src={property.main_image_url}
                          alt={property.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Building2 className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900 truncate">
                              {property.title}
                            </h3>
                            {property.is_featured && (
                              <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                                <Star className="w-3 h-3 fill-current" />
                                Featured
                              </span>
                            )}
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(property.status)}`}>
                              {property.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="capitalize">{property.property_type}</span>
                            <span>•</span>
                            <span>{property.city}, {property.state}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {property.views_count || 0} views
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {property.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Price</p>
                          <p className="text-2xl font-bold text-blue-600">
                            RM {property.price.toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditProperty(property)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDuplicateProperty(property)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Duplicate"
                          >
                            <Copy className="w-5 h-5" />
                          </button>
                          {property.status === 'active' && !property.is_featured && (
                            <button
                              onClick={() => handleBoostProperty(property.id)}
                              className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                              title="Boost (Feature this property)"
                            >
                              <Zap className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleStatus(property)}
                            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                              property.status === 'active'
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                            title={property.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            {property.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(property.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
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

      {showEditModal && (
        <PropertyEditModal
          property={selectedProperty}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            loadProperties();
            loadCredits();
          }}
          agentId={user?.id || ''}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Delete Property?</h3>
              <p className="text-gray-600 mb-6">
                This action cannot be undone. This will permanently delete the property listing.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
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
        </div>
      )}
    </div>
  );
}
