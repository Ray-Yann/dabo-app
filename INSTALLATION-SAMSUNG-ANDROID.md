# Correctif DABO — Samsung / Android — thème clair

Ce correctif empêche le navigateur Android/Samsung d'imposer son propre assombrissement lorsque le mode sombre DABO est désactivé.

## Installation
Copier le contenu de ce dossier à la racine de `dabo-app` et accepter le remplacement des fichiers existants.

Fichiers remplacés :
- `app/globals.css`
- `app/layout.tsx`
- `app/app/layout.tsx`

Aucune migration Supabase et aucune variable Vercel supplémentaire.

## Validation
1. `npm run verify`
2. Commit + push uniquement si PASS.
3. Après Vercel Ready, tester sur Samsung : Mode sombre OFF = thème clair DABO ; Mode sombre ON = thème sombre DABO.
4. Vérifier aussi iPhone/ordinateur pour la non-régression.
