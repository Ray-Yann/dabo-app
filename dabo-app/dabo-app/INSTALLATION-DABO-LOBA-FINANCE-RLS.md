# DABO — Correctif LOBA Finance RLS

Ce lot remplace l'accès Finance de LOBA par un client serveur portant le JWT de l'utilisateur.
Les politiques RLS Finance existantes s'appliquent donc aux lectures et écritures directes.

## Ordre d'installation
1. Copier le contenu du ZIP à la racine de `dabo-app` et accepter les remplacements.
2. Exécuter `npm run verify`.
3. Ne pas exécuter la migration tant que la validation locale n'est pas PASS.
4. Ensuite seulement, exécuter dans Supabase SQL Editor :
   `supabase-migrations/2026-09-10-loba-finance-rls-authenticated.sql`
5. Commit / push / Vercel.
6. Refaire d'abord le test lecture : `Combien avons-nous dépensé ce mois-ci ?`

Ne jamais exécuter `supabase-schema.sql` complet.
