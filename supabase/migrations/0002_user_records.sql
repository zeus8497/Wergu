-- Stockage générique temporaire pour migration progressive des modules.
-- Une table métier par module pourra remplacer ce modèle après audit du code actuel.
create table if not exists public.user_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null check (module in ('today','running','workout','nutrition','hydration','sleep','finances','savings','progress','settings')),
  record_date date,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists user_records_owner_module_idx on public.user_records(user_id, module, record_date);
alter table public.user_records enable row level security;
create policy "records_select_own" on public.user_records for select to authenticated using ((select auth.uid()) = user_id);
create policy "records_insert_own" on public.user_records for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "records_update_own" on public.user_records for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "records_delete_own" on public.user_records for delete to authenticated using ((select auth.uid()) = user_id);
