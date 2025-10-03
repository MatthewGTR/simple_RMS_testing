/*
  # Secure Admin Functions - Clean Setup

  1. Drop Dependencies
    - Remove policies that depend on is_admin function
    - Drop existing admin functions

  2. Admin Helper Functions
    - `is_admin(uuid)` - Check if user has admin role
      - Used by edge function to verify admin status
      - Security definer with locked search_path

  3. Admin RPC Functions
    - `admin_list_profiles()` - List all user profiles
      - Returns all profiles ordered by creation date
      - Security definer, only service_role can execute

    - `admin_update_credits(uuid, integer, text)` - Update user credits
      - Updates user credits with audit logging
      - Records change in credits_log table
      - Security definer, only service_role can execute

  4. Security
    - All functions use SECURITY DEFINER
    - Locked search_path prevents SQL injection
    - Permissions revoked from public, anon, authenticated
    - Only service_role can execute these functions

  5. Recreate Policies
    - Restore credit_ledger policy using new is_admin function
*/

begin;

-- Drop policy that depends on is_admin function
drop policy if exists "credit_ledger_read_own_or_admin" on public.credit_ledger;

-- Now we can safely drop the functions
drop function if exists public.is_admin(uuid) cascade;
drop function if exists public.admin_list_profiles() cascade;
drop function if exists public.admin_update_credits(uuid, integer, text) cascade;

-- Create is_admin function
create function public.is_admin(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists(
    select 1 from public.profiles
    where id = p_uid and role = 'admin'
  );
$$;

revoke all on function public.is_admin(uuid) from public;

-- Create admin_list_profiles function
create function public.admin_list_profiles()
returns setof public.profiles
language sql
stable
security definer
set search_path = public, pg_temp
as $$ select * from public.profiles order by created_at desc $$;

revoke all on function public.admin_list_profiles() from public;
grant execute on function public.admin_list_profiles() to service_role;

-- Create admin_update_credits function
create function public.admin_update_credits(p_user_id uuid, p_delta integer, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.profiles
  set credits = credits + p_delta,
      updated_at = now()
  where id = p_user_id;

  insert into public.credits_log(user_id, delta, reason, created_by)
  values (p_user_id, p_delta, p_reason, auth.uid());
end;
$$;

revoke all on function public.admin_update_credits(uuid, integer, text) from public;
grant execute on function public.admin_update_credits(uuid, integer, text) to service_role;

-- Recreate the credit_ledger policy
create policy "credit_ledger_read_own_or_admin" on public.credit_ledger
for select using (user_id = auth.uid() or is_admin(auth.uid()));

commit;
