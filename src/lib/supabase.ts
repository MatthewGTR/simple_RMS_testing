import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('=== SUPABASE INIT ===')
console.log('URL:', supabaseUrl)
console.log('Key exists:', !!supabaseAnonKey)
console.log('Key length:', supabaseAnonKey?.length)

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('MISSING SUPABASE ENVIRONMENT VARIABLES!')
  throw new Error('Missing Supabase environment variables')
}

console.log('Creating Supabase client...')
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
console.log('Supabase client created successfully')

export type UserProfile = {
  id: string
  email: string
  role: 'user' | 'admin'
  credits: number
  created_at: string
  updated_at: string
}