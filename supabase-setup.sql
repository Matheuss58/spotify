-- Execute este arquivo uma vez no SQL Editor do Supabase.

create table if not exists public.tracks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  artist text not null default 'Artista desconhecido',
  album text not null default 'Importados',
  original_name text,
  mime_type text,
  size bigint not null default 0,
  duration double precision not null default 0,
  favorite boolean not null default false,
  storage_path text,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists tracks_user_updated_idx on public.tracks(user_id, updated_at desc);
alter table public.tracks enable row level security;
revoke all on public.tracks from anon;
grant select, insert, update, delete on public.tracks to authenticated;
drop policy if exists "Users manage their own tracks" on public.tracks;
create policy "Users manage their own tracks" on public.tracks
  for all to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create table if not exists public.library_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  playlists jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.library_state enable row level security;
revoke all on public.library_state from anon;
grant select, insert, update, delete on public.library_state to authenticated;
drop policy if exists "Users manage their own library state" on public.library_state;
create policy "Users manage their own library state" on public.library_state
  for all to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

insert into storage.buckets (id, name, public)
values ('music', 'music', false)
on conflict (id) do update set public = false;

drop policy if exists "Users read their own music" on storage.objects;
create policy "Users read their own music" on storage.objects
  for select to authenticated
  using (bucket_id = 'music' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users upload their own music" on storage.objects;
create policy "Users upload their own music" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'music' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users update their own music" on storage.objects;
create policy "Users update their own music" on storage.objects
  for update to authenticated
  using (bucket_id = 'music' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'music' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users delete their own music" on storage.objects;
create policy "Users delete their own music" on storage.objects
  for delete to authenticated
  using (bucket_id = 'music' and (storage.foldername(name))[1] = (select auth.uid())::text);
