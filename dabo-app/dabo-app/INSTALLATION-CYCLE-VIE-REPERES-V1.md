# DABO V2 — Cycle de vie des repères V1

Patch minimal à copier-coller.

## Ce que fait V1
- Un nouveau repère peut apparaître dans Aujourd’hui.
- Quand l’utilisateur consulte ce repère, DABO mémorise cette consultation.
- Le même état est temporisé pendant 3 jours.
- Si les données du repère changent réellement, il peut revenir immédiatement.
- Après 3 jours, il peut revenir uniquement si le moteur le juge toujours pertinent.
- Si le foyer passe en amélioration/stable/données insuffisantes, le moteur reste silencieux comme avant.
- La mémoire est par utilisateur + foyer : consulter un repère ne le masque pas pour les autres membres.
- Les urgences continuent d’être arbitrées par Attention Engine.
- Aucune IA payante, aucun score, aucun classement.

## Installation
Copier `app`, `lib`, `tests` et `supabase-migrations` à la racine de `dabo-app`.

IMPORTANT : avant le test production, exécuter la migration
`supabase-migrations/2026-09-16-household-attention-lifecycle-v1.sql`
dans Supabase SQL Editor.
