/*
  # Fix Admin Functions - Drop and Recreate with Correct Signatures

  This migration fixes function signature conflicts by dropping existing functions
  and recreating them with the correct return types and parameters.

  1. Drop existing functions (handles signature conflicts)
  2. Recreate with proper signatures
  3. Set security definer and proper permissions
  4. Lock down execution to service_role only
*/

-- First, let's see what we're working with (for debugging)
-- Uncomment to inspect existing signatures:
-- select proname,
--        prorettype::regtype as return_type,
--        oidvectortypes(proargtypes) as arg_types
-- from pg_proc
-- where pronamespace = 'public'::regnamespace
--   and proname in ('admin_list_profiles','admin_update_credits');

begin;

-- Drop old versions first (handles any signature conflicts)
drop function if exists public.admin_list_profiles();
drop function if exists public.admin_list_profiles(uuid);
drop function if exists public.admin_update_credits(uuid, integer, text);
drop function if exists public.admin_update_credits(uuid, integer);
drop function if exists public.admin_update_credits(text, uuid, integer, text);

-- Recreate: LIST PROFILES
create function public.admin_list_profiles()
returns setof public.profiles
language sql
security definer
set search_path = public
as $$
  select * from public.profiles order by created_at desc;
$$;

-- Recreate: UPDATE CREDITS
create function public.admin_update_credits(
  p_user_id uuid,
  p_delta   integer,
  p_reason  text default null
)
returns table (
  success boolean,
  message text,
  user_id uuid,
  old_credits integer,
  new_credits integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_credits integer;
  v_new_credits integer;
  v_user_exists boolean;
begin
  -- Check if user exists
  select exists(select 1 from public.profiles where id = p_user_id) into v_user_exists;
  
  if not v_user_exists then
    return query select false, 'User not found'::text, p_user_id, 0, 0;
    return;
  end if;

  -- Get current credits
  select coalesce(credits, 0) into v_old_credits 
  from public.profiles 
  where id = p_user_id;

  -- Calculate new credits (prevent negative)
  v_new_credits := greatest(0, v_old_credits + p_delta);

  -- Update credits
  update public.profiles
  set credits = v_new_credits,
      updated_at = now()
  where id = p_user_id;

  -- Log the transaction (if you have a credit_ledger table)
  -- insert into public.credit_ledger (user_id, change, reason, created_at)
  -- values (p_user_id, p_delta, coalesce(p_reason, 'Admin adjustment'), now());

  return query select 
    true, 
    format('Credits updated from %s to %s', v_old_credits, v_new_credits)::text,
    p_user_id,
    v_old_credits,
    v_new_credits;
end;
$$;

-- Lock down execution: only service_role may call these functions
revoke all on function public.admin_list_profiles() from public, anon, authenticated;
revoke all on function public.admin_update_credits(uuid, integer, text) from public, anon, authenticated;

grant execute on function public.admin_list_profiles() to service_role;
grant execute on function public.admin_update_credits(uuid, integer, text) to service_role;

commit;

-- Rollback section (run manually if needed):
/*
begin;
drop function if exists public.admin_list_profiles();
drop function if exists public.admin_update_credits(uuid, integer, text);
commit;
*/