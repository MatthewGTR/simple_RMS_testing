/*
  # Security Hardening and Final Setup

  1. Security Hardening
    - Set function owners to postgres
    - Lock down search_path to prevent injection
    - Revoke all public access to admin functions
    - Grant execute only to service_role

  2. RLS Policies
    - Minimal, non-recursive policies
    - Users can only read/update their own profile

  3. Verification
    - Check function signatures
    - Test function permissions
*/

-- Security hardening for admin functions
alter function public.admin_list_profiles() owner to postgres;
alter function public.admin_update_credits(uuid, integer, text) owner to postgres;

alter function public.admin_list_profiles() set search_path = public, pg_temp;
alter function public.admin_update_credits(uuid, integer, text) set search_path = public, pg_temp;

-- Lock execution to server only
revoke all on function public.admin_list_profiles() from public, anon, authenticated;
revoke all on function public.admin_update_credits(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.admin_list_profiles() to service_role;
grant execute on function public.admin_update_credits(uuid, integer, text) to service_role;

-- Ensure RLS is minimal and non-recursive
alter table public.profiles enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
for select using (id = auth.uid());

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

-- Verification queries (run these to check setup)
-- Check function signatures:
-- select proname, prorettype::regtype, oidvectortypes(proargtypes)
-- from pg_proc
-- where pronamespace = 'public'::regnamespace
--   and proname in ('admin_list_profiles','admin_update_credits');

-- Check RLS policies:
-- select polname, polcmd, qual, with_check
-- from pg_policies
-- where schemaname = 'public' and tablename = 'profiles';