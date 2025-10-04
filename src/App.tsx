import React, { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Auth } from './components/Auth'
import { Navigation } from './components/Navigation'
import { Dashboard } from './components/Dashboard'
import { AdminPanel } from './components/AdminPanel'

function AppContent() {
  const { user, profile, loading, error } = useAuth()
  const [activeView, setActiveView] = useState<'dashboard' | 'admin'>('dashboard')

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
    console.log('No user, showing auth')
    return <Auth />
  }

  console.log('Showing main app')

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation activeView={activeView} onViewChange={setActiveView} />
      <main className="py-8 px-4 sm:px-6 lg:px-8">
        {activeView === 'dashboard' ? (
          <Dashboard />
        ) : activeView === 'admin' && isAdmin ? (
          <AdminPanel />
        ) : (
          <Dashboard />
        )}
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