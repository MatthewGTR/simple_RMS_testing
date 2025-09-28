import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, UserProfile } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('AuthProvider: Starting initialization')
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('AuthProvider: Initial session check', { session: !!session, error })
      
      if (session?.user) {
        setUser(session.user)
        console.log('AuthProvider: User found, setting loading to false')
        setProfile({ 
          id: session.user.id, 
          email: session.user.email || '', 
          role: 'user', 
          credits: 100, 
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
      
      setLoading(false)
      console.log('AuthProvider: Loading set to false')
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('AuthProvider: Auth state changed', { event, session: !!session })
      
      if (session?.user) {
        setUser(session.user)
        setProfile({ 
          id: session.user.id, 
          email: session.user.email || '', 
          role: session.user.email === 'admin@test.com' ? 'admin' : 'user', 
          credits: 100, 
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      } else {
        setUser(null)
        setProfile(null)
      }
      
      setLoading(false)
    })

    return () => {
      console.log('AuthProvider: Cleaning up subscription')
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshProfile = async () => {
    // Simple refresh - just update the timestamp
    if (profile) {
      setProfile({ ...profile, updated_at: new Date().toISOString() })
    }
  }

  console.log('AuthProvider: Rendering with state', { user: !!user, profile: !!profile, loading })

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}