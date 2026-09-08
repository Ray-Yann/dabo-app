# DABO — LOBA V6 · Funnel d’acquisition attribué

Cette version mesure les nouveaux parcours sans reconstruire artificiellement l’historique.

## Ordre d’installation

1. Dans Supabase > SQL Editor, exécuter uniquement :
   `supabase-migrations/2026-09-08-acquisition-funnel.sql`
2. Copier les fichiers du correctif dans le projet DABO en conservant les dossiers.
3. Dans PowerShell, à la racine de `dabo-app` :
   `npm run verify`
4. Si tout est PASS, commit/push avec GitHub Desktop puis attendre Vercel Ready.
5. Tester ensuite en production : partager DABO depuis Réglages, ouvrir le lien partagé dans un navigateur privé, puis revenir dans Admin > LOBA Intelligence.

## Ce qui est mesuré

- `landing_view` : visite de la page d’entrée.
- `signup_completed` : inscription réussie.
- `household_created` / `household_joined` : activation vers un foyer.
- `first_value` : première création d’une tâche, d’un article de courses ou d’un événement.
- `app_open` : ouverture de DABO, utilisée pour les cohortes J1/J7/J30.
- Les liens issus de “Faire connaître DABO” portent un identifiant de recommandation aléatoire, sans e-mail ni identité du destinataire.

## Garde-fous

- Aucun destinataire de partage n’est collecté.
- Les données de mesure ne doivent jamais bloquer l’usage de DABO.
- Les tables de mesure ont RLS activé et aucune policy navigateur ; les écritures passent par la route serveur.
- LOBA ne doit pas conclure sur J1/J7/J30 tant que les cohortes ne sont pas éligibles et suffisamment nombreuses.
- Les données historiques antérieures à l’installation ne sont pas inventées ni rétroattribuées.
