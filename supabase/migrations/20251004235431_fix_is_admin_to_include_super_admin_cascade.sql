/*
  # Fix is_admin Function to Include Super Admin

  1. Changes
    - Drop and recreate is_admin function to return true for both 'admin' and 'super_admin' roles
    - This ensures super_admins have all admin capabilities
    - Recreate dependent policies

  2. Security
    - Function maintains SECURITY DEFINER for secure execution
    - Locked search_path prevents SQL injection
    - Policies are recreated to maintain security
*/

-- Drop policies that depend on is_admin
DROP POLICY IF EXISTS "credit_ledger_read_own_or_admin" ON public.credit_ledger;
DROP POLICY IF EXISTS "pending_credits_insert_policy" ON public.pending_credits;

-- Drop and recreate is_admin function to include super_admin
DROP FUNCTION IF EXISTS public.is_admin(uuid);

CREATE FUNCTION public.is_admin(p_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id = p_uid AND role IN ('admin', 'super_admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- Recreate the credit_ledger policy
CREATE POLICY "credit_ledger_read_own_or_admin"
  ON public.credit_ledger
  FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Recreate the pending_credits policy if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pending_credits') THEN
    EXECUTE 'CREATE POLICY "pending_credits_insert_policy" ON public.pending_credits FOR INSERT WITH CHECK (public.is_admin(auth.uid()))';
  END IF;
END $$;