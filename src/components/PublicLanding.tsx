import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Search, MapPin, Home, Building2, TrendingUp, Shield, Users,
  ArrowRight, Bed, Bath, Square, ChevronDown, Menu, X, Phone, Mail,
  Star, CheckCircle, Sparkles, Award, Clock, Heart
} from 'lucide-react';

interface Property {
  id: string;
  title: string;
  price: number;
  city: string;
  state: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  property_type: string;
  listing_type: string;
}

interface PublicLandingProps {
  onShowAuth: (mode?: 'signin' | 'role-selection') => void;
  onNavigate: (section: 'buy' | 'rent' | 'sell' | 'new-development') => void;
}

export function PublicLanding({ onShowAuth, onNavigate }: PublicLandingProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('buy');
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadFeaturedProperties();
  }, []);

  const loadFeaturedProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, price, city, state, bedrooms, bathrooms, sqft, property_type, listing_type, is_featured, is_premium, main_image_url')
        .eq('status', 'active')
        .or('is_featured.eq.true,is_premium.eq.true')
        .limit(6);

      if (error) throw error;
      setProperties(data || []);
    } catch (err) {
      console.error('Error loading properties:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchType === 'buy') {
      onNavigate('buy');
    } else if (searchType === 'rent') {
      onNavigate('rent');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-2.5 shadow-lg">
                <Home className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Property AI</h1>
                <p className="text-xs text-gray-600">Malaysia's Smart Property Portal</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => onNavigate('buy')}
                className="px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all font-medium"
              >
                Buy
              </button>
              <button
                onClick={() => onNavigate('rent')}
                className="px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all font-medium"
              >
                Rent
              </button>
              <button
                onClick={() => onNavigate('sell')}
                className="px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all font-medium"
              >
                Sell
              </button>
              <button
                onClick={() => onNavigate('new-development')}
                className="px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all font-medium"
              >
                New Development
              </button>
              <div className="w-px h-8 bg-gray-300 mx-2"></div>
              <button
                onClick={() => onShowAuth('signin')}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
              >
                Login / Register
              </button>
            </nav>

            <button
              className="md:hidden p-2 text-gray-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="px-4 py-4 space-y-2">
              <button
                onClick={() => { onNavigate('buy'); setMobileMenuOpen(false); }}
                className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 rounded-lg font-medium"
              >
                Buy
              </button>
              <button
                onClick={() => { onNavigate('rent'); setMobileMenuOpen(false); }}
                className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 rounded-lg font-medium"
              >
                Rent
              </button>
              <button
                onClick={() => { onNavigate('sell'); setMobileMenuOpen(false); }}
                className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 rounded-lg font-medium"
              >
                Sell
              </button>
              <button
                onClick={() => { onNavigate('new-development'); setMobileMenuOpen(false); }}
                className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 rounded-lg font-medium"
              >
                New Development
              </button>
              <div className="h-px bg-gray-200 my-2"></div>
              <button
                onClick={() => { onShowAuth('signin'); setMobileMenuOpen(false); }}
                className="block w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold"
              >
                Login / Register
              </button>
            </div>
          </div>
        )}
      </header>

      <section className="relative pt-32 pb-20 bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-6">
              <Sparkles className="w-4 h-4" />
              Malaysia's #1 Property Platform
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Find Your Dream Home<br />
              <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                In Malaysia
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
              Discover thousands of verified properties from trusted agents. Your perfect home is just a click away.
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setSearchType('buy')}
                  className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
                    searchType === 'buy'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setSearchType('rent')}
                  className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
                    searchType === 'rent'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Rent
                </button>
                <button
                  onClick={() => setSearchType('new-dev')}
                  className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
                    searchType === 'new-dev'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  New Development
                </button>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by location, property name, or keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-14 pr-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-xl transition-all font-semibold text-lg"
                >
                  Search
                </button>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <span className="text-sm text-gray-600">Popular:</span>
                {['Kuala Lumpur', 'Penang', 'Johor Bahru', 'Selangor'].map((city) => (
                  <button
                    key={city}
                    onClick={() => { setSearchQuery(city); handleSearch(); }}
                    className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-colors"
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose Property AI?</h2>
            <p className="text-xl text-gray-600">Your trusted partner in property search</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center group animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Verified Listings</h3>
              <p className="text-gray-600">
                All properties verified by our team for authenticity and quality
              </p>
            </div>

            <div className="text-center group animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="bg-gradient-to-br from-green-500 to-green-600 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Trusted Agents</h3>
              <p className="text-gray-600">
                Connect with certified agents with proven track records
              </p>
            </div>

            <div className="text-center group animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <TrendingUp className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Market Insights</h3>
              <p className="text-gray-600">
                Real-time market data and insights for informed decisions
              </p>
            </div>

            <div className="text-center group animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <Clock className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">24/7 Support</h3>
              <p className="text-gray-600">
                Round-the-clock customer support for all your queries
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-2">Featured Properties</h2>
              <p className="text-xl text-gray-600">Handpicked properties just for you</p>
            </div>
            <button
              onClick={() => onNavigate('buy')}
              className="hidden md:flex items-center gap-2 px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all font-semibold"
            >
              View All
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading properties...</p>
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
              <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No featured properties available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {properties.map((property) => (
                <div
                  key={property.id}
                  onClick={() => onShowAuth('signin')}
                  className="group bg-white rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-100"
                >
                  <div className="relative h-56 overflow-hidden">
                    {property.main_image_url ? (
                      <img
                        src={property.main_image_url}
                        alt={property.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                        <Building2 className="w-20 h-20 text-gray-400 group-hover:scale-110 transition-transform" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <button className="absolute top-4 right-4 p-2.5 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-lg transform hover:scale-110">
                      <Heart className="w-5 h-5 text-gray-600 hover:text-red-500 transition-colors" />
                    </button>
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className="px-4 py-1.5 bg-blue-600/90 backdrop-blur-sm text-white text-sm font-bold rounded-full shadow-lg">
                        {property.listing_type === 'sale' ? 'For Sale' : 'For Rent'}
                      </span>
                      {property.is_featured && (
                        <span className="px-4 py-1.5 bg-yellow-500/90 backdrop-blur-sm text-white text-sm font-bold rounded-full shadow-lg flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" />
                          Featured
                        </span>
                      )}
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
                        <span className="font-medium">{property.sqft} sqft</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Starting from</p>
                        <p className="text-2xl font-bold text-blue-600">
                          RM {property.price.toLocaleString()}
                        </p>
                      </div>
                      <button className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Are You a Property Agent?
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Join thousands of successful agents on Property AI. List your properties and connect with serious buyers instantly.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span className="text-lg">Reach millions of potential buyers</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span className="text-lg">Advanced analytics and insights</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span className="text-lg">Easy property management tools</span>
                </li>
              </ul>
              <p className="text-blue-100 text-lg">
                Ready to get started? Click "Login / Register" in the header to create your agent account.
              </p>
            </div>
            <div className="relative">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <Award className="w-20 h-20 text-yellow-400 mb-6" />
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 rounded-full p-3">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="font-bold text-2xl">10,000+</p>
                      <p className="text-blue-100">Active Agents</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 rounded-full p-3">
                      <Home className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="font-bold text-2xl">50,000+</p>
                      <p className="text-blue-100">Properties Listed</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 rounded-full p-3">
                      <Users className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="font-bold text-2xl">1M+</p>
                      <p className="text-blue-100">Monthly Visitors</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-600 rounded-xl p-2">
                  <Home className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Property AI</span>
              </div>
              <p className="text-sm mb-4">
                Malaysia's leading property platform connecting buyers, sellers, and agents.
              </p>
              <div className="flex gap-3">
                <button className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                  <Mail className="w-5 h-5" />
                </button>
                <button className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                  <Phone className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Quick Links</h4>
              <ul className="space-y-3 text-sm">
                <li><button onClick={() => onNavigate('buy')} className="hover:text-white transition-colors">Buy Property</button></li>
                <li><button onClick={() => onNavigate('rent')} className="hover:text-white transition-colors">Rent Property</button></li>
                <li><button onClick={() => onNavigate('sell')} className="hover:text-white transition-colors">List Property</button></li>
                <li><button onClick={() => onNavigate('new-development')} className="hover:text-white transition-colors">New Developments</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">For Agents</h4>
              <ul className="space-y-3 text-sm">
                <li><span className="text-gray-400">Agent Features</span></li>
                <li><span className="text-gray-400">Pricing</span></li>
                <li><span className="text-gray-400">Resources</span></li>
                <li><span className="text-gray-400">Support</span></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Company</h4>
              <ul className="space-y-3 text-sm">
                <li><button className="hover:text-white transition-colors">About Us</button></li>
                <li><button className="hover:text-white transition-colors">Contact</button></li>
                <li><button className="hover:text-white transition-colors">Careers</button></li>
                <li><button className="hover:text-white transition-colors">Blog</button></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-sm">&copy; 2025 Property AI. All rights reserved. Made with ❤️ in Malaysia</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
