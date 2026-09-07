# DABO — Correctif Samsung / Android thème V2

Copier le contenu de ce ZIP à la racine de `dabo-app` et accepter le remplacement des 3 fichiers.

Fichiers :
- `app/globals.css`
- `app/app/layout.tsx`
- `components/BalanceBar.tsx`

Aucune migration SQL. Aucune variable Vercel.

Puis lancer :
`npm run verify`

Ce V2 ne dépend plus de la classe générique `.dark` pour les couleurs de DABO. Le thème clair/sombre est appliqué explicitement sur la coque de l'application avec `dabo-light` / `dabo-dark`, à partir de la préférence enregistrée du membre.
