# DABO — Correctif régression Admin

Ce correctif remplace uniquement :
- `app/api/admin/dashboard/route.ts`

Il fait deux choses :
1. Isole le KPI « Faire connaître DABO » afin qu'une erreur de lecture de `app_share_events` ne fasse plus tomber tout le cockpit administrateur.
2. Fait remonter dans l'onglet Utilisateurs tous les comptes Supabase Auth, y compris ceux qui n'appartiennent encore à aucun foyer.

Aucune migration SQL supplémentaire.
Aucune variable Vercel supplémentaire.

## Installation
Copier le contenu du ZIP à la racine de `dabo-app` et accepter le remplacement du fichier.
Puis lancer :

```powershell
npm run verify
```
