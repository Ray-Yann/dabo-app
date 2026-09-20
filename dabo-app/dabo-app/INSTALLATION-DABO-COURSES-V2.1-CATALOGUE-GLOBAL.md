# DABO Courses V2.1 — Catalogue global de magasins

## Objectif
Quand un foyer ajoute un nouveau magasin via « Autre magasin… », son **nom uniquement** enrichit le catalogue commun DABO. Les autres foyers peuvent ensuite le choisir directement.

Les courses, quantités, assignations, habitudes, membres et identifiants de foyer restent privés.

## Installation
1. Dans Supabase > SQL Editor > New query, exécuter intégralement :
   `supabase-migrations/2026-09-10-courses-v2-1-global-stores.sql`
2. Vérifier : `Success. No rows returned`.
3. Copier le patch dans `dabo-app` si ce document provient du ZIP patch.
4. Dans PowerShell, à la racine de `dabo-app` :
   `npm run verify`
5. GitHub Desktop :
   Summary : `Courses V2.1 - catalogue global de magasins`
6. Commit to main > Push origin > attendre Vercel Ready.

## Test Production UX
- Foyer A : ajouter un magasin inédit via « Autre magasin… » et enregistrer une course.
- Foyer B : ouvrir l'ajout d'une course.
- Le magasin du foyer A doit apparaître directement dans la liste proposée du foyer B.
- Vérifier qu'aucune course ni information du foyer A n'est visible dans le foyer B.
