/*
  # Create auth trigger for user profiles

  1. New Functions
    - `handle_new_user()` - Creates user profile when auth user is created
  
  2. New Triggers  
    - `on_auth_user_created` - Triggers profile creation on user signup
    
  3. Security
    - Function runs with security definer to bypass RLS
    - Handles errors gracefully to prevent signup failures
*/

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role, credits)
  VALUES (new.id, new.email, 'user', 0);
  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create user profile for %: %', new.id, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();