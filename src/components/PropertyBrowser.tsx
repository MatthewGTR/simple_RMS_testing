import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Search, Filter, MapPin, Home, Bed, Bath, Square, Heart, X,
  Building2, DollarSign, ArrowLeft, Phone, Mail, User, ChevronDown,
  Star, TrendingUp, Award, CheckCircle
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
  country: string;
  amenities: string[];
  furnished: string | null;
  status: string;
  views_count: number;
  agent_id: string;
  profiles?: {
    full_name: string;
    email: string;
    phone: string;
  };
}

interface PropertyBrowserProps {
  section: 'buy' | 'rent' | 'sell' | 'new-development';
  onBack: () => void;
  onShowAuth: (mode?: 'signin' | 'role-selection') => void;
}

export function PropertyBrowser({ section, onBack, onShowAuth }: PropertyBrowserProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const [filters, setFilters] = useState({
    propertyType: 'all',
    priceMin: '',
    priceMax: '',
    bedrooms: 'any',
    state: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadProperties();
  }, [section]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('properties')
        .select(`
          *,
          profiles:agent_id (
            full_name,
            email,
            phone
          )
        `)
        .eq('status', 'active');

      if (section === 'buy') {
        query = query.eq('listing_type', 'sale');
      } else if (section === 'rent') {
        query = query.eq('listing_type', 'rent');
      }

      const { data, error } = await query;

      if (error) throw error;

      // Sort to show featured and premium properties first
      const sortedData = (data || []).sort((a, b) => {
        if (a.is_premium && !b.is_premium) return -1;
        if (!a.is_premium && b.is_premium) return 1;
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setProperties(sortedData);
    } catch (err) {
      console.error('Error loading properties:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = properties.filter(p => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.state.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filters.propertyType === 'all' || p.property_type === filters.propertyType;
    const matchesBedrooms = filters.bedrooms === 'any' || p.bedrooms >= parseInt(filters.bedrooms);
    const matchesState = filters.state === 'all' || p.state === filters.state;

    let matchesPrice = true;
    if (filters.priceMin) {
      matchesPrice = matchesPrice && p.price >= parseInt(filters.priceMin);
    }
    if (filters.priceMax) {
      matchesPrice = matchesPrice && p.price <= parseInt(filters.priceMax);
    }

    return matchesSearch && matchesType && matchesBedrooms && matchesState && matchesPrice;
  });

  const getSectionTitle = () => {
    switch(section) {
      case 'buy': return 'Properties For Sale';
      case 'rent': return 'Properties For Rent';
      case 'sell': return 'List Your Property';
      case 'new-development': return 'New Developments';
      default: return 'Browse Properties';
    }
  };

  const getSectionDescription = () => {
    switch(section) {
      case 'buy': return 'Find your dream home from our curated listings';
      case 'rent': return 'Discover rental properties across Malaysia';
      case 'sell': return 'List your property and reach thousands of buyers';
      case 'new-development': return 'Explore new development projects';
      default: return 'Explore our property listings';
    }
  };

  if (section === 'sell') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
        <div className="sticky top-0 bg-white shadow-sm z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">List Your Property</h1>
            <p className="text-xl text-gray-600">Reach thousands of potential buyers on Property AI</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">1M+ Visitors</h3>
              <p className="text-gray-600">Monthly active users searching for properties</p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Fast Sales</h3>
              <p className="text-gray-600">Average listing gets 5+ inquiries per week</p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Verified</h3>
              <p className="text-gray-600">All listings are verified for quality</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Get Started Today</h2>
            <p className="text-gray-600 mb-8">
              Register as an agent to start listing your properties. Our team will verify your account within 24 hours.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">1</div>
                <p className="text-gray-900 font-medium">Register as an Agent</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">2</div>
                <p className="text-gray-900 font-medium">Get Verified by Our Team</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">3</div>
                <p className="text-gray-900 font-medium">Start Listing Properties</p>
              </div>
            </div>
            <button
              onClick={() => onShowAuth('role-selection')}
              className="w-full mt-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg transition-all font-bold text-lg"
            >
              Register as Agent
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 bg-white shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors font-medium mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>

          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{getSectionTitle()}</h1>
              <p className="text-gray-600 mt-1">{getSectionDescription()}</p>
            </div>
            <div className="hidden md:block text-right">
              <p className="text-sm text-gray-600">Showing</p>
              <p className="text-2xl font-bold text-blue-600">{filteredProperties.length}</p>
              <p className="text-sm text-gray-600">Properties</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by location, property name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
            >
              <Filter className="w-5 h-5" />
              Filters
              <ChevronDown className={`w-5 h-5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 p-6 bg-white rounded-xl border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
                  <select
                    value={filters.propertyType}
                    onChange={(e) => setFilters({...filters, propertyType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="house">House</option>
                    <option value="apartment">Apartment</option>
                    <option value="condo">Condo</option>
                    <option value="villa">Villa</option>
                    <option value="studio">Studio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Price (RM)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={filters.priceMin}
                    onChange={(e) => setFilters({...filters, priceMin: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Price (RM)</label>
                  <input
                    type="number"
                    placeholder="Any"
                    value={filters.priceMax}
                    onChange={(e) => setFilters({...filters, priceMax: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
                  <select
                    value={filters.bedrooms}
                    onChange={(e) => setFilters({...filters, bedrooms: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="any">Any</option>
                    <option value="1">1+</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                    <option value="4">4+</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <select
                    value={filters.state}
                    onChange={(e) => setFilters({...filters, state: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All States</option>
                    <option value="Kuala Lumpur">Kuala Lumpur</option>
                    <option value="Selangor">Selangor</option>
                    <option value="Penang">Penang</option>
                    <option value="Johor">Johor</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium text-lg">Loading properties...</p>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
            <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Properties Found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <div
                key={property.id}
                onClick={() => setSelectedProperty(property)}
                className="group bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100"
              >
                <div className="relative h-56 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden">
                  <Building2 className="w-20 h-20 text-gray-400 group-hover:scale-110 transition-transform" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowAuth('signin');
                    }}
                    className="absolute top-4 right-4 p-2.5 bg-white rounded-full hover:bg-red-50 transition-colors shadow-lg"
                  >
                    <Heart className="w-5 h-5 text-gray-600" />
                  </button>
                  <div className="absolute top-4 left-4">
                    <span className="px-4 py-1.5 bg-blue-600 text-white text-sm font-bold rounded-full shadow-lg capitalize">
                      For {property.listing_type}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-600 capitalize">{property.property_type}</span>
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-semibold text-gray-900">4.8</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {property.title}
                  </h3>
                  <div className="flex items-center text-gray-600 mb-4">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span className="text-sm">{property.city}, {property.state}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600 mb-5 pb-5 border-b">
                    <div className="flex items-center gap-1.5">
                      <Bed className="w-5 h-5" />
                      <span className="font-medium">{property.bedrooms}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Bath className="w-5 h-5" />
                      <span className="font-medium">{property.bathrooms}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Square className="w-5 h-5" />
                      <span className="font-medium">{property.sqft}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Starting from</p>
                      <p className="text-2xl font-bold text-blue-600">
                        RM {property.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedProperty && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-gray-900">Property Details</h2>
              <button
                onClick={() => setSelectedProperty(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="relative h-96 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center mb-6">
                <Building2 className="w-32 h-32 text-gray-400" />
              </div>

              <div className="mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold text-gray-900 mb-2">{selectedProperty.title}</h3>
                    <div className="flex items-center text-gray-600 mb-4">
                      <MapPin className="w-5 h-5 mr-2" />
                      {selectedProperty.address}, {selectedProperty.city}, {selectedProperty.state}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">Price</p>
                    <p className="text-4xl font-bold text-blue-600">
                      RM {selectedProperty.price.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <Bed className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{selectedProperty.bedrooms}</p>
                    <p className="text-sm text-gray-600">Bedrooms</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <Bath className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{selectedProperty.bathrooms}</p>
                    <p className="text-sm text-gray-600">Bathrooms</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <Square className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{selectedProperty.sqft}</p>
                    <p className="text-sm text-gray-600">Sqft</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <Home className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-gray-900 capitalize">{selectedProperty.property_type}</p>
                    <p className="text-sm text-gray-600">Type</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-bold text-gray-900 text-lg mb-3">Description</h4>
                  <p className="text-gray-700 leading-relaxed">{selectedProperty.description}</p>
                </div>

                {selectedProperty.amenities && selectedProperty.amenities.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-bold text-gray-900 text-lg mb-3">Amenities</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProperty.amenities.map((amenity, idx) => (
                        <span key={idx} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6">
                  <h4 className="font-bold text-gray-900 text-lg mb-4">Agent Information</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-600 rounded-full p-3">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Agent Name</p>
                        <p className="font-semibold text-gray-900">{selectedProperty.profiles?.full_name || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-600 rounded-full p-3">
                        <Mail className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-semibold text-gray-900">{selectedProperty.profiles?.email || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-600 rounded-full p-3">
                        <Phone className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-semibold text-gray-900">{selectedProperty.profiles?.phone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onShowAuth('signin')}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg transition-all font-bold text-lg"
              >
                Contact Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
