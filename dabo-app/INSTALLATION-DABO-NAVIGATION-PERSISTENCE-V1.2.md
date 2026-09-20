# DABO — Navigation Persistence V1.2

## Objectif
Finaliser la correction de persistance de la navigation avec la cause racine confirmée en production.

## Ce lot ajoute
- une migration idempotente qui accorde `SELECT`, `INSERT` et `UPDATE` à `authenticated` sur `user_navigation_preferences` ;
- le retrait des privilèges client inutiles `TRUNCATE`, `TRIGGER` et `REFERENCES` ;
- une confirmation réelle de l'`upsert` avec relecture de `pinned_tabs` ;
- un message d'erreur visible si Supabase refuse la sauvegarde ;
- l'impossibilité de fermer silencieusement la personnalisation pendant/à la suite d'un échec ;
- des tests de non-régression dédiés.

## Supabase
La correction SQL a déjà été exécutée manuellement en production. Conserver tout de même la migration dans le dépôt pour rendre le schéma reproductible.

## Validation
```powershell
npm run verify
```

Puis créer le ZIP propre uniquement après Vercel Ready + test production de persistance.
