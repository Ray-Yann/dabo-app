# DABO — Correctif Activation V1

Ce correctif ajoute explicitement l’onglet **Activation** à la navigation du cockpit Admin.

## Installation
1. Décompresser le ZIP dans le dossier racine `dabo-app`.
2. Accepter le remplacement de `app/admin/page.tsx`.
3. Lancer `npm run verify`.
4. Si PASS : commit/push avec GitHub Desktop, attendre Vercel Ready.
5. Tester `/admin` en production et ouvrir **Activation**.

Aucune migration Supabase. Aucune variable Vercel. Aucun secret.
