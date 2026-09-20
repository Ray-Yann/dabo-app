-- DABO — Photos et avatars personnalisés des membres
-- À exécuter une seule fois dans Supabase > SQL Editor.

alter table public.members
  add column if not exists avatar_url text,
  add column if not exists avatar_emoji text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'member-avatars',
  'member-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar personnel - ajouter" on storage.objects;
create policy "Avatar personnel - ajouter"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'member-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Avatar personnel - modifier" on storage.objects;
create policy "Avatar personnel - modifier"
on storage.objects for update to authenticated
using (
  bucket_id = 'member-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'member-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Avatar personnel - supprimer" on storage.objects;
create policy "Avatar personnel - supprimer"
on storage.objects for delete to authenticated
using (
  bucket_id = 'member-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
