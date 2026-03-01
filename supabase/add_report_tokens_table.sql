-- Run this in Supabase SQL Editor
-- Stores full audit payloads against a secure token sent via email
create table if not exists public.report_tokens (
  id          uuid primary key default gen_random_uuid(),
  token       text unique not null default gen_random_uuid()::text,
  email       text not null,
  url         text,
  domain      text,
  score       integer,
  audit_data  jsonb not null,
  viewed_at   timestamp with time zone,
  created_at  timestamp with time zone not null default now(),
  expires_at  timestamp with time zone not null default (now() + interval '7 days')
);

-- RLS: public read (token is a secret UUID — unguessable), server-side insert
alter table public.report_tokens enable row level security;

create policy "Public read by token" on public.report_tokens
  for select using (true);

create policy "Server insert" on public.report_tokens
  for insert with check (true);

create policy "Server update" on public.report_tokens
  for update using (true);

-- Index for fast token lookups
create index if not exists report_tokens_token_idx on public.report_tokens (token);
