# DABO V2 — Suggestions intelligentes V1.2

## Contenu du patch
- `app/app/bilan/page.tsx`
- `lib/household-action-suggestions.ts`
- `lib/i18n.ts`
- `tests/household-action-suggestions-v1.test.ts`
- `tests/household-action-suggestions-v12-persistence.test.ts`
- `supabase/migrations/20260916_household_action_suggestions_v12.sql`

## Ordre
1. Copier `app`, `lib`, `tests` et `supabase` à la racine de `dabo-app` et fusionner/remplacer.
2. Exécuter le SQL `supabase/migrations/20260916_household_action_suggestions_v12.sql` dans Supabase SQL Editor.
3. Lancer `npm run verify` localement.
4. Si tout est vert : commit/push GitHub puis vérifier Vercel Ready.

## V1.2
DABO mémorise explicitement une suggestion acceptée. Une attribution ordinaire n'est plus confondue avec une correction DABO. La correction reste en cours tant que la tâche est en attente, puis DABO attend la confirmation de la contribution. L'impact n'est considéré comme mesuré qu'après contribution confirmée. Une suppression/réattribution libère le moteur.
