# DABO — Sous-tâches V1

Copier les dossiers `app`, `lib`, `tests` et `supabase` à la racine de `dabo-app` en acceptant les remplacements.

Ne pas déployer avant d'avoir :
1. exécuté `npm run verify` ;
2. appliqué `supabase/migrations/20260917_task_subtasks_v1.sql` dans Supabase.

La migration crée uniquement `task_subtasks` et ses politiques RLS. Elle ne modifie ni ne supprime les tâches existantes.
