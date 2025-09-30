-- USER ROLE MANAGEMENT QUERIES
-- Your app already has a 'role' column in the 'profiles' table
-- DO NOT modify the 'users' table directly - it's Supabase's auth table

-- 1. VIEW CURRENT USER ROLES
-- See all users and their current roles
SELECT 
  p.id,
  p.email,
  p.role,
  p.credits,
  p.created_at,
  u.email as auth_email,
  u.created_at as auth_created_at
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC;

-- 2. ADD ROLE COLUMN (if it doesn't exist - but yours already has it)
-- Your profiles table already has this:
-- ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- 3. UPDATE USER TO ADMIN
-- Make a specific user an admin
UPDATE public.profiles 
SET role = 'admin', updated_at = now() 
WHERE email = 'user@example.com';

-- 4. UPDATE USER TO REGULAR USER
-- Demote an admin back to regular user
UPDATE public.profiles 
SET role = 'user', updated_at = now() 
WHERE email = 'admin@example.com';

-- 5. BULK UPDATE - Make multiple users admin
UPDATE public.profiles 
SET role = 'admin', updated_at = now() 
WHERE email IN ('user1@example.com', 'user2@example.com', 'user3@example.com');

-- 6. VIEW ONLY ADMINS
SELECT id, email, role, credits, created_at 
FROM public.profiles 
WHERE role = 'admin'
ORDER BY created_at DESC;

-- 7. VIEW ONLY REGULAR USERS
SELECT id, email, role, credits, created_at 
FROM public.profiles 
WHERE role = 'user'
ORDER BY created_at DESC;

-- 8. COUNT USERS BY ROLE
SELECT 
  role,
  COUNT(*) as user_count
FROM public.profiles 
GROUP BY role;

-- 9. SAFE ROLE UPDATE WITH VERIFICATION
-- Update and verify the change
BEGIN;

-- Update the role
UPDATE public.profiles 
SET role = 'admin', updated_at = now() 
WHERE email = 'user@example.com';

-- Verify the change
SELECT id, email, role, updated_at 
FROM public.profiles 
WHERE email = 'user@example.com';

-- If everything looks good, commit:
COMMIT;
-- If something's wrong, rollback:
-- ROLLBACK;

-- 10. CREATE A VIEW FOR EASY USER MANAGEMENT
CREATE OR REPLACE VIEW user_management AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.credits,
  p.created_at as profile_created,
  u.created_at as auth_created,
  u.last_sign_in_at,
  u.email_confirmed_at
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC;

-- Use the view:
-- SELECT * FROM user_management WHERE role = 'admin';
-- SELECT * FROM user_management WHERE email LIKE '%@company.com';