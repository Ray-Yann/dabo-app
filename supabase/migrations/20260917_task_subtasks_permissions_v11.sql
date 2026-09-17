-- DABO V2 — Sous-tâches V1.2
-- Pérennise les privilèges SQL nécessaires en complément des policies RLS.
grant select, insert, update, delete
on table public.task_subtasks
to authenticated;
