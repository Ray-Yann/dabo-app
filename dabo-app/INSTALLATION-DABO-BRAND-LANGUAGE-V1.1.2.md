# DABO Brand Language V1.1.2 — correctif TypeScript

Correctif ciblé du test `tests/brand-language-v1-1.test.ts`.

## Pourquoi
Le flag RegExp `/s` déclenche TS1501 avec la cible TypeScript actuelle du projet. La vérification est conservée à l'identique en utilisant `[\s\S]*?`, compatible avec la configuration existante.

## Installation
Copier le dossier `tests` à la racine du projet `dabo-app` et accepter le remplacement du fichier existant.

Puis lancer :

```powershell
npm run verify
```

Cible :
- 194/194 tests
- 606 clés × 7 langues
- TypeScript PASS
- Build PASS

Aucune migration Supabase. Aucun changement visuel ou métier.
