import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Debug environment variables
console.log('=== SUPABASE CLIENT INIT ===')
console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key exists:', !!supabaseAnonKey)
console.log('Supabase Key length:', supabaseAnonKey?.length || 0)

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!')
  console.log('VITE_SUPABASE_URL:', supabaseUrl)
  console.log('VITE_SUPABASE_ANON_KEY exists:', !!supabaseAnonKey)
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Test the client initialization
console.log('Supabase client created successfully')

export type UserProfile = {
  id: string
  email: string
  full_name?: string
  role: 'user' | 'admin'
  credits: number
  created_at: string
  updated_at: string
}