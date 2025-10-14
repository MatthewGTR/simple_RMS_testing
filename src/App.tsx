import React, { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { PublicLanding } from './components/PublicLanding'
import { PropertyBrowser } from './components/PropertyBrowser'
import { UnifiedAuth } from './components/UnifiedAuth'
import { Navigation } from './components/Navigation'
import { Dashboard } from './components/Dashboard'
import { AdminDashboard } from './components/AdminDashboard'
import { EnhancedAdminPanel } from './components/EnhancedAdminPanel'
import { PropertyManagement } from './components/PropertyManagement'
import { AgentDashboardNew as AgentDashboard } from './components/AgentDashboardNew'
import { ConsumerDashboard } from './components/ConsumerDashboard'

type PublicSection = 'home' | 'buy' | 'rent' | 'sell' | 'new-development'
type AdminView = 'dashboard' | 'admin-dashboard' | 'enhanced-admin' | 'properties' | 'public-home' | 'browse-buy' | 'browse-rent'

function AppContent() {
  const { user, profile, loading, error } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'role-selection'>('signin')
  const [publicSection, setPublicSection] = useState<PublicSection>('home')
  const [adminView, setAdminView] = useState<AdminView>('dashboard')

  console.log('=== APP CONTENT RENDER ===')
  console.log('Loading:', loading)
  console.log('User:', user?.email || 'none')
  console.log('Profile:', profile)

  if (loading) {
    console.log('Still loading...')
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium text-lg">Loading Property AI...</p>
        </div>
      </div>
    )
  }

  if (error) {
    console.log('Error state:', error)
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    )
  }

  const handleShowAuth = (mode: 'signin' | 'role-selection' = 'signin') => {
    setAuthMode(mode)
    setShowAuth(true)
  }

  const handleNavigate = (section: PublicSection) => {
    setPublicSection(section)
  }

  if (!user) {
    console.log('No user, showing public pages')

    if (publicSection !== 'home') {
      return (
        <>
          <PropertyBrowser
            section={publicSection}
            onBack={() => setPublicSection('home')}
            onShowAuth={handleShowAuth}
          />
          {showAuth && (
            <UnifiedAuth
              onClose={() => setShowAuth(false)}
              initialMode={authMode}
            />
          )}
        </>
      )
    }

    return (
      <>
        <PublicLanding
          onShowAuth={handleShowAuth}
          onNavigate={handleNavigate}
        />
        {showAuth && (
          <UnifiedAuth
            onClose={() => setShowAuth(false)}
            initialMode={authMode}
          />
        )}
      </>
    )
  }

  console.log('User authenticated, showing app')

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  const isAgent = profile?.user_type === 'agent'
  const isConsumer = profile?.user_type === 'consumer'

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation activeView={adminView} onViewChange={setAdminView} />
        <main className={adminView.startsWith('public') || adminView.startsWith('browse') ? '' : 'py-8 px-4 sm:px-6 lg:px-8'}>
          {adminView === 'dashboard' ? (
            <Dashboard />
          ) : adminView === 'admin-dashboard' ? (
            <AdminDashboard onNavigate={setAdminView} />
          ) : adminView === 'enhanced-admin' ? (
            <EnhancedAdminPanel />
          ) : adminView === 'properties' ? (
            <PropertyManagement />
          ) : adminView === 'public-home' ? (
            <PublicLanding onShowAuth={() => {}} onNavigate={(section) => {
              if (section === 'buy') setAdminView('browse-buy');
              else if (section === 'rent') setAdminView('browse-rent');
            }} />
          ) : adminView === 'browse-buy' ? (
            <PropertyBrowser section="buy" onBack={() => setAdminView('public-home')} onShowAuth={() => {}} />
          ) : adminView === 'browse-rent' ? (
            <PropertyBrowser section="rent" onBack={() => setAdminView('public-home')} onShowAuth={() => {}} />
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
        <Navigation activeView={adminView} onViewChange={setAdminView} />
        <main className={adminView.startsWith('public') || adminView.startsWith('browse') ? '' : 'py-8 px-4 sm:px-6 lg:px-8'}>
          {adminView === 'dashboard' ? (
            <AgentDashboard />
          ) : adminView === 'public-home' ? (
            <PublicLanding onShowAuth={() => {}} onNavigate={(section) => {
              if (section === 'buy') setAdminView('browse-buy');
              else if (section === 'rent') setAdminView('browse-rent');
            }} />
          ) : adminView === 'browse-buy' ? (
            <PropertyBrowser section="buy" onBack={() => setAdminView('public-home')} onShowAuth={() => {}} />
          ) : adminView === 'browse-rent' ? (
            <PropertyBrowser section="rent" onBack={() => setAdminView('public-home')} onShowAuth={() => {}} />
          ) : (
            <AgentDashboard />
          )}
        </main>
      </div>
    )
  }

  if (isConsumer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation activeView={adminView} onViewChange={setAdminView} />
        <main className={adminView.startsWith('public') || adminView.startsWith('browse') ? '' : 'py-8 px-4 sm:px-6 lg:px-8'}>
          {adminView === 'dashboard' ? (
            <ConsumerDashboard />
          ) : adminView === 'public-home' ? (
            <PublicLanding onShowAuth={() => {}} onNavigate={(section) => {
              if (section === 'buy') setAdminView('browse-buy');
              else if (section === 'rent') setAdminView('browse-rent');
            }} />
          ) : adminView === 'browse-buy' ? (
            <PropertyBrowser section="buy" onBack={() => setAdminView('public-home')} onShowAuth={() => {}} />
          ) : adminView === 'browse-rent' ? (
            <PropertyBrowser section="rent" onBack={() => setAdminView('public-home')} onShowAuth={() => {}} />
          ) : (
            <ConsumerDashboard />
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation activeView="dashboard" onViewChange={() => {}} />
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