# DABO — Internationalisation V2.1 — Correctif segmentation

Ce correctif remplace uniquement `scripts/generate-i18n-europe.mjs`.

## Ce qui change
Les fragments sensibles (`DABO`, `LOBA`, `{placeholders}`, URLs et e-mails) ne sont plus envoyés à DeepL.
Le script découpe chaque chaîne, traduit uniquement les fragments ordinaires, puis réassemble la phrase avec les fragments sensibles originaux.

## Installation
1. Copier le contenu du ZIP à la racine de `dabo-app`.
2. Accepter le remplacement de `scripts/generate-i18n-europe.mjs`.
3. Garder ouverte la fenêtre PowerShell qui contient `DEEPL_API_KEY`.
4. Lancer :

```powershell
node .\scripts\generate-i18n-europe.mjs
```

Ne lancez pas Supabase, GitHub ou Vercel avant validation complète des quatre catalogues.
