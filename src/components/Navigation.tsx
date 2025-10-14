import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Home, Settings, LogOut, Shield, Building2, Globe, Search } from 'lucide-react'

interface NavigationProps {
  activeView: 'dashboard' | 'admin-dashboard' | 'enhanced-admin' | 'properties' | 'public-home' | 'browse-buy' | 'browse-rent'
  onViewChange: (view: 'dashboard' | 'admin-dashboard' | 'enhanced-admin' | 'properties' | 'public-home' | 'browse-buy' | 'browse-rent') => void
}

export function Navigation({ activeView, onViewChange }: NavigationProps) {
  const { profile, signOut } = useAuth()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  const isSuperAdmin = profile?.role === 'super_admin'

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      if (error?.name !== 'AuthSessionMissingError') {
        console.error('Error signing out:', error)
      }
    }
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center">
              <div className="bg-blue-600 rounded-lg p-2">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900">Property AI</span>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => onViewChange('dashboard')}
                className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'dashboard'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </button>

              <button
                onClick={() => onViewChange('public-home')}
                className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'public-home'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Globe className="w-4 h-4 mr-2" />
                Home
              </button>

              <button
                onClick={() => onViewChange('browse-buy')}
                className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'browse-buy'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Search className="w-4 h-4 mr-2" />
                Browse
              </button>

              {isAdmin && (
                <>
                  <button
                    onClick={() => onViewChange('admin-dashboard')}
                    className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeView === 'admin-dashboard'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Admin Dashboard
                  </button>

                  <button
                    onClick={() => onViewChange('enhanced-admin')}
                    className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeView === 'enhanced-admin'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    User Management
                  </button>

                  <button
                    onClick={() => onViewChange('properties')}
                    className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeView === 'properties'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Properties
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{profile?.email}</p>
              <p className="text-xs text-gray-500">
                {isSuperAdmin ? '⭐ Super Admin' : profile?.role === 'admin' ? '👑 Admin' : '👤 User'}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}