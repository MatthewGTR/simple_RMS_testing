-- Diagnose Admin Role Display Issue
-- Run these queries to identify and fix the problem

-- 1. Check current role values in profiles table
SELECT 
  id,
  email,
  role,
  credits,
  created_at,
  updated_at
FROM public.profiles 
ORDER BY created_at DESC;

-- 2. Check if there are any constraint issues
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass 
  AND conname LIKE '%role%';

-- 3. Check for any triggers that might be resetting roles
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'profiles';

-- 4. Fix: Update specific user to admin (replace with actual email)
UPDATE public.profiles 
SET 
  role = 'admin',
  updated_at = now()
WHERE email = 'admin@test.com'  -- Replace with actual admin email
RETURNING id, email, role, updated_at;

-- 5. Fix: Update by user ID if you know it (replace with actual ID)
UPDATE public.profiles 
SET 
  role = 'admin',
  updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000000'  -- Replace with actual user ID
RETURNING id, email, role, updated_at;

-- 6. Verify the fix worked
SELECT 
  email,
  role,
  CASE 
    WHEN role = 'admin' THEN '✅ Admin'
    WHEN role = 'user' THEN '👤 User'
    ELSE '❓ Unknown'
  END as role_status,
  updated_at
FROM public.profiles 
WHERE email IN ('admin@test.com', 'user@test.com')  -- Replace with actual emails
ORDER BY role DESC;

-- 7. Check if the guard function is preventing updates
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc 
WHERE proname = 'guard_profile_priv_columns';

-- 8. If guard function is blocking, temporarily disable trigger
-- (Only run if step 7 shows the guard function exists and might be blocking)
-- ALTER TABLE public.profiles DISABLE TRIGGER trg_profiles_guard;
-- 
-- -- Then retry the update
-- UPDATE public.profiles 
-- SET role = 'admin', updated_at = now()
-- WHERE email = 'admin@test.com';
-- 
-- -- Re-enable the trigger
-- ALTER TABLE public.profiles ENABLE TRIGGER trg_profiles_guard;

-- 9. Final verification - show all users with role status
SELECT 
  email,
  role,
  credits,
  created_at,
  updated_at,
  CASE 
    WHEN role = 'admin' THEN 'Has admin access ✅'
    ELSE 'Regular user access only'
  END as access_level
FROM public.profiles 
ORDER BY role DESC, created_at DESC;