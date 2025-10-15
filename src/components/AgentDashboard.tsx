import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DashboardSkeleton } from './LoadingSkeleton';
import { PropertyEditModal } from './PropertyEditModal';
import { showNotification } from './Notification';
import {
  Home, Plus, Edit, Trash2, Eye, Search, RefreshCw, MapPin, Bed, Bath, Square,
  Building2, Star, Zap, CheckCircle, Clock, EyeOff, MoreVertical, Copy, Power,
  TrendingUp, Filter, X, ChevronRight, Package, CheckSquare, Square as SquareIcon,
  FileText, Layers
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
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_high' | 'price_low' | 'views'>('newest');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const [batchMode, setBatchMode] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());
  const [showBatchMenu, setShowBatchMenu] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateProperty, setTemplateProperty] = useState<Property | null>(null);

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
      loadAllProperties();
    }
  }, [user]);

  useEffect(() => {
    filterAndSortProperties();
  }, [properties, searchQuery, statusFilter, sortBy]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-menu') && !target.closest('.menu-button')) {
        setShowBatchMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadAllProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setAllProperties(data || []);
    } catch (error: any) {
      console.error('Error loading all properties:', error);
    }
  };

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
    loadAllProperties();
    showNotification('success', 'Data refreshed');
  };

  const handleAddProperty = () => {
    if (stats.listingCredits <= 0) {
      showNotification('warning', 'You need listing credits to create a property.');
      return;
    }
    setSelectedProperty(null);
    setTemplateProperty(null);
    setShowEditModal(true);
  };

  const handleAddFromTemplate = () => {
    setShowTemplateModal(true);
  };

  const handleSelectTemplate = (template: Property) => {
    if (stats.listingCredits <= 0) {
      showNotification('warning', 'You need listing credits to create a property.');
      return;
    }
    setTemplateProperty(template);
    setShowTemplateModal(false);
    setShowEditModal(true);
  };

  const handleEditProperty = (property: Property) => {
    console.log('Edit property clicked:', property);
    setSelectedProperty(property);
    setTemplateProperty(null);
    setShowEditModal(true);
    setActiveMenu(null);
    console.log('Edit modal should open now');
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

  const toggleBatchMode = () => {
    setBatchMode(!batchMode);
    setSelectedProperties(new Set());
    setShowBatchMenu(false);
  };

  const togglePropertySelection = (propertyId: string) => {
    const newSelection = new Set(selectedProperties);
    if (newSelection.has(propertyId)) {
      newSelection.delete(propertyId);
    } else {
      newSelection.add(propertyId);
    }
    setSelectedProperties(newSelection);
  };

  const selectAllProperties = () => {
    if (selectedProperties.size === filteredProperties.length) {
      setSelectedProperties(new Set());
    } else {
      setSelectedProperties(new Set(filteredProperties.map(p => p.id)));
    }
  };

  const handleBatchActivate = async () => {
    if (selectedProperties.size === 0) return;

    setActionLoading('batch');
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'active' })
        .in('id', Array.from(selectedProperties));

      if (error) throw error;

      showNotification('success', `${selectedProperties.size} properties activated`);
      loadProperties();
      setSelectedProperties(new Set());
      setShowBatchMenu(false);
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to activate properties');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBatchDeactivate = async () => {
    if (selectedProperties.size === 0) return;

    setActionLoading('batch');
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'inactive' })
        .in('id', Array.from(selectedProperties));

      if (error) throw error;

      showNotification('success', `${selectedProperties.size} properties deactivated`);
      loadProperties();
      setSelectedProperties(new Set());
      setShowBatchMenu(false);
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to deactivate properties');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBatchFeature = async () => {
    if (selectedProperties.size === 0) return;

    if (stats.boostingCredits < selectedProperties.size) {
      showNotification('warning', `You need ${selectedProperties.size} boosting credits to feature these properties.`);
      return;
    }

    setActionLoading('batch');
    try {
      const { error } = await supabase
        .from('properties')
        .update({ is_featured: true })
        .in('id', Array.from(selectedProperties));

      if (error) throw error;

      const { error: creditError } = await supabase
        .from('profiles')
        .update({ boosting_credits: stats.boostingCredits - selectedProperties.size })
        .eq('id', user?.id);

      if (creditError) throw creditError;

      showNotification('success', `${selectedProperties.size} properties featured`);
      loadProperties();
      setSelectedProperties(new Set());
      setShowBatchMenu(false);
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to feature properties');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedProperties.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedProperties.size} properties? This action cannot be undone.`)) {
      return;
    }

    setActionLoading('batch');
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .in('id', Array.from(selectedProperties));

      if (error) throw error;

      showNotification('success', `${selectedProperties.size} properties deleted`);
      loadProperties();
      setSelectedProperties(new Set());
      setShowBatchMenu(false);
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to delete properties');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50">
      <div className="max-w-[1800px] mx-auto">
        {/* Top Bar */}
        <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-40 shadow-sm">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  My Listings
                </h1>
                <p className="text-sm text-gray-600 mt-2 ml-13">
                  {stats.totalProperties} {stats.totalProperties === 1 ? 'property' : 'properties'}
                  {batchMode && selectedProperties.size > 0 && (
                    <span className="ml-2 text-blue-600 font-semibold">
                      • {selectedProperties.size} selected
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {batchMode && selectedProperties.size > 0 ? (
                  <>
                    <div className="relative">
                      <button
                        onClick={() => setShowBatchMenu(!showBatchMenu)}
                        className="menu-button px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl font-semibold inline-flex items-center gap-2"
                      >
                        <Package className="w-4 h-4" />
                        Batch Actions ({selectedProperties.size})
                      </button>

                      {showBatchMenu && (
                        <div className="dropdown-menu absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-10">
                          <button
                            onClick={handleBatchActivate}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Power className="w-4 h-4 text-green-600" />
                            Activate Selected
                          </button>
                          <button
                            onClick={handleBatchDeactivate}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <EyeOff className="w-4 h-4 text-gray-600" />
                            Deactivate Selected
                          </button>
                          <button
                            onClick={handleBatchFeature}
                            disabled={stats.boostingCredits < selectedProperties.size}
                            className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Zap className="w-4 h-4" />
                            Feature Selected
                          </button>
                          <div className="border-t border-gray-200 my-1"></div>
                          <button
                            onClick={handleBatchDelete}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Selected
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={toggleBatchMode}
                      className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-all font-medium inline-flex items-center gap-2 border border-gray-300"
                    >
                      <X className="w-4 h-4" />
                      <span className="hidden sm:inline">Cancel</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={toggleBatchMode}
                      className={`px-4 py-2.5 rounded-xl transition-all inline-flex items-center gap-2 font-medium border ${
                        batchMode
                          ? 'bg-blue-100 text-blue-700 border-blue-300'
                          : 'text-gray-700 hover:bg-gray-100 border-gray-300'
                      }`}
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span className="hidden sm:inline">Batch</span>
                    </button>
                    <button
                      onClick={handleRefresh}
                      className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-all inline-flex items-center gap-2 border border-gray-300 font-medium"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span className="hidden sm:inline">Refresh</span>
                    </button>
                    <button
                      onClick={handleAddFromTemplate}
                      className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-all inline-flex items-center gap-2 border border-gray-300 font-medium"
                    >
                      <Layers className="w-4 h-4" />
                      <span className="hidden sm:inline">Template</span>
                    </button>
                    <button
                      onClick={handleAddProperty}
                      disabled={stats.listingCredits <= 0}
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl font-semibold inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Add Listing</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 p-6">
          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-3 space-y-5">
            {/* Stats Cards */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xs font-bold text-gray-500 mb-5 uppercase tracking-wider flex items-center gap-2">
                <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                Overview
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl hover:bg-green-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Active</p>
                      <p className="text-xl font-bold text-gray-900">{stats.activeListings}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl hover:bg-yellow-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Pending</p>
                      <p className="text-xl font-bold text-gray-900">{stats.pendingListings}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                      <EyeOff className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Inactive</p>
                      <p className="text-xl font-bold text-gray-900">{stats.inactiveListings}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl hover:bg-orange-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                      <Star className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Featured</p>
                      <p className="text-xl font-bold text-gray-900">{stats.featuredCount}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 mt-4 border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                      <Eye className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-blue-700">Total Views</p>
                      <p className="text-xl font-bold text-blue-900">{stats.totalViews.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Credits */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xs font-bold text-gray-500 mb-5 uppercase tracking-wider flex items-center gap-2">
                <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                Credits
              </h3>
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-blue-100 font-semibold">Listing Credits</p>
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-white mb-1">{stats.listingCredits}</p>
                  <p className="text-xs text-blue-100">Available for new listings</p>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-orange-100 font-semibold">Boost Credits</p>
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-white mb-1">{stats.boostingCredits}</p>
                  <p className="text-xs text-orange-100">Feature your properties</p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xs font-bold text-gray-500 mb-5 uppercase tracking-wider flex items-center gap-2">
                <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                Filters
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2.5 uppercase tracking-wide">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-300 bg-gray-50"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2.5 uppercase tracking-wide">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-300 bg-gray-50"
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
            <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
              <div className="flex items-center gap-3">
                {batchMode && (
                  <button
                    onClick={selectAllProperties}
                    className="p-2.5 hover:bg-blue-50 rounded-xl transition-all border border-gray-200"
                  >
                    {selectedProperties.size === filteredProperties.length ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <SquareIcon className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                )}
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, location, or property type..."
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-gray-900 placeholder-gray-400 bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Properties Grid */}
            {filteredProperties.length === 0 ? (
              <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-20 text-center shadow-sm">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
                  <Building2 className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProperties.map((property) => (
                  <div
                    key={property.id}
                    onClick={() => !batchMode && handleEditProperty(property)}
                    className={`bg-white rounded-2xl border-2 overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer group ${
                      selectedProperties.has(property.id) ? 'border-blue-500 ring-4 ring-blue-200 shadow-xl' : 'border-gray-200 hover:border-blue-400 shadow-sm hover:-translate-y-1'
                    }`}
                  >
                    {/* Image */}
                    <div className="relative h-56 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 overflow-hidden">
                      {property.main_image_url ? (
                        <img
                          src={property.main_image_url}
                          alt={property.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-16 h-16 rounded-2xl bg-white/80 flex items-center justify-center">
                            <Building2 className="w-10 h-10 text-gray-400" />
                          </div>
                        </div>
                      )}

                      {/* Batch Select Checkbox */}
                      {batchMode && (
                        <div className="absolute top-4 left-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePropertySelection(property.id);
                            }}
                            className="w-9 h-9 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg flex items-center justify-center hover:bg-white transition-all border-2 border-gray-200"
                          >
                            {selectedProperties.has(property.id) ? (
                              <CheckSquare className="w-5 h-5 text-blue-600" />
                            ) : (
                              <SquareIcon className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className={`absolute ${batchMode ? 'top-4 right-4' : 'top-4 left-4'}`}>
                        {property.status === 'active' && (
                          <span className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-bold rounded-full shadow-lg backdrop-blur-sm">
                            Active
                          </span>
                        )}
                        {property.status === 'pending' && (
                          <span className="px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white text-xs font-bold rounded-full shadow-lg backdrop-blur-sm">
                            Pending
                          </span>
                        )}
                        {property.status === 'inactive' && (
                          <span className="px-3 py-1.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white text-xs font-bold rounded-full shadow-lg backdrop-blur-sm">
                            Inactive
                          </span>
                        )}
                      </div>

                      {/* Featured Badge */}
                      {property.is_featured && !batchMode && (
                        <div className="absolute top-4 right-4">
                          <span className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-bold rounded-full shadow-lg backdrop-blur-sm flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            Featured
                          </span>
                        </div>
                      )}

                    </div>

                    {/* Content */}
                    <div className="p-5">
                      {/* Price - Top Priority */}
                      <div className="mb-4">
                        <p className="text-2xl font-bold text-gray-900">
                          RM {property.price.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600 font-medium">
                          RM {(property.price / property.sqft).toFixed(0)}/sqft
                        </p>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-gray-900 mb-3 line-clamp-2 leading-snug">
                        {property.title}
                      </h3>

                      {/* Location */}
                      <div className="flex items-center text-sm text-gray-600 mb-4">
                        <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0 text-blue-600" />
                        <span className="line-clamp-1 font-medium">{property.city}, {property.state}</span>
                      </div>

                      {/* Property Details */}
                      <div className="flex items-center gap-5 text-sm text-gray-700 pb-4 border-b-2 border-gray-100">
                        <div className="flex items-center gap-1.5">
                          <Bed className="w-4 h-4 text-gray-500" />
                          <span className="font-semibold">{property.bedrooms}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Bath className="w-4 h-4 text-gray-500" />
                          <span className="font-semibold">{property.bathrooms}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Square className="w-4 h-4 text-gray-500" />
                          <span className="font-semibold">{property.sqft.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="flex items-center justify-between pt-4">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2.5 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-bold">{property.property_type}</span>
                          <span className="px-2.5 py-1.5 bg-blue-100 text-blue-700 rounded-lg font-bold">{property.listing_type}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Eye className="w-4 h-4" />
                          <span className="font-semibold">{property.views_count || 0}</span>
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
          templateProperty={templateProperty}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProperty(null);
            setTemplateProperty(null);
          }}
          onSave={() => {
            loadProperties();
            setShowEditModal(false);
            setSelectedProperty(null);
            setTemplateProperty(null);
          }}
          onDelete={() => {
            loadProperties();
            setShowEditModal(false);
            setSelectedProperty(null);
          }}
          agentId={user?.id || ''}
        />
      )}

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Select Template Property</h3>
                  <p className="text-sm text-gray-500 mt-1">Copy details from an existing property</p>
                </div>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allProperties.map((property) => (
                  <button
                    key={property.id}
                    onClick={() => handleSelectTemplate(property)}
                    className="bg-white border-2 border-gray-200 hover:border-blue-500 rounded-lg p-4 text-left transition-all group"
                  >
                    <div className="flex gap-3">
                      {property.main_image_url ? (
                        <img
                          src={property.main_image_url}
                          alt={property.title}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-1 line-clamp-1">{property.title}</h4>
                        <p className="text-sm text-gray-500 mb-2">
                          {property.city}, {property.state}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <Bed className="w-3 h-3" />
                            {property.bedrooms}
                          </span>
                          <span className="flex items-center gap-1">
                            <Bath className="w-3 h-3" />
                            {property.bathrooms}
                          </span>
                          <span className="flex items-center gap-1">
                            <Square className="w-3 h-3" />
                            {property.sqft}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-gray-900 mt-2">
                          RM {property.price.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {allProperties.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No template properties available</p>
                </div>
              )}
            </div>
          </div>
        </div>
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
