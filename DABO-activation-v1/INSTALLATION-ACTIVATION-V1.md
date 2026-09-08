# DABO — Activation V1

## Installation
Copier le contenu de ce ZIP à la racine du projet `dabo-app` et accepter le remplacement des 2 fichiers.

Aucune migration SQL. Aucune variable Vercel. Aucun secret.

Puis lancer :

```powershell
npm run verify
```

Si tout est PASS, commit/push avec GitHub Desktop puis attendre Vercel Ready.

## Validation production
Dans `/admin`, un nouvel onglet **Activation** doit apparaître entre Vue d’ensemble et Utilisateurs.

Il distingue :
- comptes créés ;
- comptes avec foyer ;
- comptes sans foyer ;
- foyers collaboratifs (au moins 2 membres) ;
- foyers ayant déjà eu un usage ;
- première valeur instrumentée ;
- foyers actifs sur 30 jours.

La métrique « première valeur instrumentée » ne prétend pas reconstruire l’historique : elle compte uniquement les événements `first_value` enregistrés depuis l’activation du tracking.
