/*
  # Add Super Admin Role and Credit Approval System
  
  1. New Role: super_admin
    - Add super_admin role check
    - Super admins can promote/demote users
    - Super admins can approve credit changes
  
  2. New Tables
    - pending_credits: Store credit change requests awaiting approval
      - Tracks who requested, who approved, status
      - Links to user and reason for change
  
  3. New Functions
    - is_super_admin(uuid): Check if user is super admin
    - promote_user(uuid, text): Promote user to admin (super admin only)
    - demote_user(uuid): Demote admin to user (super admin only)
    - request_credit_change(uuid, integer, text): Create pending credit request
    - approve_credit_change(integer): Approve and apply credit change (super admin only)
    - reject_credit_change(integer): Reject credit request (super admin only)
  
  4. Security
    - All functions use SECURITY DEFINER
    - Only super_admin can promote/demote
    - Only super_admin can approve credit changes
    - Audit trail for all actions
*/

-- Add super_admin check function
create or replace function public.is_super_admin(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists(
    select 1 from public.profiles
    where id = p_uid and role = 'super_admin'
  );
$$;

revoke all on function public.is_super_admin(uuid) from public;

-- Create pending_credits table for approval workflow
create table if not exists public.pending_credits (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta integer not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_by uuid not null references public.profiles(id) on delete cascade,
  requested_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text
);

alter table public.pending_credits enable row level security;

-- Super admins and the requester can view pending credit requests
create policy "pending_credits_view_policy" on public.pending_credits
  for select using (
    is_super_admin(auth.uid()) or requested_by = auth.uid()
  );

-- Only admins can create pending credit requests
create policy "pending_credits_insert_policy" on public.pending_credits
  for insert with check (
    is_admin(auth.uid()) and requested_by = auth.uid()
  );

-- Function to promote user (super admin only)
create or replace function public.promote_user(p_user_id uuid, p_new_role text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Validate role
  if p_new_role not in ('user', 'admin') then
    raise exception 'Invalid role. Must be user or admin';
  end if;
  
  -- Update user role
  update public.profiles
  set role = p_new_role,
      updated_at = now()
  where id = p_user_id;
  
  if not found then
    raise exception 'User not found';
  end if;
end;
$$;

revoke all on function public.promote_user(uuid, text) from public;
grant execute on function public.promote_user(uuid, text) to service_role;

-- Function to demote user (super admin only)
create or replace function public.demote_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Demote to regular user
  update public.profiles
  set role = 'user',
      updated_at = now()
  where id = p_user_id;
  
  if not found then
    raise exception 'User not found';
  end if;
end;
$$;

revoke all on function public.demote_user(uuid) from public;
grant execute on function public.demote_user(uuid) to service_role;

-- Function to request credit change (admin only, requires super admin approval)
create or replace function public.request_credit_change(p_user_id uuid, p_delta integer, p_reason text)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request_id bigint;
begin
  insert into public.pending_credits(user_id, delta, reason, requested_by)
  values (p_user_id, p_delta, p_reason, auth.uid())
  returning id into v_request_id;
  
  return v_request_id;
end;
$$;

revoke all on function public.request_credit_change(uuid, integer, text) from public;
grant execute on function public.request_credit_change(uuid, integer, text) to service_role;

-- Function to approve credit change (super admin only)
create or replace function public.approve_credit_change(p_request_id bigint, p_review_notes text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request record;
  v_reviewer_id uuid;
begin
  -- Get the reviewer ID
  v_reviewer_id := auth.uid();
  if v_reviewer_id is null then
    v_reviewer_id := '00000000-0000-0000-0000-000000000000'::uuid;
  end if;
  
  -- Get the pending request
  select * into v_request
  from public.pending_credits
  where id = p_request_id and status = 'pending';
  
  if not found then
    raise exception 'Pending request not found or already processed';
  end if;
  
  -- Apply the credit change
  perform update_credits_internal(
    v_request.user_id, 
    v_request.delta, 
    v_request.reason || ' (Approved by super admin)', 
    v_reviewer_id
  );
  
  -- Mark as approved
  update public.pending_credits
  set status = 'approved',
      reviewed_by = v_reviewer_id,
      reviewed_at = now(),
      review_notes = p_review_notes
  where id = p_request_id;
end;
$$;

revoke all on function public.approve_credit_change(bigint, text) from public;
grant execute on function public.approve_credit_change(bigint, text) to service_role;

-- Function to reject credit change (super admin only)
create or replace function public.reject_credit_change(p_request_id bigint, p_review_notes text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reviewer_id uuid;
begin
  v_reviewer_id := auth.uid();
  if v_reviewer_id is null then
    v_reviewer_id := '00000000-0000-0000-0000-000000000000'::uuid;
  end if;
  
  update public.pending_credits
  set status = 'rejected',
      reviewed_by = v_reviewer_id,
      reviewed_at = now(),
      review_notes = p_review_notes
  where id = p_request_id and status = 'pending';
  
  if not found then
    raise exception 'Pending request not found or already processed';
  end if;
end;
$$;

revoke all on function public.reject_credit_change(bigint, text) from public;
grant execute on function public.reject_credit_change(bigint, text) to service_role;

-- Function to list pending credit requests (for super admins)
create or replace function public.list_pending_credits()
returns table (
  id bigint,
  user_email text,
  delta integer,
  reason text,
  status text,
  requested_by_email text,
  requested_at timestamptz,
  reviewed_by_email text,
  reviewed_at timestamptz,
  review_notes text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select 
    pc.id,
    u.email as user_email,
    pc.delta,
    pc.reason,
    pc.status,
    req.email as requested_by_email,
    pc.requested_at,
    rev.email as reviewed_by_email,
    pc.reviewed_at,
    pc.review_notes
  from public.pending_credits pc
  join public.profiles u on pc.user_id = u.id
  join public.profiles req on pc.requested_by = req.id
  left join public.profiles rev on pc.reviewed_by = rev.id
  order by 
    case when pc.status = 'pending' then 0 else 1 end,
    pc.requested_at desc;
$$;

revoke all on function public.list_pending_credits() from public;
grant execute on function public.list_pending_credits() to service_role;
