# DABO — Admin Dashboard Resilience V1

## Objectif
Empêcher une source Supabase/Auth temporairement lente (`Gateway Timeout`) de faire tomber tout le cockpit administrateur.

## Installation
Copier le contenu du ZIP à la racine de `dabo-app` en remplaçant les fichiers existants.

Aucune migration Supabase.
Aucune nouvelle variable d'environnement.
Aucune nouvelle traduction.

Puis lancer :

```powershell
npm run verify
```

## Comportement attendu
- Le cockpit reste accessible si une source échoue.
- Un bandeau `Données partielles` indique la ou les sources indisponibles.
- Vercel journalise précisément la source (`households`, `members`, `tasks`, `shopping`, `calendar`, `contributions`, `authUsers`).
- LOBA évite certains constats dépendant d'une source absente.
