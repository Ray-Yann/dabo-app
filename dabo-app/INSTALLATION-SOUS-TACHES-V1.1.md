# DABO — Sous-tâches V1.1

Correction ciblée du commit des champs NativeNameInput au blur.

Le texte reste local pendant la frappe (préserve les performances iOS/iPadOS), mais la valeur finale est maintenant transmise synchroniquement au parent avant que le clic Ajouter/Enregistrer soit traité.

Copier `components/` et `tests/` à la racine de `dabo-app` en acceptant le remplacement, puis lancer `npm run verify`.
