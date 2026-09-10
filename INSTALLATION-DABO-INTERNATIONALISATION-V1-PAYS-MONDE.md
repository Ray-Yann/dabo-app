# DABO — Internationalisation V1 : pays du monde

1. Exécuter `supabase-migrations/2026-09-10-internationalisation-v1-all-countries.sql` dans Supabase SQL Editor.
2. Copier le patch à la racine de `dabo-app`.
3. Lancer `npm run verify`.
4. Commit GitHub Desktop : `Internationalisation V1 - pays du monde`
5. Push, attendre Vercel Ready, puis tester plusieurs pays dans Réglages et Courses.

Aucun GPS n'est demandé. Le pays reste un réglage du foyer. Les noms sont affichés via `Intl.DisplayNames` selon la langue active de DABO.
