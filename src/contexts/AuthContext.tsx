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

  // Fetch user profile from the profiles table
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log('Fetching profile for user:', userId)
      
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }

      console.log('Profile fetched:', data)
      return data
    } catch (error) {
      console.error('Exception fetching profile:', error)
      return null
    }
  }

  // Create profile for new user
  const createProfileForNewUser = async (userId: string, email: string): Promise<UserProfile | null> => {
    try {
      console.log('Creating profile for new user:', userId, email)
      
      const newProfile = {
        id: userId,
        email: email,
        full_name: null,
        role: 'user' as const,
        credits: 100
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .insert([newProfile])
        .select()
        .single()

      if (error) {
        console.error('Error creating profile:', error)
        return null
      }

      console.log('Profile created:', data)
      return data
    } catch (error) {
      console.error('Exception creating profile:', error)
      return null
    }
  }

  useEffect(() => {
    console.log('AuthProvider: Starting initialization')
    
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      console.log('AuthProvider: Initial session check', { session: !!session, error })
      
      if (session?.user) {
        setUser(session.user)
        
        // Fetch the user's profile
        const userProfile = await fetchUserProfile(session.user.id)
        if (userProfile) {
          setProfile(userProfile)
        } else {
          console.log('No profile found, user may need to complete setup')
        }
      }
      
      setLoading(false)
      console.log('AuthProvider: Loading set to false')
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Auth state changed', { event, session: !!session })
      
      if (session?.user) {
        setUser(session.user)
        
        // Fetch the user's profile
        const userProfile = await fetchUserProfile(session.user.id)
        if (userProfile) {
          setProfile(userProfile)
        } else {
          console.log('No profile found for authenticated user')
        }
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
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: undefined // Disable email confirmation
        }
      })

      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) {
        return { error }
      }

      // Fetch profile after successful login
      if (data.user) {
        const userProfile = await fetchUserProfile(data.user.id)
        if (userProfile) {
          setProfile(userProfile)
        }
      }

      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshProfile = async () => {
    if (user) {
      const userProfile = await fetchUserProfile(user.id)
      if (userProfile) {
        setProfile(userProfile)
      }
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