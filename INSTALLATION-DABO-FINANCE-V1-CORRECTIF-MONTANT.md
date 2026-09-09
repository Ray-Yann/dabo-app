# DABO Finance V1 — Correctif montant

Ce correctif remplace uniquement :

`app/app/equilibre/budget/page.tsx`

Il permet de saisir un montant sans symbole monétaire (`25`, `25,50`, `25.50`) et tolère aussi un montant déjà formaté avec `€` ou `EUR`. Au départ du champ, DABO reformate automatiquement la valeur en euros.

## Installation
1. Décompresser le ZIP.
2. Copier le dossier `app` à la racine du projet `dabo-app` et accepter le remplacement du fichier.
3. Lancer `npm run verify`.
4. Ne lancer aucune migration Supabase : ce correctif ne modifie pas la base de données.
