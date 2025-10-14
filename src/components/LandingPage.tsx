import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Search, MapPin, Home, Building2, TrendingUp, Shield,
  CheckCircle, Users, Star, ArrowRight, Bed, Bath, Square
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

interface LandingPageProps {
  onShowAuth: () => void;
}

export function LandingPage({ onShowAuth }: LandingPageProps) {
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeaturedProperties();
  }, []);

  const loadFeaturedProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, price, city, state, bedrooms, bathrooms, sqft, property_type, listing_type')
        .eq('status', 'active')
        .eq('featured', true)
        .limit(6);

      if (error) throw error;
      setFeaturedProperties(data || []);
    } catch (err) {
      console.error('Error loading properties:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="bg-blue-600 rounded-lg p-2">
                <Home className="w-6 h-6 text-white" />
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900">Property AI</span>
            </div>
            <button
              onClick={onShowAuth}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-6">
              Find Your Dream Property in Malaysia
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Discover thousands of properties for sale and rent across Malaysia
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by location, property type, or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
              <button
                onClick={onShowAuth}
                className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
              >
                Search Properties
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Property AI?</h2>
            <p className="text-gray-600">Your trusted partner in property search</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-blue-100 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Verified Listings</h3>
              <p className="text-gray-600">
                All properties are verified by our team to ensure authenticity and quality
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-blue-100 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Trusted Agents</h3>
              <p className="text-gray-600">
                Connect with certified real estate agents with proven track records
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-blue-100 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Market Insights</h3>
              <p className="text-gray-600">
                Get real-time market data and insights to make informed decisions
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Featured Properties</h2>
              <p className="text-gray-600">Handpicked properties just for you</p>
            </div>
            <button
              onClick={onShowAuth}
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
            >
              View All
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading properties...</p>
            </div>
          ) : featuredProperties.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Home className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No featured properties available at the moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProperties.map((property) => (
                <div
                  key={property.id}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={onShowAuth}
                >
                  <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <Building2 className="w-16 h-16 text-gray-400" />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                        {property.listing_type === 'sale' ? 'For Sale' : 'For Rent'}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">{property.property_type}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                      {property.title}
                    </h3>
                    <div className="flex items-center text-gray-600 text-sm mb-3">
                      <MapPin className="w-4 h-4 mr-1" />
                      {property.city}, {property.state}
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <Bed className="w-4 h-4" />
                        {property.bedrooms}
                      </div>
                      <div className="flex items-center gap-1">
                        <Bath className="w-4 h-4" />
                        {property.bathrooms}
                      </div>
                      <div className="flex items-center gap-1">
                        <Square className="w-4 h-4" />
                        {property.sqft} sqft
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-2xl font-bold text-blue-600">
                        RM {property.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Find Your Perfect Property?</h2>
            <p className="text-xl text-blue-100 mb-8">
              Join thousands of satisfied homeowners and investors
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={onShowAuth}
                className="bg-white text-blue-600 px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                Get Started
              </button>
              <button
                onClick={onShowAuth}
                className="bg-blue-700 text-white px-8 py-3 rounded-lg hover:bg-blue-800 transition-colors font-medium border border-blue-500"
              >
                List Your Property
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="bg-blue-600 rounded-lg p-2">
                  <Home className="w-5 h-5 text-white" />
                </div>
                <span className="ml-2 text-lg font-bold text-white">Property AI</span>
              </div>
              <p className="text-sm">
                Your trusted partner in finding the perfect property in Malaysia
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={onShowAuth} className="hover:text-white">Browse Properties</button></li>
                <li><button onClick={onShowAuth} className="hover:text-white">List Property</button></li>
                <li><button onClick={onShowAuth} className="hover:text-white">Find Agents</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={onShowAuth} className="hover:text-white">Help Center</button></li>
                <li><button onClick={onShowAuth} className="hover:text-white">Contact Us</button></li>
                <li><button onClick={onShowAuth} className="hover:text-white">FAQ</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={onShowAuth} className="hover:text-white">About Us</button></li>
                <li><button onClick={onShowAuth} className="hover:text-white">Terms of Service</button></li>
                <li><button onClick={onShowAuth} className="hover:text-white">Privacy Policy</button></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2025 Property AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
