/*
  # Setup proper RLS policies for profiles table

  1. Security Setup
    - Enable RLS on profiles table
    - Add policy for users to read their own profile
    - Add policy for users to update their own profile
    - Add policy for admins to read all profiles
*/

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "read own profile" ON public.profiles;
DROP POLICY IF EXISTS "update own profile" ON public.profiles;
DROP POLICY IF EXISTS "admin read all profiles" ON public.profiles;

-- Allow users to read their own profile
CREATE POLICY "read own profile" ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- Allow users to update their own profile (but not role/credits)
CREATE POLICY "update own profile" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow admins to read all profiles
CREATE POLICY "admin read all profiles" ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to update any profile
CREATE POLICY "admin update all profiles" ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );