-- =========================================================
-- SiteScore Database Schema
-- Run this entire file in the Supabase SQL Editor
-- =========================================================

-- 1. Profiles table (extends auth.users)
create table if not exists public.profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  email      text,
  full_name  text,
  industry   text,
  plan       text not null default 'free',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Websites table
create table if not exists public.websites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  url        text not null,
  domain     text not null,
  created_at timestamp with time zone not null default now(),
  unique(user_id, domain)
);

alter table public.websites enable row level security;

create policy "Users manage own websites"
  on public.websites for all using (auth.uid() = user_id);


-- 3. Audits table (full payload stored as JSONB)
create table if not exists public.audits (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  website_id     uuid references public.websites(id) on delete set null,
  url            text not null,
  overall_score  integer not null check (overall_score >= 0 and overall_score <= 100),
  data           jsonb not null,
  created_at     timestamp with time zone not null default now()
);

alter table public.audits enable row level security;

create policy "Users manage own audits"
  on public.audits for all using (auth.uid() = user_id);

-- Index for fast per-user history queries
create index if not exists audits_user_id_created_at_idx
  on public.audits (user_id, created_at desc);

create index if not exists audits_website_id_created_at_idx
  on public.audits (website_id, created_at desc);
