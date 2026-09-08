-- DABO — correctif ciblé des permissions serveur pour les mesures
-- Les routes /api/share-app et /api/acquisition-event utilisent le rôle serveur service_role.
-- RLS reste activé et aucun droit n'est accordé à anon/authenticated.

begin;

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.app_share_events to service_role;
grant select, insert, update, delete on table public.acquisition_events to service_role;

commit;
