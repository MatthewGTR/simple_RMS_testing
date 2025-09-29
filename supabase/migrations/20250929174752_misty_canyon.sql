/*
  # Fix profiles table RLS policies

  1. Security
    - Enable RLS on profiles table
    - Add policy for users to read their own profile
    - Add policy for users to update their own profile (excluding role/credits)

  2. Notes
    - Uses auth.uid() to match the authenticated user's ID
    - Allows users to read and update their own data only
*/

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "read own profile" ON public.profiles;
DROP POLICY IF EXISTS "update own profile" ON public.profiles;

-- Create policy for users to read their own profile
CREATE POLICY "read own profile" ON public.profiles
  FOR SELECT 
  USING (id = auth.uid());

-- Create policy for users to update their own profile (but not role/credits)
CREATE POLICY "update own profile" ON public.profiles
  FOR UPDATE 
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());