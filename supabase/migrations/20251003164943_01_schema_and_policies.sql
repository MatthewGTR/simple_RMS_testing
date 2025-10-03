/*
  # Schema and RLS Policies

  1. Tables
    - `profiles` - User profiles with email normalization
      - id (uuid, references auth.users)
      - email (text)
      - email_norm (generated column, lowercase email)
      - full_name (text)
      - role (text, default 'user', check constraint)
      - credits (integer, default 0)
      - created_at (timestamptz)
      - updated_at (timestamptz)
    
    - `credits_log` - Audit log for credit changes
      - id (bigserial)
      - user_id (uuid, references profiles)
      - delta (integer)
      - reason (text)
      - created_at (timestamptz)
      - created_by (uuid)

  2. Security
    - Enable RLS on profiles table
    - Users can read their own profile
    - Users can update their own profile
    - Email normalization via generated column
    - Automatic updated_at timestamp trigger

  3. Indexes
    - Unique index on normalized email
*/

begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  email_norm text generated always as (lower(email)) stored,
  full_name text,
  role text default 'user' check (role in ('user','admin')),
  credits integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists profiles_email_norm_key
  on public.profiles(email_norm) where email_norm is not null;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
for select using (id = auth.uid());

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
for update using (id = auth.uid())
with check (id = auth.uid());

create table if not exists public.credits_log (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta integer not null,
  reason text,
  created_at timestamptz default now(),
  created_by uuid
);

commit;
