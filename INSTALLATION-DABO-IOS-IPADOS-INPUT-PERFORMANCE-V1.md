# DABO — iOS/iPadOS Input Performance V1

Patch minimal à copier-coller à la racine de `dabo-app`.

## Ce que corrige V1
- La frappe dans le nom d'une tâche ou d'un article est peinte immédiatement dans un état local léger.
- Le rendu plus lourd de la page parente est envoyé dans une transition React.
- Le calcul des suggestions intelligentes travaille sur une valeur différée.
- Les recherches d'historique Tâches et Courses utilisent aussi une valeur différée.

## Pourquoi
Les pages Tâches et Courses peuvent contenir beaucoup de lignes et de logique. Avant ce patch, chaque caractère modifiait directement l'état de toute la page et recalculait immédiatement les suggestions / filtres. Safari iOS/iPadOS peut alors afficher les caractères avec retard.

## Installation
Copier les dossiers `app`, `components` et `tests` dans `dabo-app` et accepter le remplacement des fichiers.

Ensuite lancer :
`npm run verify`

Aucune migration Supabase.
Aucune nouvelle dépendance.
