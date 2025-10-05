import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { User, CreditCard, Calendar } from 'lucide-react'

export function Dashboard() {
  const { profile } = useAuth()

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Email</label>
            <p className="text-gray-900 mt-1">{profile.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Role</label>
            <p className="text-gray-900 mt-1 capitalize">{profile.role || 'user'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Current Balance</label>
            <p className="text-gray-900 mt-1">{profile.credits || 0} credits</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Account Status</label>
            <p className="text-gray-900 mt-1">Active</p>
          </div>
        </div>
      </div>
    </div>
  )
}