/*
  # Update Admin Functions to Log Transactions

  1. Changes
    - Drop and recreate admin_update_credits to log transactions
    - Drop and recreate admin_update_role to log transactions
    - Drop and recreate admin_approve_credit_request to log transactions

  2. Transaction Types
    - credit_add: When credits are added
    - credit_deduct: When credits are deducted
    - role_change: When user role is changed
    - credit_request_approved: When credit request is approved
    - credit_request_rejected: When credit request is rejected
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS public.admin_update_credits(uuid, integer, text);
DROP FUNCTION IF EXISTS public.admin_update_role(uuid, text);
DROP FUNCTION IF EXISTS public.admin_approve_credit_request(integer, boolean, text);

-- Recreate admin_update_credits with transaction logging
CREATE OR REPLACE FUNCTION public.admin_update_credits(
  p_user_id uuid,
  p_delta integer,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_admin boolean;
  v_old_credits integer;
  v_new_credits integer;
BEGIN
  SELECT public.is_admin(auth.uid()) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT credits INTO v_old_credits
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_old_credits IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  v_new_credits := GREATEST(0, v_old_credits + p_delta);

  UPDATE public.profiles
  SET 
    credits = v_new_credits,
    updated_at = now()
  WHERE id = p_user_id;

  -- Log the transaction
  PERFORM public.log_transaction(
    p_user_id,
    CASE WHEN p_delta > 0 THEN 'credit_add' ELSE 'credit_deduct' END,
    jsonb_build_object(
      'old_credits', v_old_credits,
      'new_credits', v_new_credits,
      'delta', p_delta,
      'reason', p_reason
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'old_credits', v_old_credits,
    'new_credits', v_new_credits
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_credits(uuid, integer, text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_update_credits(uuid, integer, text) TO authenticated;

-- Recreate admin_update_role with transaction logging
CREATE OR REPLACE FUNCTION public.admin_update_role(
  p_user_id uuid,
  p_new_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_super_admin boolean;
  v_old_role text;
BEGIN
  SELECT (role = 'super_admin') INTO v_is_super_admin
  FROM public.profiles
  WHERE id = auth.uid();
  
  IF NOT v_is_super_admin THEN
    RAISE EXCEPTION 'Super admin access required';
  END IF;

  IF p_new_role NOT IN ('user', 'admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  SELECT role INTO v_old_role
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_old_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  UPDATE public.profiles
  SET 
    role = p_new_role,
    updated_at = now()
  WHERE id = p_user_id;

  -- Log the transaction
  PERFORM public.log_transaction(
    p_user_id,
    'role_change',
    jsonb_build_object(
      'old_role', v_old_role,
      'new_role', p_new_role
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'old_role', v_old_role,
    'new_role', p_new_role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_role(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_update_role(uuid, text) TO authenticated;

-- Recreate admin_approve_credit_request with transaction logging
CREATE OR REPLACE FUNCTION public.admin_approve_credit_request(
  p_request_id integer,
  p_approve boolean,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_super_admin boolean;
  v_request record;
  v_old_credits integer;
  v_new_credits integer;
BEGIN
  SELECT (role = 'super_admin') INTO v_is_super_admin
  FROM public.profiles
  WHERE id = auth.uid();
  
  IF NOT v_is_super_admin THEN
    RAISE EXCEPTION 'Super admin access required';
  END IF;

  SELECT cr.*, p.credits as current_credits
  INTO v_request
  FROM public.credit_requests cr
  JOIN public.profiles p ON p.id = cr.user_id
  WHERE cr.id = p_request_id
  AND cr.status = 'pending';

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Credit request not found or already processed';
  END IF;

  v_old_credits := v_request.current_credits;

  IF p_approve THEN
    v_new_credits := GREATEST(0, v_old_credits + v_request.delta);
    
    UPDATE public.profiles
    SET 
      credits = v_new_credits,
      updated_at = now()
    WHERE id = v_request.user_id;

    -- Log the transaction
    PERFORM public.log_transaction(
      v_request.user_id,
      'credit_request_approved',
      jsonb_build_object(
        'request_id', p_request_id,
        'old_credits', v_old_credits,
        'new_credits', v_new_credits,
        'delta', v_request.delta,
        'reason', v_request.reason,
        'notes', p_notes
      )
    );
  ELSE
    -- Log rejection
    PERFORM public.log_transaction(
      v_request.user_id,
      'credit_request_rejected',
      jsonb_build_object(
        'request_id', p_request_id,
        'delta', v_request.delta,
        'reason', v_request.reason,
        'notes', p_notes
      )
    );
  END IF;

  UPDATE public.credit_requests
  SET
    status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    review_notes = p_notes
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'approved', p_approve,
    'old_credits', v_old_credits,
    'new_credits', CASE WHEN p_approve THEN v_new_credits ELSE v_old_credits END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_credit_request(integer, boolean, text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_approve_credit_request(integer, boolean, text) TO authenticated;
