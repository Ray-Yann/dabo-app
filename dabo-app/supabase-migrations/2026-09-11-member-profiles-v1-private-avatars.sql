-- DABO — Profils membres V1 : photos privées et chemin de stockage maîtrisé.
-- Migration incrémentale : ne pas rejouer supabase-schema.sql.

alter table public.members
  add column if not exists avatar_path text;

-- Récupère le chemin des photos historiques avant de rendre le bucket privé.
update public.members
set avatar_path = split_part(avatar_url, '/storage/v1/object/public/member-avatars/', 2)
where avatar_path is null
  and avatar_url like '%/storage/v1/object/public/member-avatars/%';

update storage.buckets
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'member-avatars';

-- Les écritures restent strictement limitées au dossier du compte connecté.
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

-- Aucun SELECT direct n'est accordé au bucket privé : la lecture passe par
-- /api/member-avatar/[memberId], qui vérifie l'appartenance au même foyer.
drop policy if exists "Avatar personnel - lire" on storage.objects;
