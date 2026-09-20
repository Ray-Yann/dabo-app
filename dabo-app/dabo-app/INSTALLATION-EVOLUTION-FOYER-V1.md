# DABO V2 — Évolution du foyer V1

Patch minimal, sans migration Supabase et sans nouvelle dépendance.

Copier les dossiers `app` et `tests` dans la racine de `dabo-app` en acceptant la fusion/remplacement.

Puis lancer `npm run verify`.

## Comportement
- Le Bilan affiche désormais l'évolution observée sur deux fenêtres de 7 jours.
- Les états existants `building`, `improving`, `stable` et `watch` sont réutilisés.
- La comparaison repose uniquement sur les contributions confirmées.
- Si la semaine précédente est insuffisante, DABO le dit explicitement.
- DABO ne prétend jamais qu'une suggestion a causé une évolution.
- Aucune nouvelle table Supabase.
