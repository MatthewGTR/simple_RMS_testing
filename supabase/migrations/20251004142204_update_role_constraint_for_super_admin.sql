/*
  # Update Role Constraint to Allow Super Admin
  
  1. Changes
    - Drop existing role check constraint
    - Add new constraint that allows 'user', 'admin', and 'super_admin'
  
  2. Security
    - Maintains data integrity
    - Prevents invalid role values
*/

-- Drop the existing check constraint
alter table public.profiles drop constraint if exists profiles_role_check;

-- Add new check constraint that includes super_admin
alter table public.profiles add constraint profiles_role_check 
  check (role in ('user', 'admin', 'super_admin'));
