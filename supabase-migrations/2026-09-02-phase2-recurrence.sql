-- DABO V2 — Phase 2 : migration corrective Phase 1 + Phase 2
-- Adaptée à la structure Supabase réelle vérifiée le 2026-09-02.
-- Cette migration ne supprime aucune tâche ni aucun historique.

begin;

-- 1) Compléter les métadonnées Phase 1 manquantes sur les tâches.
-- Nullable volontairement : on n'invente pas durée/effort pour l'historique existant.
alter table tasks add column if not exists duration_key text;
alter table tasks add column if not exists effort_level text;

-- 2) Enrichir le modèle de routine pour la Phase 2.
alter table routines add column if not exists custom_days integer[];
alter table routines add column if not exists duration_key text;
alter table routines add column if not exists effort_level text;
alter table routines add column if not exists anchor_date date;
alter table routines add column if not exists ended_at timestamptz;

-- 3) Étendre les fréquences autorisées sans casser weekly/monthly existants.
alter table routines drop constraint if exists routines_frequency_check;
alter table routines add constraint routines_frequency_check
  check (frequency in ('daily','weekly','biweekly','monthly','yearly','custom'));

-- 4) Valider les jours personnalisés.
-- Une routine custom doit avoir au moins un jour, uniquement entre 0 et 6.
-- Les autres fréquences ne stockent pas custom_days.
alter table routines drop constraint if exists routines_custom_days_check;
alter table routines add constraint routines_custom_days_check check (
  (frequency <> 'custom' and custom_days is null)
  or
  (
    frequency = 'custom'
    and custom_days is not null
    and cardinality(custom_days) > 0
    and custom_days <@ array[0,1,2,3,4,5,6]::integer[]
  )
);

-- 5) Poser une ancre calendaire pour les routines existantes.
-- On utilise la première échéance connue ; sinon la date de création.
update routines r
set anchor_date = coalesce(
  (
    select min(t.due_date)
    from tasks t
    where t.routine_id = r.id
      and t.due_date is not null
  ),
  r.created_at::date
)
where r.anchor_date is null;

-- 6) Protection multi-appareils : une seule occurrence ACTIVE (pending)
-- par routine et par date. Les occurrences historiques 'done' restent autorisées.
create unique index if not exists tasks_one_pending_per_routine_due_date
  on tasks (routine_id, due_date)
  where routine_id is not null
    and due_date is not null
    and status = 'pending';

commit;
