# DABO — Profils membres V1

Base : `dabo-app-PROPRE-20260911-234056.zip`

## Objectif
Finaliser la fonction avatar déjà présente sans ajouter de complexité : les photos deviennent privées, restent propres à chaque profil de foyer et sont nettoyées au départ d'un membre.

## Installation
1. Copier les fichiers du patch dans `dabo-app` en conservant l'arborescence.
2. Dans Supabase > SQL Editor, exécuter **uniquement** :
   `supabase-migrations/2026-09-11-member-profiles-v1-private-avatars.sql`
3. Ne pas rejouer `supabase-schema.sql` ni les anciennes migrations.
4. Lancer `npm run verify`.
5. Ne pousser sur GitHub qu'après validation complète.

## Contrôles production après Vercel Ready
- Une photo existante reste visible pour les membres du foyer.
- Un membre extérieur au foyer ne peut pas lire cette photo.
- Ajouter/remplacer une photo fonctionne.
- Passer photo → symbole → initiales supprime l'ancien fichier privé.
- Un profil dans plusieurs foyers peut garder une identité différente dans chaque foyer.
- Clair/sombre et mobile restent lisibles.
