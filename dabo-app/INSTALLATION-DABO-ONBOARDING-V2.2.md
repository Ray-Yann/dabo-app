# DABO Onboarding V2.2 — rôle sécurisé à l'invitation

1. Copier le contenu de ce patch à la racine du projet DABO en remplaçant `app/page.tsx`.
2. Dans Supabase SQL Editor, exécuter **uniquement** :
   `supabase-migrations/2026-09-11-onboarding-v2-2-safe-join-role.sql`
3. Lancer :
   `npm run verify`
4. Commit/Push uniquement après validation complète.

Ce correctif déplace l'attribution du rôle lors d'une invitation vers un RPC PostgreSQL `SECURITY DEFINER`, afin que les RLS ne fassent plus croire au client qu'un foyer existant est vide. Un foyer réellement vide conserve le mécanisme de récupération du rôle créateur.
