-- ILEWA waitlist referral engine
-- Run this once in the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.waitlist_members (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 3 and 254),
  email_normalized text generated always as (lower(btrim(email))) stored,
  first_name text,
  referral_code text not null default upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10)),
  referred_by uuid references public.waitlist_members(id) on delete set null,
  verified_referral_count integer not null default 0 check (verified_referral_count >= 0),
  source text,
  attribution jsonb not null default '{}'::jsonb,
  consent_at timestamptz,
  verified_at timestamptz,
  verification_token_hash text,
  verification_expires_at timestamptz,
  dashboard_token_hash text,
  last_confirmation_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint waitlist_no_self_referral check (referred_by is null or referred_by <> id)
);

create unique index if not exists waitlist_members_email_unique
  on public.waitlist_members (email_normalized);

create unique index if not exists waitlist_members_referral_code_unique
  on public.waitlist_members (referral_code);

create index if not exists waitlist_members_referred_by_idx
  on public.waitlist_members (referred_by)
  where referred_by is not null;

create index if not exists waitlist_members_rank_idx
  on public.waitlist_members (verified_referral_count desc, created_at asc)
  where verified_at is not null;

create index if not exists waitlist_members_verification_hash_idx
  on public.waitlist_members (verification_token_hash)
  where verification_token_hash is not null;

create index if not exists waitlist_members_dashboard_hash_idx
  on public.waitlist_members (dashboard_token_hash)
  where dashboard_token_hash is not null;

alter table public.waitlist_members enable row level security;
revoke all on table public.waitlist_members from anon, authenticated;

create or replace function public.set_waitlist_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_waitlist_updated_at on public.waitlist_members;
create trigger set_waitlist_updated_at
before update on public.waitlist_members
for each row execute function public.set_waitlist_updated_at();

create or replace function public.adjust_verified_referral_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.verified_at is null and new.verified_at is not null and new.referred_by is not null then
      update public.waitlist_members
      set verified_referral_count = verified_referral_count + 1
      where id = new.referred_by;
    elsif old.verified_at is not null and new.verified_at is null and old.referred_by is not null then
      update public.waitlist_members
      set verified_referral_count = greatest(verified_referral_count - 1, 0)
      where id = old.referred_by;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' and old.verified_at is not null and old.referred_by is not null then
    update public.waitlist_members
    set verified_referral_count = greatest(verified_referral_count - 1, 0)
    where id = old.referred_by;
  end if;
  return old;
end;
$$;

drop trigger if exists adjust_referral_count_on_verification on public.waitlist_members;
create trigger adjust_referral_count_on_verification
after update of verified_at on public.waitlist_members
for each row execute function public.adjust_verified_referral_count();

drop trigger if exists adjust_referral_count_on_delete on public.waitlist_members;
create trigger adjust_referral_count_on_delete
after delete on public.waitlist_members
for each row execute function public.adjust_verified_referral_count();

create or replace function public.get_waitlist_status(p_dashboard_token_hash text)
returns table (
  first_name text,
  referral_code text,
  verified_referrals integer,
  rank_position bigint,
  total_verified bigint,
  total_signups bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select *
    from public.waitlist_members
    where dashboard_token_hash = p_dashboard_token_hash
    limit 1
  )
  select
    me.first_name,
    me.referral_code,
    me.verified_referral_count,
    case
      when me.verified_at is null then null
      else 1 + (
        select count(*)
        from public.waitlist_members other
        where other.verified_at is not null
          and (
            other.verified_referral_count > me.verified_referral_count
            or (
              other.verified_referral_count = me.verified_referral_count
              and (other.created_at, other.id) < (me.created_at, me.id)
            )
          )
      )
    end as rank_position,
    (select count(*) from public.waitlist_members where verified_at is not null) as total_verified,
    (select count(*) from public.waitlist_members) as total_signups
  from me;
$$;

revoke all on function public.get_waitlist_status(text) from public, anon, authenticated;
grant execute on function public.get_waitlist_status(text) to service_role;

-- Optional import for your existing 60 signups.
-- Replace legacy_waitlist and its column names with your current table.
-- Only set verified_at when the old form captured valid email consent.
--
-- insert into public.waitlist_members (email, first_name, source, consent_at, verified_at)
-- select email, first_name, 'legacy-waitlist', created_at, created_at
-- from public.legacy_waitlist
-- on conflict (email_normalized) do nothing;
