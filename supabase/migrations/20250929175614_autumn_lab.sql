/*
  # Setup profiles table with proper RLS and triggers

  1. RLS Policies
    - Enable RLS on profiles table
    - Allow users to read their own profile
    - Allow users to update their own profile

  2. Triggers
    - Create function to handle new user signup
    - Create trigger to automatically create profile on user signup

  3. Security
    - Proper RLS policies for user access
    - Secure function for profile creation
*/

-- Enable RLS on profiles table
alter table public.profiles enable row level security;

-- Drop existing policies if they exist
drop policy if exists "read own profile" on public.profiles;
drop policy if exists "update own profile" on public.profiles;

-- Create policy for users to read their own profile
create policy "read own profile"
on public.profiles for select
using (id = auth.uid());

-- Create policy for users to update their own profile
create policy "update own profile"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

-- Create function to handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end; $$;

-- Drop existing trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create trigger to automatically create profile on user signup
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();