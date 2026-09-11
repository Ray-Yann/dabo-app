# DABO — Beta Readiness V1

Base : `dabo-app-PROPRE-20260911-021943.zip`

## Ce patch fait quoi ?

- ajoute un écran de récupération DABO lorsqu'une erreur React survient dans l'application ;
- ajoute un dernier filet de sécurité si l'erreur touche le layout racine ;
- permet à l'utilisateur de réessayer sans rester bloqué sur un écran technique ;
- ajoute 5 tests de non-régression sur les garde-fous critiques de la bêta : erreurs, identité serveur, départ du créateur, onboarding sécurisé et cron protégé.

Aucune migration Supabase. Aucun changement de schéma. Aucune API payante.

## Installation

Copier les fichiers du patch dans la racine de `dabo-app` et accepter le remplacement/ajout.

Puis :

```powershell
npm run verify
```

Résultat attendu : 160 tests, i18n 587 clés dans les 7 langues, TypeScript PASS et build 28/28.

Ne pas pousser sur GitHub/Vercel avant un verify entièrement vert.
