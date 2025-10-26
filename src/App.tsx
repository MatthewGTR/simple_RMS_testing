import React, { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { PublicLanding } from './components/PublicLanding'
import { PropertyBrowser } from './components/PropertyBrowser'
import { UnifiedAuth } from './components/UnifiedAuth'
import { Navigation } from './components/Navigation'
import { AgentDashboard } from './components/AgentDashboard'
import { AdminDashboard } from './components/AdminDashboard'
import { ConsumerDashboard } from './components/ConsumerDashboard'
import { NotificationContainer } from './components/Notification'

type View = 'dashboard' | 'public-home' | 'browse-buy' | 'browse-rent'

function AppContent() {
  const { user, profile, loading, signOut } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [view, setView] = useState<View>('dashboard')

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  // Not logged in - show public pages
  if (!user) {
    if (view === 'browse-buy' || view === 'browse-rent') {
      return (
        <>
          <PropertyBrowser
            section={view === 'browse-buy' ? 'buy' : 'rent'}
            onBack={() => setView('public-home')}
            onShowAuth={() => setShowAuth(true)}
          />
          {showAuth && (
            <UnifiedAuth
              onClose={() => setShowAuth(false)}
              initialMode="signin"
            />
          )}
        </>
      )
    }

    return (
      <>
        <PublicLanding
          onShowAuth={() => setShowAuth(true)}
          onNavigate={(section) => {
            if (section === 'buy') setView('browse-buy')
            else if (section === 'rent') setView('browse-rent')
          }}
          user={null}
          profile={null}
        />
        {showAuth && (
          <UnifiedAuth
            onClose={() => setShowAuth(false)}
            initialMode="signin"
          />
        )}
      </>
    )
  }

  // Logged in - determine user type
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  const isAgent = profile?.user_type === 'agent' || (profile?.ren_number && profile.ren_number.trim() !== '')
  const isConsumer = profile?.user_type === 'consumer'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation activeView={view} onViewChange={setView} />

      <main>
        {view === 'dashboard' ? (
          <>
            {isAdmin && <AdminDashboard onNavigate={setView} />}
            {isAgent && !isAdmin && <AgentDashboard />}
            {isConsumer && !isAdmin && !isAgent && <ConsumerDashboard />}
          </>
        ) : view === 'public-home' ? (
          <PublicLanding
            onShowAuth={() => {}}
            onNavigate={(section) => {
              if (section === 'buy') setView('browse-buy')
              else if (section === 'rent') setView('browse-rent')
            }}
            user={user}
            profile={profile}
            onGoToPortal={() => setView('dashboard')}
            onSignOut={signOut}
          />
        ) : view === 'browse-buy' ? (
          <PropertyBrowser section="buy" onBack={() => setView('public-home')} onShowAuth={() => {}} />
        ) : view === 'browse-rent' ? (
          <PropertyBrowser section="rent" onBack={() => setView('public-home')} onShowAuth={() => {}} />
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-600">View not found</p>
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
      <NotificationContainer />
    </AuthProvider>
  )
}

export default App
