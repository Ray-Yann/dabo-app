-- Navigation Persistence V1.2
--
-- Les policies RLS définissent quelles lignes un utilisateur authentifié peut
-- lire/écrire, mais elles n'accordent pas les privilèges SQL sur la table.
-- Sans ces GRANT, les upserts client échouent avant même l'évaluation des RLS.

grant select, insert, update
on table public.user_navigation_preferences
to authenticated;

-- DABO n'a besoin d'aucun de ces privilèges côté client.
revoke truncate, trigger, references
on table public.user_navigation_preferences
from anon, authenticated;
