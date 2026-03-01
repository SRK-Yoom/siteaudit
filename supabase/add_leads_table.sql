-- Run this in Supabase SQL Editor to add email lead capture
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  url         text,
  score       integer,
  created_at  timestamp with time zone not null default now(),
  updated_at  timestamp with time zone not null default now()
);

alter table public.leads enable row level security;

-- Only service role can read (admin access only)
create policy "Service role only" on public.leads
  for all using (false);
