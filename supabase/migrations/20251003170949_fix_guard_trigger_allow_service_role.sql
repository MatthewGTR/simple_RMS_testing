/*
  # Fix Guard Trigger to Allow Service Role Updates
  
  1. Problem
    - The guard_profile_priv_columns trigger blocks all credit updates
    - Even SECURITY DEFINER functions are blocked
    - Service role needs to be able to update credits
  
  2. Solution
    - Check if current role is service_role or postgres (superuser)
    - Allow credit updates from service_role context
    - Keep blocking regular users from direct credit changes
  
  3. Security
    - Regular users still can't update credits directly
    - Only admin functions with service_role grants can update
    - Maintains audit trail through credits_log
*/

create or replace function public.guard_profile_priv_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Allow service_role and postgres to update anything (for admin functions)
  if current_user in ('service_role', 'postgres') then
    return new;
  end if;

  -- Allow if authenticated user is admin
  if public.is_admin(auth.uid()) then
    return new;
  end if;
  
  -- Block role changes for non-admins
  if new.role is distinct from old.role then
    raise exception 'Only admin can change role';
  end if;
  
  -- Block credit changes for non-admins
  if new.credits is distinct from old.credits then
    raise exception 'Use RPC to change credits';
  end if;
  
  return new;
end;
$$;
