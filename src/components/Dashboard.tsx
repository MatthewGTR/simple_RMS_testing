import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { User, CreditCard, Calendar, CheckSquare, Home } from 'lucide-react'
import PendingApprovals from './PendingApprovals'
import { PropertySubmission } from './PropertySubmission'

export function Dashboard() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'submit-property'>('overview')

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const isSuperAdmin = profile?.role === 'super_admin'

  console.log('Dashboard - User role:', profile?.role, 'Is Super Admin:', isSuperAdmin)

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 px-6 py-3 font-semibold rounded-xl transition-all ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <User className="w-5 h-5" />
                Overview
              </div>
            </button>
            {profile.user_type === 'agent' && (
              <button
                onClick={() => setActiveTab('submit-property')}
                className={`flex-1 px-6 py-3 font-semibold rounded-xl transition-all ${
                  activeTab === 'submit-property'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Home className="w-5 h-5" />
                  Submit Property
                </div>
              </button>
            )}
            {isSuperAdmin && (
              <button
                onClick={() => setActiveTab('approvals')}
                className={`flex-1 px-6 py-3 font-semibold rounded-xl transition-all ${
                  activeTab === 'approvals'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <CheckSquare className="w-5 h-5" />
                  Pending Approvals
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'approvals' && isSuperAdmin ? (
        <PendingApprovals />
      ) : activeTab === 'submit-property' ? (
        <PropertySubmission />
      ) : (
        <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's your account overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 rounded-lg p-3">
              <CreditCard className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Credits</p>
              <p className="text-2xl font-bold text-gray-900">{profile.credits?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 rounded-lg p-3">
              <User className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Profile</p>
              <p className="text-2xl font-bold text-gray-900">Active</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 rounded-lg p-3">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Member Since</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Full Name</label>
              <p className="text-gray-900 mt-1">{profile.full_name || 'Not provided'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Email</label>
              <p className="text-gray-900 mt-1">{profile.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">User Type</label>
              <p className="text-gray-900 mt-1 capitalize">{profile.user_type || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Role</label>
              <p className="text-gray-900 mt-1 capitalize">{profile.role || 'user'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Country</label>
              <p className="text-gray-900 mt-1">{profile.country || 'Not provided'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Phone</label>
              <p className="text-gray-900 mt-1">{profile.phone || 'Not provided'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Current Balance</label>
              <p className="text-gray-900 mt-1">{profile.credits || 0} credits</p>
            </div>
          </div>
        </div>

        {profile.user_type === 'agent' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Agent Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">REN Number</label>
                <p className="text-gray-900 mt-1">{profile.ren_number || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Agency Name</label>
                <p className="text-gray-900 mt-1">{profile.agency_name || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Agency License</label>
                <p className="text-gray-900 mt-1">{profile.agency_license || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Years of Experience</label>
                <p className="text-gray-900 mt-1">{profile.years_experience ? `${profile.years_experience} years` : 'Not provided'}</p>
              </div>
            </div>
          </div>
        )}

        {profile.user_type === 'consumer' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Consumer Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Date of Birth</label>
                <p className="text-gray-900 mt-1">
                  {profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'Not provided'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Occupation</label>
                <p className="text-gray-900 mt-1">{profile.occupation || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Preferred Contact Method</label>
                <p className="text-gray-900 mt-1 capitalize">{profile.preferred_contact_method || 'Email'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  )
}