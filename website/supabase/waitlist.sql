create extension if not exists "pgcrypto";

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  agency text,
  created_at timestamptz not null default now(),
  referral_code text not null unique,
  referred_by text
);

alter table public.waitlist
  add column if not exists agency text;

create index if not exists waitlist_created_at_idx
  on public.waitlist (created_at desc);

create index if not exists waitlist_referred_by_idx
  on public.waitlist (referred_by);
