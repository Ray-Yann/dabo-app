# DABO — Courses V2 : Magasins & organisation d’achat

## Objectif
Permettre d’indiquer où acheter chaque article, apprendre les nouveaux magasins du foyer et regrouper la liste par magasin.

## Installation
1. Dans Supabase SQL Editor, exécuter uniquement `supabase-migrations/2026-09-10-courses-v2-stores.sql`.
2. Remplacer les fichiers applicatifs par ceux de ce lot.
3. Commit / push puis attendre `Vercel Ready`.

## Comportement V1
- Le magasin est facultatif.
- DABO propose une liste de magasins courants + ceux déjà ajoutés par le foyer.
- « Autre magasin… » ouvre un champ libre.
- Un magasin libre est mémorisé dans `household_stores` et reproposé ensuite.
- `shopping_items.store_name` garde le magasin de l’article et son historique.
- Les articles à acheter sont regroupés par magasin ; les autres restent dans « Sans magasin ».
- Aucun service externe, géolocalisation ou API payante.

## Non inclus volontairement
- Comparaison de prix.
- Plusieurs magasins par article.
- Base mondiale partagée entre foyers.
- Géolocalisation automatique.
