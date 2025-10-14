import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Trash2, Plus, MapPin, DollarSign, Home, Bed, Bath, Square, FileText, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showNotification } from './Notification';

interface Property {
  id?: string;
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
  status?: string;
  land_area_sqft?: number;
  car_parks?: number;
  floor_level?: string;
  tenure_type?: string;
  build_year?: number;
  occupancy_status?: string;
  facing_direction?: string;
  unit_number?: string;
  lot_number?: string;
  psf_price?: number;
  virtual_tour_url?: string;
  youtube_url?: string;
  facilities?: string;
  furnished?: string;
}

interface PropertyEditModalProps {
  property?: Property | null;
  templateProperty?: Property | null;
  onClose: () => void;
  onSave: () => void;
  agentId: string;
}

interface Suggestion {
  value: string;
  count: number;
  avgPrice?: number;
}

export function PropertyEditModal({ property, templateProperty, onClose, onSave, agentId }: PropertyEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'details' | 'property_info' | 'location' | 'media'>('basic');
  const [allProperties, setAllProperties] = useState<Property[]>([]);

  const [suggestions, setSuggestions] = useState<{
    cities: Suggestion[];
    addresses: Suggestion[];
    facilities: Suggestion[];
    descriptions: string[];
  }>({
    cities: [],
    addresses: [],
    facilities: [],
    descriptions: []
  });

  const [showSuggestions, setShowSuggestions] = useState({
    city: false,
    address: false,
    facilities: false
  });

  const cityInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Property>({
    title: '',
    description: '',
    property_type: 'condo',
    listing_type: 'sale',
    price: 0,
    bedrooms: 1,
    bathrooms: 1,
    sqft: 0,
    address: '',
    city: '',
    state: 'Selangor',
    postal_code: '',
    main_image_url: '',
    image_urls: [],
    amenities: [],
    status: 'draft',
    land_area_sqft: 0,
    car_parks: 0,
    floor_level: '',
    tenure_type: 'freehold',
    build_year: new Date().getFullYear(),
    occupancy_status: 'ready',
    facing_direction: '',
    unit_number: '',
    lot_number: '',
    virtual_tour_url: '',
    youtube_url: '',
    facilities: '',
    furnished: 'unfurnished'
  });

  const [imageUrlInput, setImageUrlInput] = useState('');
  const [amenityInput, setAmenityInput] = useState('');

  useEffect(() => {
    loadAllProperties();
  }, []);

  useEffect(() => {
    if (property) {
      setFormData({
        ...property,
        amenities: property.amenities || [],
        image_urls: property.image_urls || [],
        status: property.status || 'draft'
      });
    } else if (templateProperty) {
      const { id, created_at, updated_at, agent_id, views_count, is_featured, is_premium, ...templateData } = templateProperty as any;
      setFormData({
        ...templateData,
        title: '',
        price: 0,
        status: 'draft',
        amenities: templateData.amenities || [],
        image_urls: [],
        main_image_url: ''
      });
    }
  }, [property, templateProperty]);

  useEffect(() => {
    if (allProperties.length > 0) {
      generateSuggestions();
    }
  }, [allProperties, formData.property_type, formData.city, formData.state]);

  const loadAllProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setAllProperties(data || []);
    } catch (error: any) {
      console.error('Error loading properties:', error);
    }
  };

  const generateSuggestions = () => {
    const cityMap = new Map<string, { count: number; totalPrice: number }>();
    const addressMap = new Map<string, number>();
    const facilitiesSet = new Set<string>();
    const descriptionsArray: string[] = [];

    allProperties.forEach(prop => {
      if (prop.property_type === formData.property_type || !formData.property_type) {
        if (prop.city) {
          const existing = cityMap.get(prop.city) || { count: 0, totalPrice: 0 };
          cityMap.set(prop.city, {
            count: existing.count + 1,
            totalPrice: existing.totalPrice + (prop.price || 0)
          });
        }

        if (prop.city === formData.city && prop.address) {
          const addr = prop.address;
          addressMap.set(addr, (addressMap.get(addr) || 0) + 1);
        }

        if (prop.facilities) {
          prop.facilities.split(',').forEach(f => facilitiesSet.add(f.trim()));
        }

        if (prop.description && prop.description.length > 50) {
          descriptionsArray.push(prop.description);
        }
      }
    });

    const citySuggestions = Array.from(cityMap.entries())
      .map(([city, data]) => ({
        value: city,
        count: data.count,
        avgPrice: Math.round(data.totalPrice / data.count)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const addressSuggestions = Array.from(addressMap.entries())
      .map(([address, count]) => ({ value: address, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const facilitiesSuggestions = Array.from(facilitiesSet)
      .map(f => ({ value: f, count: 1 }))
      .slice(0, 20);

    setSuggestions({
      cities: citySuggestions,
      addresses: addressSuggestions,
      facilities: facilitiesSuggestions,
      descriptions: descriptionsArray.slice(0, 5)
    });
  };

  const propertyTypes = [
    'condo', 'apartment', 'house', 'villa', 'studio', 'shophouse'
  ];

  const malaysianStates = [
    'Johor', 'Kedah', 'Kelantan', 'Malacca', 'Negeri Sembilan',
    'Pahang', 'Penang', 'Perak', 'Perlis', 'Sabah', 'Sarawak',
    'Selangor', 'Terengganu', 'Kuala Lumpur', 'Labuan', 'Putrajaya'
  ];

  const commonAmenities = [
    'Swimming Pool', 'Gym', 'Parking', 'Security', '24/7 Concierge',
    'Playground', 'BBQ Area', 'Tennis Court', 'Sauna', 'Mini Market',
    'Covered Parking', 'Elevator', 'Clubhouse', 'Jogging Track'
  ];

  const handleChange = (field: keyof Property, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCitySelect = (city: string) => {
    setFormData(prev => ({ ...prev, city }));
    setShowSuggestions(prev => ({ ...prev, city: false }));

    const stateCityMap: Record<string, string> = {
      'Kuala Lumpur': 'Kuala Lumpur',
      'Petaling Jaya': 'Selangor',
      'Subang Jaya': 'Selangor',
      'Shah Alam': 'Selangor',
      'Cyberjaya': 'Selangor',
      'Puchong': 'Selangor',
      'Setia Alam': 'Selangor',
      'Johor Bahru': 'Johor',
      'George Town': 'Penang'
    };

    if (stateCityMap[city]) {
      setFormData(prev => ({ ...prev, state: stateCityMap[city] }));
    }
  };

  const handleAddressSelect = (address: string) => {
    setFormData(prev => ({ ...prev, address }));
    setShowSuggestions(prev => ({ ...prev, address: false }));
  };

  const applySmartDefaults = (propertyType: string) => {
    const similarProps = allProperties.filter(p => p.property_type === propertyType);

    if (similarProps.length > 0) {
      const avgBedrooms = Math.round(
        similarProps.reduce((sum, p) => sum + p.bedrooms, 0) / similarProps.length
      );
      const avgBathrooms = Math.round(
        similarProps.reduce((sum, p) => sum + p.bathrooms, 0) / similarProps.length
      );
      const avgSqft = Math.round(
        similarProps.reduce((sum, p) => sum + p.sqft, 0) / similarProps.length
      );
      const avgCarParks = Math.round(
        similarProps.reduce((sum, p) => sum + (p.car_parks || 0), 0) / similarProps.length
      );

      const commonAmenities = similarProps
        .flatMap(p => p.amenities || [])
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 5);

      setFormData(prev => ({
        ...prev,
        bedrooms: avgBedrooms || prev.bedrooms,
        bathrooms: avgBathrooms || prev.bathrooms,
        sqft: avgSqft || prev.sqft,
        car_parks: avgCarParks || prev.car_parks,
        amenities: commonAmenities.length > 0 ? commonAmenities : prev.amenities
      }));

      showNotification('success', `Applied smart defaults for ${propertyType}`);
    }
  };

  const handleAddImage = () => {
    if (imageUrlInput.trim()) {
      const newImages = [...(formData.image_urls || []), imageUrlInput.trim()];
      setFormData(prev => ({
        ...prev,
        image_urls: newImages,
        main_image_url: prev.main_image_url || imageUrlInput.trim()
      }));
      setImageUrlInput('');
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = formData.image_urls?.filter((_, i) => i !== index) || [];
    setFormData(prev => ({
      ...prev,
      image_urls: newImages,
      main_image_url: prev.main_image_url === formData.image_urls?.[index]
        ? (newImages[0] || '')
        : prev.main_image_url
    }));
  };

  const handleAddAmenity = (amenity: string) => {
    if (amenity && !formData.amenities?.includes(amenity)) {
      setFormData(prev => ({
        ...prev,
        amenities: [...(prev.amenities || []), amenity]
      }));
      setAmenityInput('');
    }
  };

  const handleRemoveAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities?.filter(a => a !== amenity) || []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.price || !formData.sqft) {
      showNotification('error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const propertyData = {
        ...formData,
        agent_id: agentId,
        price: Number(formData.price),
        sqft: Number(formData.sqft),
        bedrooms: Number(formData.bedrooms),
        bathrooms: Number(formData.bathrooms),
        car_parks: Number(formData.car_parks || 0),
        land_area_sqft: Number(formData.land_area_sqft || 0),
        build_year: Number(formData.build_year || new Date().getFullYear())
      };

      if (property?.id) {
        const { error } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', property.id);

        if (error) throw error;
        showNotification('success', 'Property updated successfully');
      } else {
        const { error } = await supabase
          .from('properties')
          .insert([propertyData]);

        if (error) throw error;
        showNotification('success', 'Property created successfully');
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving property:', error);
      showNotification('error', error.message || 'Failed to save property');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Home },
    { id: 'details', label: 'Property Details', icon: FileText },
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'media', label: 'Media', icon: Upload }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col my-8">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {property ? 'Edit Property' : 'Add New Property'}
            </h2>
            {!property && (
              <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Smart suggestions enabled
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="border-b border-gray-200 px-6 bg-gray-50">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6">
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Property Type *
                    </label>
                    <select
                      value={formData.property_type}
                      onChange={(e) => {
                        handleChange('property_type', e.target.value);
                        applySmartDefaults(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      {propertyTypes.map(type => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Listing Type *
                    </label>
                    <select
                      value={formData.listing_type}
                      onChange={(e) => handleChange('listing_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="sale">For Sale</option>
                      <option value="rent">For Rent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="e.g., Luxurious 3BR Condo with City View"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={4}
                    placeholder="Describe your property..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {suggestions.descriptions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Quick templates:</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.descriptions.slice(0, 2).map((desc, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleChange('description', desc)}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                          >
                            Use template {idx + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Bed className="w-4 h-4 inline mr-1" />
                      Bedrooms *
                    </label>
                    <input
                      type="number"
                      value={formData.bedrooms}
                      onChange={(e) => handleChange('bedrooms', parseInt(e.target.value))}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Bath className="w-4 h-4 inline mr-1" />
                      Bathrooms *
                    </label>
                    <input
                      type="number"
                      value={formData.bathrooms}
                      onChange={(e) => handleChange('bathrooms', parseInt(e.target.value))}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Square className="w-4 h-4 inline mr-1" />
                      Size (sqft) *
                    </label>
                    <input
                      type="number"
                      value={formData.sqft}
                      onChange={(e) => handleChange('sqft', parseInt(e.target.value))}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Price (RM) *
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleChange('price', parseFloat(e.target.value))}
                    min="0"
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  {formData.sqft > 0 && formData.price > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      RM {(formData.price / formData.sqft).toFixed(2)} per sqft
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Car Parks
                    </label>
                    <input
                      type="number"
                      value={formData.car_parks}
                      onChange={(e) => handleChange('car_parks', parseInt(e.target.value))}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tenure Type
                    </label>
                    <select
                      value={formData.tenure_type}
                      onChange={(e) => handleChange('tenure_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="freehold">Freehold</option>
                      <option value="leasehold_99">Leasehold 99 years</option>
                      <option value="leasehold_999">Leasehold 999 years</option>
                      <option value="leasehold_other">Leasehold Other</option>
                      <option value="malay_reserve">Malay Reserve</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Furnished
                    </label>
                    <select
                      value={formData.furnished}
                      onChange={(e) => handleChange('furnished', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="unfurnished">Unfurnished</option>
                      <option value="partially_furnished">Partially Furnished</option>
                      <option value="fully_furnished">Fully Furnished</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Build Year
                    </label>
                    <input
                      type="number"
                      value={formData.build_year}
                      onChange={(e) => handleChange('build_year', parseInt(e.target.value))}
                      min="1900"
                      max={new Date().getFullYear() + 5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amenities
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.amenities?.map((amenity) => (
                      <span
                        key={amenity}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2"
                      >
                        {amenity}
                        <button
                          type="button"
                          onClick={() => handleRemoveAmenity(amenity)}
                          className="hover:text-blue-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={amenityInput}
                      onChange={(e) => setAmenityInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAmenity(amenityInput))}
                      placeholder="Add amenity"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddAmenity(amenityInput)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {commonAmenities.map((amenity) => (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => handleAddAmenity(amenity)}
                        disabled={formData.amenities?.includes(amenity)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {amenity}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Facilities (comma-separated)
                  </label>
                  <textarea
                    value={formData.facilities}
                    onChange={(e) => handleChange('facilities', e.target.value)}
                    rows={3}
                    placeholder="e.g., Swimming Pool, Gymnasium, Sauna, BBQ Area"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {suggestions.facilities.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {suggestions.facilities.slice(0, 10).map((fac) => (
                        <button
                          key={fac.value}
                          type="button"
                          onClick={() => {
                            const current = formData.facilities || '';
                            const newValue = current ? `${current}, ${fac.value}` : fac.value;
                            handleChange('facilities', newValue);
                          }}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        >
                          + {fac.value}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'location' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <div className="relative">
                    <input
                      ref={addressInputRef}
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      onFocus={() => setShowSuggestions(prev => ({ ...prev, address: true }))}
                      placeholder="Street address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {showSuggestions.address && suggestions.addresses.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {suggestions.addresses.map((addr) => (
                          <button
                            key={addr.value}
                            type="button"
                            onClick={() => handleAddressSelect(addr.value)}
                            className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors"
                          >
                            <div className="font-medium text-gray-900">{addr.value}</div>
                            <div className="text-xs text-gray-500">{addr.count} properties</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <div className="relative">
                      <input
                        ref={cityInputRef}
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleChange('city', e.target.value)}
                        onFocus={() => setShowSuggestions(prev => ({ ...prev, city: true }))}
                        placeholder="City"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                      {showSuggestions.city && suggestions.cities.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {suggestions.cities.map((city) => (
                            <button
                              key={city.value}
                              type="button"
                              onClick={() => handleCitySelect(city.value)}
                              className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors"
                            >
                              <div className="font-medium text-gray-900">{city.value}</div>
                              <div className="text-xs text-gray-500">
                                {city.count} properties • Avg RM {city.avgPrice?.toLocaleString()}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State *
                    </label>
                    <select
                      value={formData.state}
                      onChange={(e) => handleChange('state', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      {malaysianStates.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) => handleChange('postal_code', e.target.value)}
                    placeholder="e.g., 50450"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {activeTab === 'media' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Images
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="url"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddImage())}
                      placeholder="Image URL"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={handleAddImage}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {formData.image_urls?.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Property ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {formData.main_image_url === url && (
                          <span className="absolute bottom-2 left-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">
                            Main
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : property ? 'Update Property' : 'Create Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
