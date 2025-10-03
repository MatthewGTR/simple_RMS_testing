/*
  # Fix admin_list_profiles Function

  1. Problem
    - Function exists with a specific return type
    - Need to modify it, but Postgres requires dropping it first

  2. Solution
    - Drop the existing function
    - Recreate with correct signature and permissions
    - Ensure security settings are maintained
*/

-- Drop the existing function to allow recreation
DROP FUNCTION IF EXISTS public.admin_list_profiles();

-- Recreate admin function to list all profiles (SECURITY DEFINER)
CREATE FUNCTION public.admin_list_profiles()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  credits integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, email, full_name, role, credits, created_at, updated_at
  FROM public.profiles
  ORDER BY created_at DESC;
$$;

-- Set function owner to postgres
ALTER FUNCTION public.admin_list_profiles() OWNER TO postgres;

-- Lock down permissions
REVOKE ALL ON FUNCTION public.admin_list_profiles() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO service_role;
