-- Method 1: Direct SQL Update (Recommended)
-- Run this in your Supabase SQL Editor

-- First, find the user you want to upgrade
SELECT id, email, role FROM public.profiles WHERE email = 'user@example.com';

-- Then upgrade them to admin (replace the email with the actual user's email)
UPDATE public.profiles 
SET role = 'admin', updated_at = now() 
WHERE email = 'user@example.com';

-- Verify the change
SELECT id, email, role FROM public.profiles WHERE email = 'user@example.com';

-- Method 2: Upgrade by user ID (if you know the UUID)
UPDATE public.profiles 
SET role = 'admin', updated_at = now() 
WHERE id = 'your-user-uuid-here';

-- Method 3: Create a temporary admin upgrade function (optional)
-- This creates a one-time function you can call and then drop

CREATE OR REPLACE FUNCTION upgrade_user_to_admin(user_email text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.profiles 
  SET role = 'admin', updated_at = now() 
  WHERE email = user_email;
$$;

-- Use it
SELECT upgrade_user_to_admin('user@example.com');

-- Drop it after use
DROP FUNCTION upgrade_user_to_admin(text);

-- Method 4: Bulk upgrade multiple users
UPDATE public.profiles 
SET role = 'admin', updated_at = now() 
WHERE email IN ('admin1@example.com', 'admin2@example.com');

-- Method 5: Check all current admins
SELECT id, email, role, created_at 
FROM public.profiles 
WHERE role = 'admin' 
ORDER BY created_at;