/*
  # Complete Profiles Setup with Admin Functions

  1. Security Setup
    - Enable RLS on profiles table
    - Create policies for users to read/update own profiles
    - Create secure admin functions with proper permissions

  2. User Management
    - Auto-create profiles on user signup
    - Handle profile updates with timestamps

  3. Admin Functions
    - Secure admin_list_profiles function
    - Secure admin_update_credits function
    - Proper permission revocation

  4. Rollback Section
    - Commands to undo all changes if needed
*/

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "read own profile" ON public.profiles;
DROP POLICY IF EXISTS "update own profile" ON public.profiles;
DROP POLICY IF EXISTS "admin read profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin update profiles" ON public.profiles;

-- Create minimal, non-recursive policies
CREATE POLICY "read own profile"
ON public.profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "update own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Create or update handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, credits)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user',
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create admin function to list all profiles (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.admin_list_profiles()
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

-- Create admin function to update user credits (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.admin_update_credits(
  user_id uuid,
  credit_change integer,
  reason text DEFAULT NULL
)
RETURNS TABLE (
  success boolean,
  new_credits integer,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_credits integer;
  new_credit_amount integer;
BEGIN
  -- Get current credits
  SELECT credits INTO current_credits
  FROM public.profiles
  WHERE id = user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'User not found';
    RETURN;
  END IF;
  
  -- Calculate new credits (minimum 0)
  new_credit_amount := GREATEST(0, current_credits + credit_change);
  
  -- Update credits
  UPDATE public.profiles
  SET credits = new_credit_amount,
      updated_at = NOW()
  WHERE id = user_id;
  
  -- Log the transaction if credit_ledger table exists
  BEGIN
    INSERT INTO public.credit_ledger (user_id, change, reason, created_at)
    VALUES (user_id, credit_change, reason, NOW());
  EXCEPTION WHEN undefined_table THEN
    -- Ignore if credit_ledger doesn't exist
    NULL;
  END;
  
  RETURN QUERY SELECT true, new_credit_amount, 'Credits updated successfully';
END;
$$;

-- Revoke permissions from anon and authenticated users
REVOKE ALL ON FUNCTION public.admin_list_profiles() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_credits(uuid, integer, text) FROM anon, authenticated;

-- Grant execute to service_role only (this is implicit but explicit is better)
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_credits(uuid, integer, text) TO service_role;

/*
  ROLLBACK SECTION
  
  To undo all changes, run these commands:
  
  -- Remove triggers and functions
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  DROP FUNCTION IF EXISTS public.handle_new_user();
  DROP FUNCTION IF EXISTS public.admin_list_profiles();
  DROP FUNCTION IF EXISTS public.admin_update_credits(uuid, integer, text);
  
  -- Remove policies
  DROP POLICY IF EXISTS "read own profile" ON public.profiles;
  DROP POLICY IF EXISTS "update own profile" ON public.profiles;
  
  -- Disable RLS
  ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
*/