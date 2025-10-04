/*
  # Fix is_admin Function to Include Super Admin
  
  1. Changes
    - Update is_admin function to return true for both 'admin' and 'super_admin' roles
    - Super admins should have all permissions that regular admins have
  
  2. Security
    - Maintains proper access control hierarchy
    - Super admins inherit all admin capabilities
*/

-- Update is_admin function to include super_admin
create or replace function public.is_admin(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists(
    select 1 from public.profiles
    where id = p_uid and role in ('admin', 'super_admin')
  );
$$;

revoke all on function public.is_admin(uuid) from public;
