/*
  # Fix Recursive RLS Policies

  This migration fixes the 42P17 error caused by RLS policies that recursively
  query the same table they're protecting.

  ## Changes Made
  1. Drop all existing policies on profiles table
  2. Create only minimal, non-recursive policies
  3. Remove any policies that call functions or subqueries on profiles
*/

-- Step 1: Inspect and drop any recursive policies
DROP POLICY IF EXISTS "admin read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin: full access" ON public.profiles;
DROP POLICY IF EXISTS "read: self or admin" ON public.profiles;
DROP POLICY IF EXISTS "update: self (no role/credits)" ON public.profiles;
DROP POLICY IF EXISTS "read own profile" ON public.profiles;
DROP POLICY IF EXISTS "update own profile" ON public.profiles;

-- Step 2: Enable RLS and create only minimal, non-recursive policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Simple policy for users to read their own profile
CREATE POLICY "read own profile"
ON public.profiles FOR SELECT
USING (id = auth.uid());

-- Simple policy for users to update their own profile
CREATE POLICY "update own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Step 3: Create a secure function for admin operations (called from backend only)
CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS SETOF public.profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles;
$$;

-- Revoke access from browser clients (only backend with service role can call this)
REVOKE ALL ON FUNCTION public.admin_list_profiles() FROM anon, authenticated;