# DABO Finance V1 — Interface Budget

Ce correctif part de DABO Finance V1 Fondation déjà validée (59/59 tests, Supabase, Vercel Ready).

## Contenu
- `app/app/equilibre/budget/page.tsx` : vraie interface Budget reliée aux tables Finance Supabase.
- `app/app/equilibre/page.tsx` : sélecteur Organisation / Budget sans 7e onglet principal.
- `app/app/layout.tsx` : garde Équilibre actif dans la navigation sur la sous-page Budget.
- `supabase-migrations/2026-09-09-finance-v1-ui.sql` : fonction atomique pour payer une facture sans double comptage.

## Fonctionnalités de ce lot
- cockpit Déjà dépensé / Encore à payer / Engagements connus ;
- périodes semaine, mois, trimestre, semestre, année ;
- ajout manuel d'une dépense ;
- ajout d'une facture ponctuelle ;
- repère mensuel facultatif par catégorie ;
- choix du membre qui a payé ;
- marquage d'une facture comme payée avec création atomique d'une seule dépense liée ;
- listes des dépenses, factures ouvertes et repères ;
- multi-foyers via le contexte actif existant ;
- aucune fusion entre équilibre domestique et argent ;
- aucun nouveau package, aucune variable Vercel.

## Ordre de validation
1. Copier le contenu à la racine de `dabo-app`.
2. `npm run verify`.
3. Seulement si tout est vert, exécuter `supabase-migrations/2026-09-09-finance-v1-ui.sql` dans Supabase SQL Editor.
4. GitHub Desktop : Summary `Ajoute l’interface Budget de DABO Finance V1`.
5. Commit / Push.
6. Attendre Vercel Ready.
7. Tester réellement en production : dépense, facture, repère, paiement facture et changement de période.

Vercel Ready valide le déploiement, pas le comportement fonctionnel.
