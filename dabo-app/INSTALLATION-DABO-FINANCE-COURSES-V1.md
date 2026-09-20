# DABO Finance V1 — Courses → Finance

Ce lot relie les achats réels de Courses au Budget sans demander le prix de chaque article.

## Comportement
- chaque article coché comme acheté alimente une session Courses ;
- une nouvelle action d'achat remet le compteur de calme à zéro ;
- après environ 10 minutes sans nouvel achat, DABO peut proposer le récapitulatif ;
- l'utilisateur saisit uniquement le total et choisit qui a payé ;
- `Enregistrer` crée UNE seule dépense `Courses` liée à la session ;
- `Plus tard` repousse la proposition ;
- `Pas cette fois` ferme cette session sans dépense ;
- le moteur empêche deux dépenses pour la même session.

## Installation
1. Copier le contenu de ce ZIP à la racine de `dabo-app`.
2. Lancer `npm run verify`.
3. Si la validation locale est PASS, exécuter uniquement :
   `supabase-migrations/2026-09-09-finance-v1-shopping-bridge.sql`
4. Ensuite seulement : GitHub Desktop → commit → push → Vercel.
5. Tester en production sur une petite session Courses.

Aucun secret ni `.env` n'est inclus.
