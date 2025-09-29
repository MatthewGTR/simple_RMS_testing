import React, { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Auth } from './components/Auth'
import { Navigation } from './components/Navigation'
import { Dashboard } from './components/Dashboard'
import { AdminPanel } from './components/AdminPanel'

function AppContent() {
  console.log('=== APP CONTENT RENDERING ===');
  const { user, profile, loading } = useAuth()
  console.log('Auth state:', { user: !!user, profile: !!profile, loading });
  const [activeView, setActiveView] = useState<'dashboard' | 'admin'>('dashboard')

  if (loading) {
    console.log('Showing loading spinner');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  // Show loading if user exists but profile is still loading
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Setting up your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation activeView={activeView} onViewChange={setActiveView} />
      <main className="py-8 px-4 sm:px-6 lg:px-8">
        {activeView === 'dashboard' ? (
          <Dashboard />
        ) : activeView === 'admin' && profile.role === 'admin' ? (
          <AdminPanel />
        ) : (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        )}
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App