# DABO — Internationalisation V2.1 — Correctif final après `lang is not defined`

Ce patch fait deux choses :

1. Il restaure les fichiers que la tentative précédente a pu modifier partiellement,
   à partir du ZIP PROPRE officiel `dabo-app-PROPRE-20260910-154618.zip`.
2. Il corrige le bug `lang is not defined` dans le générateur et rend l'application
   des modifications atomique : les fichiers DABO ne sont écrits qu'après réussite
   de toutes les transformations.

## Installation

Copier tout le contenu du ZIP à la racine de `dabo-app` et accepter les remplacements.

Puis, dans la même fenêtre PowerShell contenant `DEEPL_API_KEY` :

```powershell
node .\scripts\generate-i18n-europe.mjs
```

Ne lancez pas Supabase, GitHub ou Vercel avant le résultat final complet.
