import React, { useState, useEffect } from 'react';
import { X, Upload, Trash2, Plus, MapPin, DollarSign, Home, Bed, Bath, Square, FileText } from 'lucide-react';
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
}

interface PropertyEditModalProps {
  property?: Property | null;
  onClose: () => void;
  onSave: () => void;
  agentId: string;
}

export function PropertyEditModal({ property, onClose, onSave, agentId }: PropertyEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'details' | 'location' | 'images'>('basic');

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
    status: 'pending'
  });

  const [imageUrlInput, setImageUrlInput] = useState('');
  const [amenityInput, setAmenityInput] = useState('');

  useEffect(() => {
    if (property) {
      setFormData({
        ...property,
        amenities: property.amenities || [],
        image_urls: property.image_urls || [],
        status: property.status || 'pending'
      });
    }
  }, [property]);

  const propertyTypes = [
    'condo', 'apartment', 'house', 'villa', 'studio',
    'townhouse', 'penthouse', 'shophouse', 'land', 'commercial'
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

  const handleSetMainImage = (url: string) => {
    setFormData(prev => ({ ...prev, main_image_url: url }));
  };

  const handleAddAmenity = () => {
    if (amenityInput.trim() && !formData.amenities?.includes(amenityInput.trim())) {
      setFormData(prev => ({
        ...prev,
        amenities: [...(prev.amenities || []), amenityInput.trim()]
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

  const handleToggleAmenity = (amenity: string) => {
    if (formData.amenities?.includes(amenity)) {
      handleRemoveAmenity(amenity);
    } else {
      setFormData(prev => ({
        ...prev,
        amenities: [...(prev.amenities || []), amenity]
      }));
    }
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      showNotification('error', 'Property title is required');
      setActiveTab('basic');
      return false;
    }
    if (!formData.description.trim()) {
      showNotification('error', 'Property description is required');
      setActiveTab('basic');
      return false;
    }
    if (formData.price <= 0) {
      showNotification('error', 'Valid price is required');
      setActiveTab('basic');
      return false;
    }
    if (formData.sqft <= 0) {
      showNotification('error', 'Valid square footage is required');
      setActiveTab('details');
      return false;
    }
    if (!formData.address.trim() || !formData.city.trim()) {
      showNotification('error', 'Complete address is required');
      setActiveTab('location');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const propertyData = {
        ...formData,
        agent_id: agentId,
        views_count: property?.id ? undefined : 0
      };

      if (property?.id) {
        const { error } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', property.id);

        if (error) throw error;
        showNotification('success', 'Property updated successfully!');
      } else {
        const { error: insertError } = await supabase
          .from('properties')
          .insert([propertyData]);

        if (insertError) throw insertError;

        // Deduct listing credit for new property
        const { data: profileData } = await supabase
          .from('profiles')
          .select('listing_credits')
          .eq('id', agentId)
          .single();

        if (profileData && profileData.listing_credits > 0) {
          await supabase
            .from('profiles')
            .update({ listing_credits: profileData.listing_credits - 1 })
            .eq('id', agentId);
        }

        showNotification('success', 'Property created successfully! Pending admin approval.');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving property:', error);
      showNotification('error', error.message || 'Failed to save property');
    } finally {
      setLoading(false);
    }
  };

  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Property Title *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., Luxury 3BR Condo in KLCC"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Description *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={5}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Describe your property in detail..."
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Property Type *
          </label>
          <select
            value={formData.property_type}
            onChange={(e) => handleChange('property_type', e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 capitalize"
          >
            {propertyTypes.map(type => (
              <option key={type} value={type} className="capitalize">{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Listing Type *
          </label>
          <select
            value={formData.listing_type}
            onChange={(e) => handleChange('listing_type', e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 capitalize"
          >
            <option value="sale">For Sale</option>
            <option value="rent">For Rent</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Price (RM) *
        </label>
        <div className="relative">
          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="number"
            value={formData.price}
            onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0"
            min="0"
            required
          />
        </div>
      </div>
    </div>
  );

  const renderDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            <Bed className="w-4 h-4 inline mr-1" />
            Bedrooms *
          </label>
          <input
            type="number"
            value={formData.bedrooms}
            onChange={(e) => handleChange('bedrooms', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="0"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            <Bath className="w-4 h-4 inline mr-1" />
            Bathrooms *
          </label>
          <input
            type="number"
            value={formData.bathrooms}
            onChange={(e) => handleChange('bathrooms', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="0"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            <Square className="w-4 h-4 inline mr-1" />
            Sqft *
          </label>
          <input
            type="number"
            value={formData.sqft}
            onChange={(e) => handleChange('sqft', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="0"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Amenities
        </label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={amenityInput}
            onChange={(e) => setAmenityInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAmenity())}
            className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Add custom amenity..."
          />
          <button
            type="button"
            onClick={handleAddAmenity}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-xs text-gray-600 mb-2">Quick add common amenities:</p>
          <div className="flex flex-wrap gap-2">
            {commonAmenities.map(amenity => (
              <button
                key={amenity}
                type="button"
                onClick={() => handleToggleAmenity(amenity)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  formData.amenities?.includes(amenity)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {amenity}
              </button>
            ))}
          </div>
        </div>

        {formData.amenities && formData.amenities.length > 0 && (
          <div>
            <p className="text-xs text-gray-600 mb-2">Selected amenities:</p>
            <div className="flex flex-wrap gap-2">
              {formData.amenities.map((amenity, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm"
                >
                  {amenity}
                  <button
                    type="button"
                    onClick={() => handleRemoveAmenity(amenity)}
                    className="text-green-700 hover:text-green-900"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderLocation = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Address *
        </label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Street address"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            City *
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="City"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            State *
          </label>
          <select
            value={formData.state}
            onChange={(e) => handleChange('state', e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {malaysianStates.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Postal Code
        </label>
        <input
          type="text"
          value={formData.postal_code}
          onChange={(e) => handleChange('postal_code', e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., 50450"
        />
      </div>
    </div>
  );

  const renderImages = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          <Upload className="w-4 h-4 inline mr-1" />
          Property Images
        </label>
        <p className="text-sm text-gray-600 mb-4">
          Add image URLs for your property. Use Pexels, Unsplash, or direct image links.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="url"
            value={imageUrlInput}
            onChange={(e) => setImageUrlInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddImage())}
            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://images.pexels.com/..."
          />
          <button
            type="button"
            onClick={handleAddImage}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold"
          >
            Add Image
          </button>
        </div>

        {formData.image_urls && formData.image_urls.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {formData.image_urls.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Property ${index + 1}`}
                  className="w-full h-40 object-cover rounded-xl border-2 border-gray-200"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Image+Not+Found';
                  }}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetMainImage(url)}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-sm transition-colors ${
                      formData.main_image_url === url
                        ? 'bg-yellow-500 text-white'
                        : 'bg-white text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {formData.main_image_url === url ? 'Main' : 'Set Main'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {formData.main_image_url === url && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-white text-xs font-bold rounded">
                    Main Image
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No images added yet</p>
            <p className="text-sm text-gray-500">Add image URLs to showcase your property</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {property?.id ? 'Edit Property' : 'Add New Property'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Fill in the details below to {property?.id ? 'update' : 'create'} your property listing
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="border-b border-gray-200">
          <div className="flex space-x-1 px-6">
            <button
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                activeTab === 'basic'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Basic Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                activeTab === 'details'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('location')}
              className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                activeTab === 'location'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Location
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('images')}
              className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                activeTab === 'images'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Images
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {activeTab === 'basic' && renderBasicInfo()}
            {activeTab === 'details' && renderDetails()}
            {activeTab === 'location' && renderLocation()}
            {activeTab === 'images' && renderImages()}
          </div>


          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
            >
              {loading ? 'Saving...' : property?.id ? 'Update Property' : 'Create Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
