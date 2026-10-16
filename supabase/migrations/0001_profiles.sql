-- Première migration, à exécuter dans un projet Supabase configuré.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  height_cm numeric(5,2),
  weight_kg numeric(6,2),
  goals jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profile_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profile_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profile_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profile_delete_own" on public.profiles for delete to authenticated using ((select auth.uid()) = id);
