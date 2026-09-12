# DABO — Courses V3 — Correctif TypeScript

## Problème corrigé
Le test `tests/courses-nearby-stores-v3.test.ts` importait :

`../lib/nearby-stores.ts`

Avec la configuration TypeScript actuelle de DABO (`moduleResolution: bundler` sans `allowImportingTsExtensions`), cela provoquait l'erreur TS5097 pendant `npm run typecheck`.

## Correction
L'import est désormais :

`../lib/nearby-stores`

Le chargeur de tests DABO sait déjà résoudre automatiquement le fichier TypeScript correspondant.

## Installation
Copier le contenu de ce correctif à la racine du projet DABO et accepter le remplacement du fichier de test.

Aucune migration Supabase.
Aucun changement de logique métier.
Aucune modification i18n.

Puis exécuter :

```powershell
npm run verify
```

Résultat attendu :
- 247/247 tests
- 634 clés × 7 langues
- TypeScript PASS
- Build production PASS
