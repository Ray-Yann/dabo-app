# DABO — Correctif tests Internationalisation V2.1

Ce correctif ne touche ni aux catalogues traduits ni à Supabase.

Il actualise uniquement deux tests devenus obsolètes après l'activation réelle
de DE/ES/IT/PT et le passage du catalogue source à 560 entrées.

## Utilisation
Copier le ZIP à la racine de `dabo-app`, puis :

```powershell
node .\scripts\fix-internationalisation-v2-1-tests.mjs
npm run verify
```
