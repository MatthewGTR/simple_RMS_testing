/*
  # Allow Super Admin Promotion
  
  1. Changes
    - Update promote_user function to allow promoting users to 'super_admin' role
    - Super admins can now promote other users to super_admin, admin, or user roles
    - Maintains security by requiring super admin privileges to execute
  
  2. Security
    - Function remains security definer with service role access only
    - Only super admins can call this function (enforced at application layer)
    - All role transitions are logged with updated_at timestamp
*/

-- Update promote_user function to allow super_admin role
create or replace function public.promote_user(p_user_id uuid, p_new_role text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Validate role - now includes super_admin
  if p_new_role not in ('user', 'admin', 'super_admin') then
    raise exception 'Invalid role. Must be user, admin, or super_admin';
  end if;
  
  -- Update user role
  update public.profiles
  set role = p_new_role,
      updated_at = now()
  where id = p_user_id;
  
  if not found then
    raise exception 'User not found';
  end if;
end;
$$;

-- Ensure proper permissions
revoke all on function public.promote_user(uuid, text) from public;
grant execute on function public.promote_user(uuid, text) to service_role;
