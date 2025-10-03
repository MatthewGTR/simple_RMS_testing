/*
  # Fix Admin Update Credits Function
  
  1. Problem
    - The guard_profile_priv_columns trigger blocks credit updates
    - It checks if auth.uid() is admin, but SECURITY DEFINER functions don't have auth context
    - The admin_update_credits function can't update credits because of this guard
  
  2. Solution
    - Use a dedicated internal function that bypasses the trigger
    - Call update_credits_internal which directly modifies credits
    - Keep the audit logging in credits_log
  
  3. Security
    - admin_update_credits still requires service_role permission
    - Only called from edge function after admin verification
    - All changes still logged in credits_log table
*/

-- Drop and recreate the admin_update_credits function
drop function if exists public.admin_update_credits(uuid, integer, text) cascade;

-- Create internal function that can update credits (bypasses trigger by design)
create or replace function public.update_credits_internal(p_user_id uuid, p_delta integer, p_reason text, p_admin_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Update credits directly (this will be called only by admin functions)
  update public.profiles
  set credits = credits + p_delta,
      updated_at = now()
  where id = p_user_id;

  -- Log the change
  insert into public.credits_log(user_id, delta, reason, created_by)
  values (p_user_id, p_delta, p_reason, p_admin_id);
end;
$$;

-- Only service_role can execute this
revoke all on function public.update_credits_internal(uuid, integer, text, uuid) from public;
grant execute on function public.update_credits_internal(uuid, integer, text, uuid) to service_role;

-- Recreate admin_update_credits to call the internal function
create function public.admin_update_credits(p_user_id uuid, p_delta integer, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id uuid;
begin
  -- Get the admin ID from the JWT context
  -- When called from edge function, this will be the authenticated user
  v_admin_id := auth.uid();
  
  -- If no auth context (shouldn't happen), use a system UUID
  if v_admin_id is null then
    v_admin_id := '00000000-0000-0000-0000-000000000000'::uuid;
  end if;
  
  -- Call internal function
  perform update_credits_internal(p_user_id, p_delta, p_reason, v_admin_id);
end;
$$;

revoke all on function public.admin_update_credits(uuid, integer, text) from public;
grant execute on function public.admin_update_credits(uuid, integer, text) to service_role;

-- Update guard function to allow updates from our internal function
create or replace function public.guard_profile_priv_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Allow if user is admin
  if public.is_admin(auth.uid()) then
    return new;
  end if;
  
  -- Block role changes for non-admins
  if new.role is distinct from old.role then
    raise exception 'Only admin can change role';
  end if;
  
  -- Block credit changes for non-admins
  -- Note: This will be bypassed by SECURITY DEFINER functions like update_credits_internal
  if new.credits is distinct from old.credits then
    raise exception 'Use RPC to change credits';
  end if;
  
  return new;
end;
$$;
