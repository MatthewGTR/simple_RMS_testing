/*
  # Add User Types: Agent and Consumer

  1. Changes to Profiles Table
    - Add `user_type` column (enum: 'agent', 'consumer')
    - Add `full_name` column for user's complete name
    - Add `country` column for user's country
    - Add `phone` column for contact number
    
  2. New Agent-specific Fields
    - `ren_number` (Real Estate Agent Registration Number)
    - `agency_name` (Name of the real estate agency)
    - `agency_license` (Agency license number)
    - `years_experience` (Years of experience in real estate)
    
  3. New Consumer-specific Fields
    - `date_of_birth` (Consumer's date of birth)
    - `occupation` (Consumer's occupation)
    - `preferred_contact_method` (email, phone, whatsapp)
    
  4. Security
    - Update RLS policies to include new fields
    - Users can read and update their own extended profile information
    
  5. Important Notes
    - Existing users will need to update their profile with user_type
    - All new fields are optional to maintain backward compatibility
    - REN number is required for agents (enforced at application level)
*/

-- Add user_type column with check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'user_type'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN user_type text CHECK (user_type IN ('agent', 'consumer'));
  END IF;
END $$;

-- Add common fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'country'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN country text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN phone text;
  END IF;
END $$;

-- Add agent-specific fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ren_number'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN ren_number text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'agency_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN agency_name text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'agency_license'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN agency_license text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'years_experience'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN years_experience integer;
  END IF;
END $$;

-- Add consumer-specific fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN date_of_birth date;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'occupation'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN occupation text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferred_contact_method'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN preferred_contact_method text CHECK (preferred_contact_method IN ('email', 'phone', 'whatsapp'));
  END IF;
END $$;

-- Create index on user_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);

-- Create index on ren_number for agent lookups
CREATE INDEX IF NOT EXISTS idx_profiles_ren_number ON public.profiles(ren_number) WHERE ren_number IS NOT NULL;

-- Update the update own profile policy to allow updating new fields
DROP POLICY IF EXISTS "update own profile" ON public.profiles;
CREATE POLICY "update own profile" ON public.profiles
FOR UPDATE USING (id = auth.uid())
WITH CHECK (id = auth.uid());