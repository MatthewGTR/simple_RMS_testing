/*
  # Fix is_super_admin Function Permissions

  1. Changes
    - Grant execute permission to authenticated users for is_super_admin function
    - This allows the edge function to check super admin status

  2. Security
    - Function remains SECURITY DEFINER for secure execution
    - Only authenticated users can execute the function
*/

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO service_role;
