# DABO Courses V2.2 — Magasins par pays

1. Exécuter `supabase-migrations/2026-09-10-courses-v2-2-stores-by-country.sql` dans Supabase SQL Editor.
2. Copier le patch à la racine de `dabo-app`.
3. Lancer `npm run verify`.
4. GitHub Desktop : Summary `Courses V2.2 - magasins adaptes au pays du foyer` puis Commit/Push.
5. Attendre Vercel Ready avant le test Production UX.

Le pays est enregistré au niveau du foyer et reste modifiable dans Réglages. Le catalogue global est filtré par pays. Les magasins propres au foyer restent visibles. Aucun achat ni identifiant de foyer n'est partagé dans le catalogue global.
