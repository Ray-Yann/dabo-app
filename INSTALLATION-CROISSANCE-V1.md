# DABO — Croissance V1

## Installation
Copier le contenu de ce dossier à la racine du projet `dabo-app` en conservant l'arborescence et en acceptant le remplacement des 2 fichiers existants.

Fichiers remplacés :
- `app/admin/page.tsx`
- `app/api/admin/dashboard/route.ts`

## Aucun SQL / aucune variable Vercel
Cette étape utilise uniquement les données déjà présentes dans Supabase Auth et les tables DABO existantes.

## Ce que Croissance V1 ajoute
- onglet `Croissance` dans le cockpit administrateur ;
- comptes et foyers cumulés ;
- nouveaux comptes : 7 j vs 7 j précédents et 30 j vs 30 j précédents ;
- nouveaux foyers : mêmes fenêtres comparables ;
- foyers actifs 7 j / 30 j comme contexte d'usage ;
- aucune variation en % lorsque la période précédente vaut 0 : affichage `Données insuffisantes` à la place.

## Validation locale
Dans PowerShell, à la racine de `dabo-app` :

```powershell
npm run verify
```

Ne pousser sur GitHub qu'après PASS complet.
