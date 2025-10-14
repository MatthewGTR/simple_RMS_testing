import React, { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Auth } from './components/Auth'
import { LandingPage } from './components/LandingPage'
import { Navigation } from './components/Navigation'
import { Dashboard } from './components/Dashboard'
import { AdminDashboard } from './components/AdminDashboard'
import { EnhancedAdminPanel } from './components/EnhancedAdminPanel'
import { PropertyManagement } from './components/PropertyManagement'
import { AgentDashboard } from './components/AgentDashboard'
import { ConsumerDashboard } from './components/ConsumerDashboard'

function AppContent() {
  const { user, profile, loading, error } = useAuth()
  const [activeView, setActiveView] = useState<'dashboard' | 'admin-dashboard' | 'enhanced-admin' | 'properties'>('dashboard')
  const [showAuth, setShowAuth] = useState(false)

  console.log('=== APP CONTENT RENDER ===')
  console.log('Loading:', loading)
  console.log('User:', user?.email || 'none')
  console.log('Profile:', profile?.email || 'none')
  console.log('Error:', error)

  if (loading) {
    console.log('Showing loading screen')
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading...</p>
          <p className="text-xs text-gray-500">Check console for debug info</p>
        </div>
      </div>
    )
  }

  if (error) {
    console.log('Showing error screen')
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <p className="text-red-600">Error: {error}</p>
          <p className="text-xs text-gray-500">Check console for details</p>
        </div>
      </div>
    )
  }

  if (!user) {
    console.log('No user, showing landing or auth')
    if (showAuth) {
      return <Auth />
    }
    return <LandingPage onShowAuth={() => setShowAuth(true)} />
  }

  console.log('Showing main app')

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  const isAgent = profile?.user_type === 'agent'
  const isConsumer = profile?.user_type === 'consumer'

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation activeView={activeView} onViewChange={setActiveView} />
        <main className="py-8 px-4 sm:px-6 lg:px-8">
          {activeView === 'dashboard' ? (
            <Dashboard />
          ) : activeView === 'admin-dashboard' ? (
            <AdminDashboard onNavigate={setActiveView} />
          ) : activeView === 'enhanced-admin' ? (
            <EnhancedAdminPanel />
          ) : activeView === 'properties' ? (
            <PropertyManagement />
          ) : (
            <Dashboard />
          )}
        </main>
      </div>
    )
  }

  if (isAgent) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation activeView={activeView} onViewChange={setActiveView} />
        <main className="py-8 px-4 sm:px-6 lg:px-8">
          <AgentDashboard />
        </main>
      </div>
    )
  }

  if (isConsumer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation activeView={activeView} onViewChange={setActiveView} />
        <main className="py-8 px-4 sm:px-6 lg:px-8">
          <ConsumerDashboard />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation activeView={activeView} onViewChange={setActiveView} />
      <main className="py-8 px-4 sm:px-6 lg:px-8">
        <Dashboard />
      </main>
    </div>
  )
}

function App() {
  console.log('=== APP STARTING ===')
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App