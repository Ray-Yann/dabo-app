-- DABO — Autorisations SQL manquantes pour les promotions communautaires.
-- Cette migration est idempotente et ne modifie ni ne supprime aucune donnée.

begin;

grant select, insert, update, delete on table public.promos to authenticated;
grant select, insert, update, delete on table public.promo_comments to authenticated;

revoke all on table public.promos from anon;
revoke all on table public.promo_comments from anon;

commit;
